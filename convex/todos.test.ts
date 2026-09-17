import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import {
	DEFAULT_TODO_PRIORITY,
	TODO_PRIORITIES,
} from "./schema/todo_validators";
import { createAuthenticatedActor } from "./test.helpers";
import { modules } from "./test.setup";

const LOW_PRIORITY = TODO_PRIORITIES[0];
const HIGH_PRIORITY = TODO_PRIORITIES[2];

describe("todo authentication", () => {
	test("rejects unauthenticated callers for every public function", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const todoId = await t.run(async (ctx) => {
			return await ctx.db.insert("todos", {
				userId: "valid-id-owner",
				text: "Valid-shaped authentication target",
				completed: false,
			});
		});

		await expect(t.query(api.todos.list, {})).rejects.toThrowError(
			/^Unauthenticated$/,
		);
		await expect(
			t.mutation(api.todos.add, { text: "Unauthenticated" }),
		).rejects.toThrowError(/^Unauthenticated$/);
		await expect(
			t.mutation(api.todos.setCompleted, { id: todoId, completed: true }),
		).rejects.toThrowError(/^Unauthenticated$/);
		await expect(
			t.mutation(api.todos.setPriority, {
				id: todoId,
				priority: HIGH_PRIORITY,
			}),
		).rejects.toThrowError(/^Unauthenticated$/);
		await expect(
			t.mutation(api.todos.remove, { id: todoId }),
		).rejects.toThrowError(/^Unauthenticated$/);
	});
});

describe("todo add", () => {
	test("trims text and stores server-controlled defaults and ownership", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const actor = await createAuthenticatedActor(t);

		const todoId = await actor.client.mutation(api.todos.add, {
			text: "  Test the todo contract  ",
		});
		const todo = await t.run(async (ctx) => await ctx.db.get(todoId));

		expect(todo).toMatchObject({
			userId: actor.userId,
			text: "Test the todo contract",
			completed: false,
			priority: DEFAULT_TODO_PRIORITY,
		});
	});

	test("preserves an explicitly supplied priority", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const actor = await createAuthenticatedActor(t);

		const todoId = await actor.client.mutation(api.todos.add, {
			text: "Explicit priority",
			priority: HIGH_PRIORITY,
		});
		const todo = await t.run(async (ctx) => await ctx.db.get(todoId));

		expect(todo?.priority).toBe(HIGH_PRIORITY);
	});

	test.each(["", "   \t\n  "])("rejects blank text %#", async (text) => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const actor = await createAuthenticatedActor(t);

		await expect(
			actor.client.mutation(api.todos.add, { text }),
		).rejects.toThrowError(/^Todo text is required$/);
	});
});

