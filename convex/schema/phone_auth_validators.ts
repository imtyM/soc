import { v } from "convex/values";

export const phoneChallengeValidator = v.object({
	phoneKey: v.string(),
	generation: v.number(),
	phase: v.union(
		v.literal("starting"),
		v.literal("pending"),
		v.literal("checking"),
		v.literal("consumed"),
		v.literal("unavailable"),
	),
	leaseUntil: v.number(),
	startedAt: v.number(),
	expiresAt: v.number(),
	verificationSid: v.optional(v.string()),
});
