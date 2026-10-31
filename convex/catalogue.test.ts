import betterAuthTest from "@convex-dev/better-auth/test";
import type { FunctionReturnType } from "convex/server";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { createAuthenticatedActor } from "./test.helpers";
import { modules } from "./test.setup";

const example = {
	name: "Example Orchard",
	description: "Synthetic food growing organisation.",
	isReady: true,
	isSynthetic: true,
};
const firstPage = { cursor: null, numItems: 20 };
async function setup() {
	const t = convexTest(schema, modules);
	betterAuthTest.register(t);
	const admin = await createAuthenticatedActor(t, {
		email: "catalogue.admin@example.com",
		phoneNumber: "+12025550101",
		phoneNumberVerified: true,
	});
	const operator = await createAuthenticatedActor(t, {
		email: "catalogue.operator@example.com",
		phoneNumber: "+12025550102",
		phoneNumberVerified: true,
	});
	await t.mutation(internal.accounts.bootstrapAdmin, {
		authUserId: admin.userId,
		phoneNumber: "+12025550101",
	});
	const change = (role: "user" | "operator") =>
		admin.client.mutation(api.accounts.changeRole, {
			phoneNumber: "+12025550102",
			expectedAuthUserId: operator.userId,
			role,
		});
	await change("operator");
	return { t, admin, operator, change };
}
async function stored(t: Awaited<ReturnType<typeof setup>>["t"]) {
	return t.run(async (ctx) => ctx.db.query("organisations").take(200));
}

