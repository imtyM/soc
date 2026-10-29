import { type Infer, v } from "convex/values";

export const ACCOUNT_ROLES = ["user", "operator", "admin"] as const;
export const accountRoleValidator = v.union(
	...ACCOUNT_ROLES.map((role) => v.literal(role)),
);
export type AccountRole = Infer<typeof accountRoleValidator>;
