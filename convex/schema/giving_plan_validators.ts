import { v } from "convex/values";

export const givingPlanValidator = v.object({
	authUserId: v.string(),
	monthlyAmountMinor: v.number(),
	version: v.number(),
});
export const givingPlanShareValidator = v.object({
	planId: v.id("givingPlans"),
	organisationId: v.id("organisations"),
	units: v.number(),
});