describe("todo list", () => {
	test("returns an empty array for an authenticated user without todos", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const actor = await createAuthenticatedActor(t);

		expect(await actor.client.query(api.todos.list, {})).toEqual([]);
	});

	test("returns only the caller's todos in newest-first order", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const firstActor = await createAuthenticatedActor(t, {
			name: "First User",
			email: "first@example.com",
		});
		const secondActor = await createAuthenticatedActor(t, {
			name: "Second User",
			email: "second@example.com",
		});

		expect(
			await firstActor.client.query(api.auth.getCurrentUser, {}),
		).toMatchObject({
			_id: firstActor.userId,
			email: "first@example.com",
		});
		expect(
			await secondActor.client.query(api.auth.getCurrentUser, {}),
		).toMatchObject({
			_id: secondActor.userId,
			email: "second@example.com",
		});

		await firstActor.client.mutation(api.todos.add, { text: "Oldest" });
		await secondActor.client.mutation(api.todos.add, { text: "Private" });
		await firstActor.client.mutation(api.todos.add, { text: "Newest" });

		const todos = await firstActor.client.query(api.todos.list, {});
		expect(todos.map((todo) => todo.text)).toEqual(["Newest", "Oldest"]);
		expect(todos.every((todo) => todo.userId === firstActor.userId)).toBe(true);
	});

	test("returns the newest 100 of 101 without counting another user's data", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const firstActor = await createAuthenticatedActor(t, {
			name: "Boundary User",
			email: "boundary@example.com",
		});
		const secondActor = await createAuthenticatedActor(t, {
			name: "Other User",
			email: "other@example.com",
		});

		const oldestId = await t.run(async (ctx) => {
			let firstId = null;
			for (let index = 0; index < 101; index += 1) {
				const id = await ctx.db.insert("todos", {
					userId: firstActor.userId,
					text: `Caller todo ${index}`,
					completed: false,
					priority: DEFAULT_TODO_PRIORITY,
				});
				firstId ??= id;
			}
			for (let index = 0; index < 5; index += 1) {
				await ctx.db.insert("todos", {
					userId: secondActor.userId,
					text: `Other todo ${index}`,
					completed: false,
					priority: DEFAULT_TODO_PRIORITY,
				});
			}
			return firstId;
		});

		const todos = await firstActor.client.query(api.todos.list, {});
		expect(todos).toHaveLength(100);
		expect(todos[0]?.text).toBe("Caller todo 100");
		expect(todos.at(-1)?.text).toBe("Caller todo 1");
		expect(todos.some((todo) => todo._id === oldestId)).toBe(false);
		expect(todos.every((todo) => todo.userId === firstActor.userId)).toBe(true);
	});
});

describe("todo completion", () => {
	test("sets both completion values while preserving unrelated fields", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const actor = await createAuthenticatedActor(t);
		const todoId = await actor.client.mutation(api.todos.add, {
			text: "Toggle completion",
			priority: HIGH_PRIORITY,
		});

		await actor.client.mutation(api.todos.setCompleted, {
			id: todoId,
			completed: true,
		});
		let todo = await t.run(async (ctx) => await ctx.db.get(todoId));
		expect(todo).toMatchObject({
			text: "Toggle completion",
			completed: true,
			priority: HIGH_PRIORITY,
			userId: actor.userId,
		});

		await actor.client.mutation(api.todos.setCompleted, {
			id: todoId,
			completed: false,
		});
		todo = await t.run(async (ctx) => await ctx.db.get(todoId));
		expect(todo).toMatchObject({
			text: "Toggle completion",
			completed: false,
			priority: HIGH_PRIORITY,
			userId: actor.userId,
		});
	});

	test("hides missing and foreign todos without altering foreign data", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const owner = await createAuthenticatedActor(t, {
			name: "Owner",
			email: "owner@example.com",
		});
		const outsider = await createAuthenticatedActor(t, {
			name: "Outsider",
			email: "outsider@example.com",
		});
		const foreignId = await owner.client.mutation(api.todos.add, {
			text: "Private completion",
			priority: LOW_PRIORITY,
		});
		const missingId = await t.run(async (ctx) => {
			const id = await ctx.db.insert("todos", {
				userId: outsider.userId,
				text: "Deleted completion target",
				completed: false,
			});
			await ctx.db.delete(id);
			return id;
		});
		const foreignTodo = await t.run(async (ctx) => await ctx.db.get(foreignId));

		await expect(
			outsider.client.mutation(api.todos.setCompleted, {
				id: missingId,
				completed: true,
			}),
		).rejects.toThrowError(/^Todo not found$/);
		await expect(
			outsider.client.mutation(api.todos.setCompleted, {
				id: foreignId,
				completed: true,
			}),
		).rejects.toThrowError(/^Todo not found$/);
		expect(await t.run(async (ctx) => await ctx.db.get(foreignId))).toEqual(
			foreignTodo,
		);
	});
});

