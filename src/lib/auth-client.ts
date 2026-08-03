import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { AuthClient } from "@convex-dev/better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const convexAuthClient = createAuthClient({
	plugins: [convexClient()],
});

// Better Auth >=1.6.22 is supported by the Convex component at runtime, but
// @convex-dev/better-auth@0.12.5's provider declaration infers session data as
// `never`. Keep the compatibility cast at this package boundary only.
export const authClient = convexAuthClient as unknown as AuthClient;

export const phoneAuthClient = createAuthClient({
	plugins: [phoneNumberClient()],
});
