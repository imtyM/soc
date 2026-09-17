import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { modules } from "./test.setup";

test("runs against an isolated schema-backed Convex instance", async () => {
	expect(Object.keys(modules)).toContain("./todos.ts");
	expect(Object.keys(modules)).not.toContain("./harness.test.ts");

	const t = convexTest(schema, modules);
	betterAuthTest.register(t);

	const storedTodo = await t.run(async (ctx) => {
		const todoId = await ctx.db.insert("todos", {
			userId: "harness-user",
			text: "Verify the Convex test harness",
			completed: false,
		});

		return await ctx.db.get(todoId);
	});

	expect(storedTodo).toMatchObject({
		userId: "harness-user",
		text: "Verify the Convex test harness",
		completed: false,
	});
});
