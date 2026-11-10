import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { accountRoleValidator } from "./schema/account_validators";
import { catalogueEntryValidator } from "./schema/catalogue_validators";
import {
	givingPlanShareValidator,
	givingPlanValidator,
} from "./schema/giving_plan_validators";
import { phoneChallengeValidator } from "./schema/phone_auth_validators";
import { todoPriorityValidator } from "./schema/todo_validators";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
	givingPlans: defineTable(givingPlanValidator).index("by_authUserId", [
		"authUserId",
	]),
	givingPlanShares: defineTable(givingPlanShareValidator).index(
		"by_planId_and_organisationId",
		["planId", "organisationId"],
	),
	organisations: defineTable(catalogueEntryValidator)
		.index("by_nameSort", ["nameSort"])
		.index("by_isReady_and_nameSort", ["isReady", "nameSort"])
		.searchIndex("search_catalogue", {
			searchField: "searchText",
			filterFields: ["isReady"],
		}),
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
