import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components, internal } from "./_generated/api";
import { requireAdmin, requireOperator, uniqueLookupId } from "./accounts";
import schema from "./schema";
import { createAuthenticatedActor } from "./test.helpers";
import { modules } from "./test.setup";

function backend() {
	const t = convexTest(schema, modules);
	betterAuthTest.register(t);
	return t;
}

async function actors() {
	const t = backend();
	const admin = await createAuthenticatedActor(t, {
		email: "admin@example.com",
		phoneNumber: "+12025550101",
		phoneNumberVerified: true,
	});
	const user = await createAuthenticatedActor(t, {
		email: "user@example.com",
		phoneNumber: "+12025550102",
		phoneNumberVerified: true,
	});
	await t.mutation(internal.accounts.bootstrapAdmin, {
		authUserId: admin.userId,
		phoneNumber: "+12025550101",
	});
	const change = (role: "admin" | "operator" | "user") =>
		admin.client.mutation(api.accounts.changeRole, {
			phoneNumber: "+12025550102",
			expectedAuthUserId: user.userId,
			role,
		});
	return { t, admin, user, change };
}

async function rows(t: ReturnType<typeof backend>) {
	return await t.run(
		async (ctx) => await ctx.db.query("accountRoles").take(100),
	);
}

describe("component lookup boundary", () => {
	test("only an unambiguous complete page yields an identity", () => {
		expect(uniqueLookupId({ page: [{ _id: "fixture" }], isDone: true })).toBe(
			"fixture",
		);
		for (const page of [
			{ page: [], isDone: true },
			{ page: [{ _id: "first" }, { _id: "second" }], isDone: true },
			{ page: [{ _id: "first" }], isDone: false },
		])
			expect(uniqueLookupId(page)).toBeNull();
	});
	test("unexpected adapter result shapes fail closed", () => {
		for (const page of [
			null,
			{},
			{ page: [], isDone: "yes" },
			{ page: [{}], isDone: true },
		]) {
			expect(() => uniqueLookupId(page)).toThrow(
				"Invalid account lookup response.",
			);
		}
	});
});

