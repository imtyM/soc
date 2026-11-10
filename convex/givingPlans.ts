import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { authComponent } from "./auth";
import schema from "./schema";
import { apportion, planProblem } from "./schema/giving_plan_math";

export const planValidator = schema.tables.givingPlans.validator;
export const shareValidator = schema.tables.givingPlanShares.validator;
// Convex's native maximum array length, not a product/recipient catalogue cap.
// Each saved mix is submitted/returned as one native array; children live in their own table.
const NATIVE_ARRAY_LENGTH = 8192;
function fail(code: string, message: string): never {
	throw new ConvexError({ code, message });
}
async function owner(ctx: QueryCtx) {
	const user = await authComponent.safeGetAuthUser(ctx);
	if (!user || !user.phoneNumber || user.phoneNumberVerified !== true)
		fail(
			"PLAN_VERIFY",
			"Verify your phone number before accessing a saved plan.",
		);
	return String(user._id);
}
async function current(ctx: QueryCtx, authUserId: string) {
	return await ctx.db
		.query("givingPlans")
		.withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
		.unique();
}
async function selections(ctx: QueryCtx, planId: Id<"givingPlans">) {
	return await ctx.db
		.query("givingPlanShares")
		.withIndex("by_planId_and_organisationId", (q) => q.eq("planId", planId))
		.take(NATIVE_ARRAY_LENGTH);
}
export const mine = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user || !user.phoneNumber || user.phoneNumberVerified !== true)
			return { status: "verification-required" as const, plan: null };
		const plan = await current(ctx, String(user._id));
		if (!plan) return { status: "verified" as const, plan: null };
		const shares = await selections(ctx, plan._id);
		const allocations = apportion(
			plan.monthlyAmountMinor,
			shares.map((s) => s.units),
			shares.map((s) => s.organisationId),
		);
		if (!allocations) throw new Error("Invalid stored giving plan.");
		return {
			status: "verified" as const,
			plan: {
				version: plan.version,
				monthlyAmountMinor: plan.monthlyAmountMinor,
				shares: await Promise.all(
					shares.map(async (s, i) => {
						const org = await ctx.db.get("organisations", s.organisationId);
						return {
							organisationId: s.organisationId,
							units: s.units,
							amountMinor: allocations[i],
							name: org?.isReady ? org.name : "Unavailable organisation",
							isSynthetic: org?.isReady ? org.isSynthetic : false,
							isReady: org?.isReady ?? false,
						};
					}),
				),
			},
		};
	},
});
export const save = mutation({
	args: planValidator.pick("monthlyAmountMinor").extend({
		shares: v.array(shareValidator.omit("planId")),
		expectedVersion: v.union(v.number(), v.null()),
	}),
	handler: async (ctx, args) => {
		const authUserId = await owner(ctx);
		if (args.shares.length > NATIVE_ARRAY_LENGTH)
			fail("PLAN_INVALID", "This mix exceeds the supported request size.");
		const problem = planProblem(args.monthlyAmountMinor, args.shares);
		if (problem) fail("PLAN_INVALID", problem);
		for (const share of args.shares) {
			const org = await ctx.db.get("organisations", share.organisationId);
			if (!org?.isReady)
				fail(
					"PLAN_UNAVAILABLE",
					"An organisation is no longer selectable. Review your mix before saving.",
				);
		}
		const plan = await current(ctx, authUserId);
		const old = plan ? await selections(ctx, plan._id) : [];
		const values = new Map(args.shares.map((s) => [s.organisationId, s.units]));
		// Repeated identical submissions are a no-op, including a repeated first save.
		if (
			plan &&
			plan.monthlyAmountMinor === args.monthlyAmountMinor &&
			old.length === values.size &&
			old.every((s) => values.get(s.organisationId) === s.units)
		)
			return { version: plan.version };
		if ((plan?.version ?? null) !== args.expectedVersion)
			fail(
				"PLAN_CHANGED",
				"Your saved plan changed. Reload it before saving these edits.",
			);
		const version = (plan?.version ?? 0) + 1;
		const planId =
			plan?._id ??
			(await ctx.db.insert("givingPlans", {
				authUserId,
				monthlyAmountMinor: args.monthlyAmountMinor,
				version,
			}));
		if (plan)
			await ctx.db.patch("givingPlans", planId, {
				monthlyAmountMinor: args.monthlyAmountMinor,
				version,
			});
		for (const row of old) {
			const units = values.get(row.organisationId);
			if (units === undefined) await ctx.db.delete("givingPlanShares", row._id);
			else {
				if (units !== row.units)
					await ctx.db.patch("givingPlanShares", row._id, { units });
				values.delete(row.organisationId);
			}
		}
		for (const [organisationId, units] of values)
			await ctx.db.insert("givingPlanShares", {
				planId,
				organisationId,
				units,
			});
		return { version };
	},
});
