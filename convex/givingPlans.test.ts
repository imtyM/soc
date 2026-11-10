import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components } from "./_generated/api";
import schema from "./schema";
import { createAuthenticatedActor } from "./test.helpers";
import { modules } from "./test.setup";

async function setup() {
	const t = convexTest(schema, modules);
	betterAuthTest.register(t);
	const a = await createAuthenticatedActor(t, {
		email: "plan.a@example.com",
		phoneNumber: "+12025550101",
		phoneNumberVerified: true,
	});
	const b = await createAuthenticatedActor(t, {
		email: "plan.b@example.com",
		phoneNumber: "+12025550102",
		phoneNumberVerified: true,
	});
	const ids = await t.run(async (ctx) =>
		Promise.all(
			["A", "B", "C"].map((name) =>
				ctx.db.insert("organisations", {
					name: `Synthetic ${name}`,
					description: "Synthetic fixture, not a real recipient.",
					isReady: true,
					isSynthetic: true,
					nameSort: name,
					searchText: name,
					version: 1,
				}),
			),
		),
	);
	const args = {
		monthlyAmountMinor: 10000,
		shares: ids.map((organisationId, i) => ({
			organisationId,
			units: [5000, 3000, 2000][i],
		})),
		expectedVersion: null,
	};
	return { t, a, b, ids, args };
}
describe("owned unfunded giving plans", () => {
	test("verified donor saves exact allocations, updates same plan, and duplicate submissions are no-ops", async () => {
		const { t, a, args } = await setup();
		expect(await a.client.mutation(api.givingPlans.save, args)).toEqual({
			version: 1,
		});
		expect(await a.client.mutation(api.givingPlans.save, args)).toEqual({
			version: 1,
		});
		const saved = await a.client.query(api.givingPlans.mine, {});
		expect(saved.status).toBe("verified");
		expect(saved.plan?.shares.map((s) => s.amountMinor).sort()).toEqual([
			2000, 3000, 5000,
		]);
		expect(saved.plan && Object.keys(saved.plan).sort()).toEqual([
			"monthlyAmountMinor",
			"shares",
			"version",
		]);
		await a.client.mutation(api.givingPlans.save, {
			...args,
			monthlyAmountMinor: 5000,
			expectedVersion: 1,
		});
		const changed = await a.client.query(api.givingPlans.mine, {});
		expect(changed.plan?.version).toBe(2);
		expect(changed.plan?.shares.reduce((n, s) => n + s.amountMinor, 0)).toBe(
			5000,
		);
		expect(
			await t.run((ctx) => ctx.db.query("givingPlans").take(10)),
		).toHaveLength(1);
	});
	test("all roles own only their own plan; client owner/plan IDs cannot be injected", async () => {
		const { t, a, b, args } = await setup();
		await a.client.mutation(api.givingPlans.save, args);
		await t.run((ctx) =>
			ctx.db.insert("accountRoles", { authUserId: b.userId, role: "admin" }),
		);
		expect((await b.client.query(api.givingPlans.mine, {})).plan).toBeNull();
		const injected = { ...args, authUserId: a.userId };
		await expect(
			b.client.mutation(api.givingPlans.save, injected),
		).rejects.toThrow();
		const read = { authUserId: a.userId };
		// @ts-expect-error Deliberately forge a prohibited owner argument: both typing and runtime must reject it.
		await expect(b.client.query(api.givingPlans.mine, read)).rejects.toThrow();
		await b.client.mutation(api.givingPlans.save, {
			...args,
			monthlyAmountMinor: 7000,
		});
		const operator = await createAuthenticatedActor(t, {
			phoneNumber: "+12025550104",
			phoneNumberVerified: true,
		});
		await t.run((ctx) =>
			ctx.db.insert("accountRoles", {
				authUserId: operator.userId,
				role: "operator",
			}),
		);
		expect(
			(await operator.client.query(api.givingPlans.mine, {})).plan,
		).toBeNull();
		await expect(
			operator.client.mutation(api.givingPlans.save, injected),
		).rejects.toThrow();
		await operator.client.mutation(api.givingPlans.save, {
			...args,
			monthlyAmountMinor: 8000,
		});
		expect(
			(await operator.client.query(api.givingPlans.mine, {})).plan
				?.monthlyAmountMinor,
		).toBe(8000);
		expect(
			(await a.client.query(api.givingPlans.mine, {})).plan?.monthlyAmountMinor,
		).toBe(10000);
	});
	test("guest/unverified/forged/missing/expired/deleted sessions never access an owned plan", async () => {
		const { t, a, b, args } = await setup();
		await a.client.mutation(api.givingPlans.save, args);
		const unverified = await createAuthenticatedActor(t, {
			phoneNumber: "+12025550103",
			phoneNumberVerified: false,
		});
		const forged = t.withIdentity({
			subject: a.userId,
			sessionId: "missing-session",
			role: "admin",
		});
		for (const actor of [t, unverified.client, forged]) {
			expect((await actor.query(api.givingPlans.mine, {})).status).toBe(
				"verification-required",
			);
			await expect(actor.mutation(api.givingPlans.save, args)).rejects.toThrow(
				"Verify your phone",
			);
		}
		// Prove this valid verified session works independently BEFORE expiring it.
		expect(
			(await a.client.query(api.givingPlans.mine, {})).plan,
		).not.toBeNull();
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "session",
				where: [{ field: "_id", value: a.sessionId }],
				update: { expiresAt: 1 },
			},
		});
		expect((await a.client.query(api.givingPlans.mine, {})).status).toBe(
			"verification-required",
		);
		await expect(a.client.mutation(api.givingPlans.save, args)).rejects.toThrow(
			"Verify your phone",
		);
		// A different valid session isolates deletion from the expiry case above.
		await b.client.mutation(api.givingPlans.save, args);
		expect(
			(await b.client.query(api.givingPlans.mine, {})).plan,
		).not.toBeNull();
		await t.mutation(components.betterAuth.adapter.deleteOne, {
			input: { model: "user", where: [{ field: "_id", value: b.userId }] },
		});
		expect((await b.client.query(api.givingPlans.mine, {})).status).toBe(
			"verification-required",
		);
		await expect(b.client.mutation(api.givingPlans.save, args)).rejects.toThrow(
			"Verify your phone",
		);
	});
	test("server rejects amounts, weights, duplicate/empty mixes and controlled field injection without writes", async () => {
		const { t, a, args, ids } = await setup();
		for (const monthlyAmountMinor of [
			4999,
			NaN,
			Infinity,
			-100,
			5000.5,
			Number.MAX_SAFE_INTEGER + 1,
		]) {
			await expect(
				a.client.mutation(api.givingPlans.save, {
					...args,
					monthlyAmountMinor,
				}),
			).rejects.toThrow();
		}
		for (const shares of [
			[],
			[{ organisationId: ids[0], units: 9999 }],
			[
				{ organisationId: ids[0], units: 5000 },
				{ organisationId: ids[0], units: 5000 },
			],
			[{ organisationId: ids[0], units: NaN }],
			[
				{ organisationId: ids[0], units: -1 },
				{ organisationId: ids[1], units: 10001 },
			],
		]) {
			await expect(
				a.client.mutation(api.givingPlans.save, { ...args, shares }),
			).rejects.toThrow();
		}
		const forged = { ...args, version: 999 };
		await expect(
			a.client.mutation(api.givingPlans.save, forged),
		).rejects.toThrow();
		expect(await t.run((ctx) => ctx.db.query("givingPlans").take(10))).toEqual(
			[],
		);
		expect(
			await t.run((ctx) => ctx.db.query("givingPlanShares").take(10)),
		).toEqual([]);
	});
	test("revalidates unknown/unready recipients; stale edits cannot overwrite or silently redistribute", async () => {
		const { t, a, args, ids } = await setup();
		await a.client.mutation(api.givingPlans.save, args);
		await a.client.mutation(api.givingPlans.save, {
			...args,
			monthlyAmountMinor: 10001,
			expectedVersion: 1,
		});
		await expect(
			a.client.mutation(api.givingPlans.save, {
				...args,
				monthlyAmountMinor: 11000,
				expectedVersion: 1,
			}),
		).rejects.toThrow("changed");
		await t.run((ctx) =>
			ctx.db.patch("organisations", ids[0], {
				isReady: false,
				name: "Private maintenance name",
			}),
		);
		await expect(
			a.client.mutation(api.givingPlans.save, { ...args, expectedVersion: 2 }),
		).rejects.toThrow("no longer selectable");
		const unavailable = (
			await a.client.query(api.givingPlans.mine, {})
		).plan?.shares.find((s) => s.organisationId === ids[0]);
		expect(unavailable?.name).toBe("Unavailable organisation");
		expect(unavailable?.isReady).toBe(false);
		await t.run((ctx) => ctx.db.delete("organisations", ids[0]));
		await expect(
			a.client.mutation(api.givingPlans.save, { ...args, expectedVersion: 2 }),
		).rejects.toThrow("no longer selectable");
		expect(
			(await a.client.query(api.givingPlans.mine, {})).plan?.monthlyAmountMinor,
		).toBe(10001);
	});
	test("selection edits replace only current children and preserve exact totals; repeated creates produce one current plan", async () => {
		const { t, a, args, ids } = await setup();
		await Promise.all([
			a.client.mutation(api.givingPlans.save, args),
			a.client.mutation(api.givingPlans.save, args),
		]);
		expect(
			await t.run((ctx) => ctx.db.query("givingPlans").take(10)),
		).toHaveLength(1);
		await a.client.mutation(api.givingPlans.save, {
			...args,
			expectedVersion: 1,
			shares: [{ organisationId: ids[1], units: 10000 }],
		});
		expect(
			(await a.client.query(api.givingPlans.mine, {})).plan?.shares,
		).toHaveLength(1);
		expect(
			await t.run((ctx) => ctx.db.query("givingPlanShares").take(10)),
		).toHaveLength(1);
	});
});