describe("account access", () => {
	test("public signup defaults to user and does not bootstrap an administrator", async () => {
		const t = backend();
		const user = await createAuthenticatedActor(t);
		expect(await user.client.query(api.accounts.currentAccess, {})).toEqual({
			role: "user",
		});
		expect(await rows(t)).toEqual([]);
	});

	test("signed-out reads are safe and writes require persisted authentication", async () => {
		const { t, user } = await actors();
		expect(await t.query(api.accounts.currentAccess, {})).toBeNull();
		expect(
			await t.query(api.accounts.lookup, { phoneNumber: "+12025550102" }),
		).toEqual({ status: "signed-out" });
		const before = await rows(t);
		await expect(
			t.mutation(api.accounts.changeRole, {
				phoneNumber: "+12025550102",
				expectedAuthUserId: user.userId,
				role: "admin",
			}),
		).rejects.toThrow("Unauthenticated");
		expect(await rows(t)).toEqual(before);
	});

	test("JWT role claims do not grant access; missing or expired sessions are rejected", async () => {
		const { t, user } = await actors();
		const forged = t.withIdentity({
			subject: user.userId,
			sessionId: user.sessionId,
			role: "admin",
		});
		expect(await forged.query(api.accounts.currentAccess, {})).toEqual({
			role: "user",
		});
		await expect(forged.run(requireAdmin)).rejects.toThrow(
			"Administrator access is required",
		);
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "session",
				where: [{ field: "_id", value: user.sessionId }],
				update: { expiresAt: 1 },
			},
		});
		expect(await user.client.query(api.accounts.currentAccess, {})).toBeNull();
		await expect(user.client.run(requireOperator)).rejects.toThrow(
			"Unauthenticated",
		);
	});

	test("users and operators cannot enumerate targets or change any roles; state unchanged", async () => {
		const { t, user, change } = await actors();
		for (const role of ["user", "operator"] as const) {
			await change(role);
			const before = await rows(t);
			for (const phoneNumber of ["+12025550101", "+12025550199", "invalid"]) {
				expect(
					await user.client.query(api.accounts.lookup, { phoneNumber }),
				).toEqual({ status: "forbidden" });
			}
			await expect(
				user.client.mutation(api.accounts.changeRole, {
					phoneNumber: "+12025550101",
					expectedAuthUserId: "anything",
					role: "admin",
				}),
			).rejects.toThrow("Administrator access is required");
			expect(await rows(t)).toEqual(before);
		}
	});

	test("exact verified-phone lookup reveals only identity, verified phone and role", async () => {
		const { admin, user } = await actors();
		expect(
			await admin.client.query(api.accounts.lookup, {
				phoneNumber: " +12025550102 ",
			}),
		).toEqual({
			status: "found",
			account: {
				authUserId: user.userId,
				phoneNumber: "+12025550102",
				role: "user",
			},
		});
		for (const phoneNumber of ["+120", "2025550102", "+12025550102*"]) {
			expect(
				await admin.client.query(api.accounts.lookup, { phoneNumber }),
			).toEqual({ status: "invalid" });
		}
		expect(
			await admin.client.query(api.accounts.lookup, {
				phoneNumber: "+12025550199",
			}),
		).toEqual({ status: "not-found" });
	});

	test("unverified, changed or missing targets cannot be promoted; denial leaves state unchanged", async () => {
		const { t, admin, user, change } = await actors();
		const before = await rows(t);
		await expect(
			admin.client.mutation(api.accounts.changeRole, {
				phoneNumber: "+12025550102",
				expectedAuthUserId: admin.userId,
				role: "admin",
			}),
		).rejects.toThrow("Look up the verified phone number again");
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: user.userId }],
				update: { phoneNumberVerified: false },
			},
		});
		expect(
			await admin.client.query(api.accounts.lookup, {
				phoneNumber: "+12025550102",
			}),
		).toEqual({ status: "not-found" });
		await expect(change("operator")).rejects.toThrow(
			"Look up the verified phone number again",
		);
		expect(await rows(t)).toEqual(before);
	});

	test("phone reassignment cannot silently change the looked-up identity; missing targets are denied", async () => {
		const { t, admin, user, change } = await actors();
		const before = await rows(t);
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: user.userId }],
				update: { phoneNumber: "+12025550104" },
			},
		});
		await expect(change("admin")).rejects.toThrow(
			"Look up the verified phone number again",
		);
		const replacement = await createAuthenticatedActor(t, {
			email: "replacement@example.com",
			phoneNumber: "+12025550102",
			phoneNumberVerified: true,
		});
		await expect(change("admin")).rejects.toThrow(
			"Look up the verified phone number again",
		);
		expect(await rows(t)).toEqual(before);
		expect(
			await admin.client.query(api.accounts.lookup, {
				phoneNumber: "+12025550102",
			}),
		).toMatchObject({
			status: "found",
			account: { authUserId: replacement.userId, role: "user" },
		});
	});

	test("missing sessions and deleted component identities cannot use persisted privilege", async () => {
		const { t, user, change } = await actors();
		await change("admin");
		const noSession = t.withIdentity({
			subject: user.userId,
			sessionId: "missing-session",
		});
		expect(await noSession.query(api.accounts.currentAccess, {})).toBeNull();
		await expect(noSession.run(requireAdmin)).rejects.toThrow(
			"Unauthenticated",
		);
		await t.mutation(components.betterAuth.adapter.deleteOne, {
			input: { model: "user", where: [{ field: "_id", value: user.userId }] },
		});
		expect(await user.client.query(api.accounts.currentAccess, {})).toBeNull();
		await expect(user.client.run(requireAdmin)).rejects.toThrow(
			"Unauthenticated",
		);
	});

	test("grant and revoke apply through the same existing session; shared guards enforce hierarchy", async () => {
		const { user, change } = await actors();
		await expect(user.client.run(requireOperator)).rejects.toThrow(
			"Operator access is required",
		);
		await change("operator");
		expect(await user.client.query(api.accounts.currentAccess, {})).toEqual({
			role: "operator",
		});
		expect((await user.client.run(requireOperator)).role).toBe("operator");
		await expect(user.client.run(requireAdmin)).rejects.toThrow(
			"Administrator access is required",
		);
		await change("admin");
		expect((await user.client.run(requireOperator)).role).toBe("admin");
		expect((await user.client.run(requireAdmin)).role).toBe("admin");
		await change("user");
		expect(await user.client.query(api.accounts.currentAccess, {})).toEqual({
			role: "user",
		});
		expect(
			await user.client.query(api.accounts.lookup, {
				phoneNumber: "+12025550101",
			}),
		).toEqual({ status: "forbidden" });
		await expect(user.client.run(requireOperator)).rejects.toThrow(
			"Operator access is required",
		);
	});

	test("losing phone verification removes privileged access without deleting the session", async () => {
		const { t, user, change } = await actors();
		await change("operator");
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: user.userId }],
				update: { phoneNumberVerified: false },
			},
		});
		expect(await user.client.query(api.accounts.currentAccess, {})).toEqual({
			role: "user",
		});
		await expect(user.client.run(requireOperator)).rejects.toThrow(
			"Operator access is required",
		);
		await expect(
			user.client.mutation(api.todos.add, { text: "Own access remains" }),
		).resolves.toBeTruthy();
	});
});

