import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import {
	internalMutation,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { authComponent } from "./auth";
import schema from "./schema";
import type { AccountRole } from "./schema/account_validators";

export const accountRoleResourceValidator =
	schema.tables.accountRoles.validator;

function fail(code: string, message: string): never {
	throw new ConvexError({ code, message });
}

async function assignment(ctx: QueryCtx, authUserId: string) {
	return await ctx.db
		.query("accountRoles")
		.withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
		.unique();
}

function hasVerifiedPhone(user: {
	phoneNumber?: string | null;
	phoneNumberVerified?: boolean | null;
}) {
	return Boolean(user.phoneNumber && user.phoneNumberVerified === true);
}

/** Never use a client/JWT role or a cached session role as authority. */
export async function currentAccount(ctx: QueryCtx) {
	const user = await authComponent.getAuthUser(ctx);
	const stored = await assignment(ctx, user._id);
	const role: AccountRole = hasVerifiedPhone(user)
		? (stored?.role ?? "user")
		: "user";
	return { user, role };
}

export async function requireAdmin(ctx: QueryCtx) {
	const actor = await currentAccount(ctx);
	if (actor.role !== "admin")
		fail("ACCOUNT_FORBIDDEN", "Administrator access is required.");
	return actor;
}

export async function requireOperator(ctx: QueryCtx) {
	const actor = await currentAccount(ctx);
	if (actor.role === "user")
		fail("ACCOUNT_FORBIDDEN", "Operator access is required.");
	return actor;
}

export const currentAccess = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return null;
		const actor = await currentAccount(ctx);
		return { role: actor.role };
	},
});

function exactPhone(value: string) {
	const phone = value.trim();
	return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

/** Narrow the untyped component page; ambiguous/incomplete results are not identities. */
export function uniqueLookupId(result: unknown) {
	if (
		typeof result !== "object" ||
		result === null ||
		!("page" in result) ||
		!Array.isArray(result.page) ||
		!("isDone" in result) ||
		typeof result.isDone !== "boolean"
	) {
		throw new Error("Invalid account lookup response.");
	}
	// Ambiguous matches and incomplete pages are never treated as an identified account.
	if (!result.isDone || result.page.length !== 1) return null;
	const candidate: unknown = result.page[0];
	if (
		typeof candidate !== "object" ||
		candidate === null ||
		!("_id" in candidate) ||
		typeof candidate._id !== "string"
	)
		throw new Error("Invalid account lookup response.");
	return candidate._id;
}

async function verifiedTarget(ctx: QueryCtx, phoneNumber: string) {
	const result: unknown = await ctx.runQuery(
		components.betterAuth.adapter.findMany,
		{
			model: "user",
			where: [{ field: "phoneNumber", value: phoneNumber }],
			paginationOpts: { cursor: null, numItems: 2 },
		},
	);
	const id = uniqueLookupId(result);
	if (!id) return null;
	const user = await authComponent.getAnyUserById(ctx, id);
	return user && user.phoneNumber === phoneNumber && hasVerifiedPhone(user)
		? user
		: null;
}

export const lookup = query({
	args: { phoneNumber: v.string() },
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return { status: "signed-out" } as const;
		const actor = await currentAccount(ctx);
		if (actor.role !== "admin") return { status: "forbidden" } as const;
		const phone = exactPhone(args.phoneNumber);
		if (!phone) return { status: "invalid" } as const;
		const target = await verifiedTarget(ctx, phone);
		if (!target) return { status: "not-found" } as const;
		return {
			status: "found",
			account: {
				authUserId: String(target._id),
				phoneNumber: phone,
				role: (await assignment(ctx, target._id))?.role ?? "user",
			},
		} as const;
	},
});

export const changeRole = mutation({
	args: accountRoleResourceValidator.pick("role").extend({
		phoneNumber: v.string(),
		expectedAuthUserId: v.string(),
	}),
	handler: async (ctx, args) => {
		const actor = await requireAdmin(ctx);
		const phone = exactPhone(args.phoneNumber);
		const target = phone ? await verifiedTarget(ctx, phone) : null;
		if (!target || target._id !== args.expectedAuthUserId) {
			fail(
				"ACCOUNT_TARGET_CHANGED",
				"Account unavailable. Look up the verified phone number again.",
			);
		}
		const stored = await assignment(ctx, target._id);
		if (
			stored?.role === "admin" &&
			args.role !== "admin" &&
			actor.user._id === target._id
		) {
			// A bounded proof, not an unbounded count. A stale assignment is not a live administrator.
			const candidates = await ctx.db
				.query("accountRoles")
				.withIndex("by_role", (q) => q.eq("role", "admin"))
				.take(16);
			let witness = false;
			for (const candidate of candidates) {
				if (candidate.authUserId === target._id) continue;
				const user = await authComponent.getAnyUserById(
					ctx,
					candidate.authUserId,
				);
				if (user && hasVerifiedPhone(user)) {
					witness = true;
					break;
				}
			}
			if (!witness)
				fail(
					"ACCOUNT_LAST_ADMIN",
					"Another verified administrator must remain before removing your administrator role.",
				);
		}
		if (stored)
			await ctx.db.patch("accountRoles", stored._id, { role: args.role });
		else
			await ctx.db.insert("accountRoles", {
				authUserId: target._id,
				role: args.role,
			});
		return null;
	},
});

/** SEA-58 owns the separate named-account/identity/development-target execution approval.
 * Never call on signup. Internal tooling access is not approval to execute this procedure.
 */
export const bootstrapAdmin = internalMutation({
	args: accountRoleResourceValidator
		.pick("authUserId")
		.extend({ phoneNumber: v.string() }),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("accountRoles")
			.withIndex("by_role", (q) => q.eq("role", "admin"))
			.first();
		if (existing)
			fail(
				"ACCOUNT_BOOTSTRAPPED",
				"Initial administrator setup has already been completed.",
			);
		const phone = exactPhone(args.phoneNumber);
		const target = phone ? await verifiedTarget(ctx, phone) : null;
		if (!target || target._id !== args.authUserId) {
			fail(
				"ACCOUNT_TARGET_CHANGED",
				"Account unavailable. Verify the intended account before setup.",
			);
		}
		const stored = await assignment(ctx, target._id);
		if (stored)
			await ctx.db.patch("accountRoles", stored._id, { role: "admin" });
		else
			await ctx.db.insert("accountRoles", {
				authUserId: target._id,
				role: "admin",
			});
		return null;
	},
});
