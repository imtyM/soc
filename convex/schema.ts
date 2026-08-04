import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { todoPriorityValidator } from "./schema/todo_validators";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
	numbers: defineTable({
		value: v.number(),
	}),
	todos: defineTable({
		userId: v.string(),
		text: v.string(),
		completed: v.boolean(),
		priority: v.optional(todoPriorityValidator),
	}).index("by_userId", ["userId"]),
});