describe("last administrator and bootstrap", () => {
	test("sole admin self-demotion is rejected with unchanged state", async () => {
		const { t, admin } = await actors();
		const before = await rows(t);
		for (const role of ["user", "operator"] as const) {
			await expect(
				admin.client.mutation(api.accounts.changeRole, {
					phoneNumber: "+12025550101",
					expectedAuthUserId: admin.userId,
					role,
				}),
			).rejects.toThrow("Another verified administrator must remain");
			expect(await rows(t)).toEqual(before);
		}
	});

	test("orphan and unverified assignments are not witnesses for self-demotion", async () => {
		const { t, admin, user, change } = await actors();
		await change("admin");
		const orphan = await createAuthenticatedActor(t, {
			email: "orphan@example.com",
			phoneNumber: "+12025550105",
			phoneNumberVerified: true,
		});
		await admin.client.mutation(api.accounts.changeRole, {
			phoneNumber: "+12025550105",
			expectedAuthUserId: orphan.userId,
			role: "admin",
		});
		await t.mutation(components.betterAuth.adapter.deleteOne, {
			input: { model: "user", where: [{ field: "_id", value: orphan.userId }] },
		});
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: user.userId }],
				update: { phoneNumberVerified: false },
			},
		});
		const before = await rows(t);
		await expect(
			admin.client.mutation(api.accounts.changeRole, {
				phoneNumber: "+12025550101",
				expectedAuthUserId: admin.userId,
				role: "user",
			}),
		).rejects.toThrow("Another verified administrator must remain");
		expect(await rows(t)).toEqual(before);
	});

	test("competing self-demotions preserve one admin (serialised fixture transactions)", async () => {
		const { t, admin, user, change } = await actors();
		await change("admin");
		const results = await Promise.allSettled([
			admin.client.mutation(api.accounts.changeRole, {
				phoneNumber: "+12025550101",
				expectedAuthUserId: admin.userId,
				role: "user",
			}),
			user.client.mutation(api.accounts.changeRole, {
				phoneNumber: "+12025550102",
				expectedAuthUserId: user.userId,
				role: "user",
			}),
		]);
		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
		expect((await rows(t)).filter((r) => r.role === "admin")).toHaveLength(1);
	});

	test("competing attempts to demote each other cannot remove both administrators", async () => {
		const { t, admin, user, change } = await actors();
		await change("admin");
		const results = await Promise.allSettled([
			change("user"),
			user.client.mutation(api.accounts.changeRole, {
				phoneNumber: "+12025550101",
				expectedAuthUserId: admin.userId,
				role: "user",
			}),
		]);
		expect(
			results.filter((result) => result.status === "fulfilled"),
		).toHaveLength(1);
		expect((await rows(t)).filter((row) => row.role === "admin")).toHaveLength(
			1,
		);
	});

	test("concurrent initial bootstraps create only one initial administrator", async () => {
		const t = backend();
		const first = await createAuthenticatedActor(t, {
			email: "first@example.com",
			phoneNumber: "+12025550106",
			phoneNumberVerified: true,
		});
		const second = await createAuthenticatedActor(t, {
			email: "second@example.com",
			phoneNumber: "+12025550107",
			phoneNumberVerified: true,
		});
		const results = await Promise.allSettled([
			t.mutation(internal.accounts.bootstrapAdmin, {
				authUserId: first.userId,
				phoneNumber: "+12025550106",
			}),
			t.mutation(internal.accounts.bootstrapAdmin, {
				authUserId: second.userId,
				phoneNumber: "+12025550107",
			}),
		]);
		expect(
			results.filter((result) => result.status === "fulfilled"),
		).toHaveLength(1);
		expect((await rows(t)).filter((row) => row.role === "admin")).toHaveLength(
			1,
		);
	});

	test("initial bootstrap requires the explicit matching verified identity and refuses re-execution", async () => {
		const t = backend();
		const actor = await createAuthenticatedActor(t, {
			phoneNumber: "+12025550103",
			phoneNumberVerified: false,
		});
		const args = { authUserId: actor.userId, phoneNumber: "+12025550103" };
		await expect(
			t.mutation(internal.accounts.bootstrapAdmin, args),
		).rejects.toThrow("Verify the intended account");
		expect(await rows(t)).toEqual([]);
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: actor.userId }],
				update: { phoneNumberVerified: true },
			},
		});
		await expect(
			t.mutation(internal.accounts.bootstrapAdmin, {
				...args,
				authUserId: "wrong",
			}),
		).rejects.toThrow("Verify the intended account");
		await t.mutation(internal.accounts.bootstrapAdmin, args);
		await expect(
			t.mutation(internal.accounts.bootstrapAdmin, args),
		).rejects.toThrow("already been completed");
		expect((await rows(t)).filter((r) => r.role === "admin")).toHaveLength(1);
	});

	test("privileged roles do not bypass donor/todo ownership and denied writes do not change data", async () => {
		const { t, admin, user, change } = await actors();
		const id = await admin.client.mutation(api.todos.add, {
			text: "Private to owner",
		});
		for (const role of ["operator", "admin"] as const) {
			await change(role);
			expect(await user.client.query(api.todos.list, {})).toEqual([]);
			const before = await t.run(async (ctx) => await ctx.db.get("todos", id));
			await expect(
				user.client.mutation(api.todos.setCompleted, { id, completed: true }),
			).rejects.toThrow("Todo not found");
			await expect(
				user.client.mutation(api.todos.setPriority, { id, priority: "high" }),
			).rejects.toThrow("Todo not found");
			await expect(
				user.client.mutation(api.todos.remove, { id }),
			).rejects.toThrow("Todo not found");
			expect(await t.run(async (ctx) => await ctx.db.get("todos", id))).toEqual(
				before,
			);
		}
	});
});