describe("giving catalogue", () => {
	test("server-controlled fields and invalid updates cannot be injected", async () => {
		const { t, admin } = await setup();
		const injected = {
			...example,
			version: 999,
			nameSort: "forged",
			searchText: "forged",
		};
		await expect(
			admin.client.mutation(api.catalogue.create, injected),
		).rejects.toThrow();
		const id = await admin.client.mutation(api.catalogue.create, example);
		const before = await stored(t);
		await expect(
			admin.client.mutation(api.catalogue.update, {
				...example,
				description: " ",
				id,
				expectedVersion: 1,
			}),
		).rejects.toThrow("Enter a name");
		expect(await stored(t)).toEqual(before);
	});
	test("missing sessions and deleted identities cannot use persisted catalogue privilege", async () => {
		const { t, operator } = await setup();
		const missing = t.withIdentity({
			subject: operator.userId,
			sessionId: "missing-session",
			role: "admin",
		});
		await expect(
			missing.mutation(api.catalogue.create, example),
		).rejects.toThrow("Operator access is required");
		await t.mutation(components.betterAuth.adapter.deleteOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: operator.userId }],
			},
		});
		await expect(
			operator.client.mutation(api.catalogue.create, example),
		).rejects.toThrow("Operator access is required");
		expect(await stored(t)).toEqual([]);
	});
	test("guests and users only browse ready entries with the exact safe projection; search covers names and descriptions", async () => {
		const { t, admin } = await setup();
		const id = await admin.client.mutation(api.catalogue.create, example);
		await admin.client.mutation(api.catalogue.create, {
			...example,
			name: "Hidden Orchard",
			isReady: false,
		});
		const user = await createAuthenticatedActor(t);
		for (const client of [t, user.client]) {
			for (const search of ["", "Orchard", "growing"]) {
				const result = await client.query(api.catalogue.list, {
					search,
					paginationOpts: firstPage,
				});
				expect(result.page).toEqual([
					{
						_id: id,
						name: example.name,
						description: example.description,
						isSynthetic: true,
					},
				]);
				expect(result.isDone).toBe(true);
			}
			expect(
				(
					await client.query(api.catalogue.list, {
						search: "Hidden",
						paginationOpts: firstPage,
					})
				).page,
			).toEqual([]);
		}
	});
	test("operator and admin create, normalise, edit and unlist; records remain stored", async () => {
		const { t, admin, operator } = await setup();
		const id = await operator.client.mutation(api.catalogue.create, {
			...example,
			name: "  Example Orchard  ",
		});
		const listing = await admin.client.query(api.catalogue.managementList, {
			paginationOpts: firstPage,
		});
		expect(listing.page).toEqual([{ _id: id, ...example, version: 1 }]);
		await admin.client.mutation(api.catalogue.update, {
			...example,
			name: "Renamed example",
			id,
			expectedVersion: 1,
			isReady: false,
		});
		expect(
			(
				await t.query(api.catalogue.list, {
					search: "",
					paginationOpts: firstPage,
				})
			).page,
		).toEqual([]);
		expect(await stored(t)).toMatchObject([
			{ name: "Renamed example", isReady: false, version: 2 },
		]);
	});
	test("signed-out and ordinary-user reads/writes cannot manage and leave storage unchanged", async () => {
		const { t, admin } = await setup();
		const id = await admin.client.mutation(api.catalogue.create, example);
		const user = await createAuthenticatedActor(t);
		const before = await stored(t);
		for (const client of [t, user.client]) {
			await expect(
				client.query(api.catalogue.managementList, {
					paginationOpts: firstPage,
				}),
			).rejects.toThrow("Operator access is required");
			await expect(
				client.mutation(api.catalogue.create, example),
			).rejects.toThrow("Operator access is required");
			await expect(
				client.mutation(api.catalogue.update, {
					...example,
					id,
					expectedVersion: 1,
					isReady: false,
				}),
			).rejects.toThrow("Operator access is required");
		}
		expect(await stored(t)).toEqual(before);
	});
	test("revocation and forged stale role claims deny the next request on the existing session", async () => {
		const { t, operator, change } = await setup();
		await operator.client.mutation(api.catalogue.create, example);
		await change("user");
		const forged = t.withIdentity({
			subject: operator.userId,
			sessionId: operator.sessionId,
			role: "admin",
		});
		const before = await stored(t);
		for (const client of [operator.client, forged]) {
			await expect(
				client.query(api.catalogue.managementList, {
					paginationOpts: firstPage,
				}),
			).rejects.toThrow("Operator access is required");
			await expect(
				client.mutation(api.catalogue.create, example),
			).rejects.toThrow("Operator access is required");
			expect(
				(
					await client.query(api.catalogue.list, {
						search: "",
						paginationOpts: firstPage,
					})
				).page,
			).toHaveLength(1);
		}
		expect(await stored(t)).toEqual(before);
	});
	test("unverified phones and expired sessions cannot retain persisted operator access", async () => {
		const { t, operator } = await setup();
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: operator.userId }],
				update: { phoneNumberVerified: false },
			},
		});
		await expect(
			operator.client.mutation(api.catalogue.create, example),
		).rejects.toThrow("Operator access is required");
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "user",
				where: [{ field: "_id", value: operator.userId }],
				update: { phoneNumberVerified: true },
			},
		});
		expect(await operator.client.query(api.accounts.currentAccess, {})).toEqual(
			{ role: "operator" },
		);
		await t.mutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "session",
				where: [{ field: "_id", value: operator.sessionId }],
				update: { expiresAt: 1 },
			},
		});
		await expect(
			operator.client.mutation(api.catalogue.create, example),
		).rejects.toThrow("Operator access is required");
		expect(await stored(t)).toEqual([]);
	});
	test("stale editors cannot overwrite another operator's update, and missing records fail safely", async () => {
		const { t, admin, operator } = await setup();
		const id = await admin.client.mutation(api.catalogue.create, example);
		await operator.client.mutation(api.catalogue.update, {
			...example,
			id,
			expectedVersion: 1,
			isReady: false,
		});
		const before = await stored(t);
		await expect(
			admin.client.mutation(api.catalogue.update, {
				...example,
				id,
				expectedVersion: 1,
			}),
		).rejects.toThrow("Close the editor and reopen");
		expect(await stored(t)).toEqual(before);
		// In-memory missing-record fixture only; production deliberately has no delete API.
		await t.run((ctx) => ctx.db.delete("organisations", id));
		await expect(
			admin.client.mutation(api.catalogue.update, {
				...example,
				id,
				expectedVersion: 2,
			}),
		).rejects.toThrow("no longer available");
	});
	test("invalid field/search/page inputs are rejected without persisting partial changes", async () => {
		const { t, admin } = await setup();
		for (const invalid of [
			{ name: " " },
			{ name: "x".repeat(121) },
			{ description: " " },
			{ description: "x".repeat(1201) },
		]) {
			await expect(
				admin.client.mutation(api.catalogue.create, { ...example, ...invalid }),
			).rejects.toThrow("Enter a name");
		}
		await expect(
			t.query(api.catalogue.list, {
				search: "x".repeat(121),
				paginationOpts: firstPage,
			}),
		).rejects.toThrow("at most 120");
		for (const numItems of [0, -1, 1.5, 51]) {
			await expect(
				t.query(api.catalogue.list, {
					search: "",
					paginationOpts: { cursor: null, numItems },
				}),
			).rejects.toThrow("1–50");
		}
		expect(await stored(t)).toEqual([]);
	});
	test("indexed pagination reaches beyond a single page without a catalogue-size cap", async () => {
		const { t, admin } = await setup();
		for (let i = 0; i < 61; i++)
			await admin.client.mutation(api.catalogue.create, {
				...example,
				name: `Example ${String(i).padStart(3, "0")}`,
			});
		let cursor: string | null = null;
		const names: string[] = [];
		for (let i = 0; i < 10; i++) {
			const result: FunctionReturnType<typeof api.catalogue.list> =
				await t.query(api.catalogue.list, {
					search: "",
					paginationOpts: { cursor, numItems: 20 },
				});
			names.push(...result.page.map((row) => row.name));
			if (result.isDone) break;
			cursor = result.continueCursor;
		}
		expect(names).toHaveLength(61);
		expect(new Set(names).size).toBe(61);
		expect(names).toEqual([...names].sort());
	});
});