describe("todo priority", () => {
	test("applies every priority and resets to the shared default", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const actor = await createAuthenticatedActor(t);
		const todoId = await actor.client.mutation(api.todos.add, {
			text: "Change priority",
		});

		for (const priority of TODO_PRIORITIES) {
			await actor.client.mutation(api.todos.setPriority, {
				id: todoId,
				priority,
			});
			const todo = await t.run(async (ctx) => await ctx.db.get(todoId));
			expect(todo).toMatchObject({
				text: "Change priority",
				completed: false,
				priority,
				userId: actor.userId,
			});
		}

		await actor.client.mutation(api.todos.setPriority, { id: todoId });
		const resetTodo = await t.run(async (ctx) => await ctx.db.get(todoId));
		expect(resetTodo).toMatchObject({
			text: "Change priority",
			completed: false,
			priority: DEFAULT_TODO_PRIORITY,
			userId: actor.userId,
		});
	});

	test("hides missing and foreign todos without altering foreign data", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const owner = await createAuthenticatedActor(t, {
			name: "Owner",
			email: "owner@example.com",
		});
		const outsider = await createAuthenticatedActor(t, {
			name: "Outsider",
			email: "outsider@example.com",
		});
		const foreignId = await owner.client.mutation(api.todos.add, {
			text: "Private priority",
			priority: LOW_PRIORITY,
		});
		const missingId = await t.run(async (ctx) => {
			const id = await ctx.db.insert("todos", {
				userId: outsider.userId,
				text: "Deleted priority target",
				completed: false,
			});
			await ctx.db.delete(id);
			return id;
		});
		const foreignTodo = await t.run(async (ctx) => await ctx.db.get(foreignId));

		await expect(
			outsider.client.mutation(api.todos.setPriority, {
				id: missingId,
				priority: HIGH_PRIORITY,
			}),
		).rejects.toThrowError(/^Todo not found$/);
		await expect(
			outsider.client.mutation(api.todos.setPriority, {
				id: foreignId,
				priority: HIGH_PRIORITY,
			}),
		).rejects.toThrowError(/^Todo not found$/);
		expect(await t.run(async (ctx) => await ctx.db.get(foreignId))).toEqual(
			foreignTodo,
		);
	});
});

describe("todo removal", () => {
	test("deletes only the owned target", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const actor = await createAuthenticatedActor(t);
		const removedId = await actor.client.mutation(api.todos.add, {
			text: "Remove this",
		});
		const keptId = await actor.client.mutation(api.todos.add, {
			text: "Keep this",
		});
		const keptTodo = await t.run(async (ctx) => await ctx.db.get(keptId));

		await actor.client.mutation(api.todos.remove, { id: removedId });

		expect(await t.run(async (ctx) => await ctx.db.get(removedId))).toBeNull();
		expect(await t.run(async (ctx) => await ctx.db.get(keptId))).toEqual(
			keptTodo,
		);
	});

	test("hides missing and foreign todos without deleting foreign data", async () => {
		const t = convexTest(schema, modules);
		betterAuthTest.register(t);
		const owner = await createAuthenticatedActor(t, {
			name: "Owner",
			email: "owner@example.com",
		});
		const outsider = await createAuthenticatedActor(t, {
			name: "Outsider",
			email: "outsider@example.com",
		});
		const foreignId = await owner.client.mutation(api.todos.add, {
			text: "Private removal",
			priority: HIGH_PRIORITY,
		});
		const missingId = await t.run(async (ctx) => {
			const id = await ctx.db.insert("todos", {
				userId: outsider.userId,
				text: "Deleted removal target",
				completed: false,
			});
			await ctx.db.delete(id);
			return id;
		});
		const foreignTodo = await t.run(async (ctx) => await ctx.db.get(foreignId));

		await expect(
			outsider.client.mutation(api.todos.remove, { id: missingId }),
		).rejects.toThrowError(/^Todo not found$/);
		await expect(
			outsider.client.mutation(api.todos.remove, { id: foreignId }),
		).rejects.toThrowError(/^Todo not found$/);
		expect(await t.run(async (ctx) => await ctx.db.get(foreignId))).toEqual(
			foreignTodo,
		);
	});
});
