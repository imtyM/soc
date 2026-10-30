import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { accountRoleValidator } from "./schema/account_validators";
import { phoneChallengeValidator } from "./schema/phone_auth_validators";
import { todoPriorityValidator } from "./schema/todo_validators";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
	phoneChallenges: defineTable(phoneChallengeValidator).index("by_phoneKey", [
		"phoneKey",
	]),
	accountRoles: defineTable({
		authUserId: v.string(),
		role: accountRoleValidator,
	})
		.index("by_authUserId", ["authUserId"])
		.index("by_role", ["role"]),
	todos: defineTable({
		userId: v.string(),
		text: v.string(),
		completed: v.boolean(),
		priority: v.optional(todoPriorityValidator),
	}).index("by_userId", ["userId"]),
});
