import type { TestConvex } from "convex-test";
import { components } from "./_generated/api";
import type schema from "./schema";

const TEST_TIMESTAMP = 1_700_000_000_000;
const TEST_SESSION_EXPIRY = 4_102_444_800_000;

type AuthenticatedActorOptions = {
	name?: string;
	email?: string;
};

type AppTestBackend = TestConvex<typeof schema>;

export async function createAuthenticatedActor(
	t: AppTestBackend,
	options: AuthenticatedActorOptions = {},
) {
	const name = options.name ?? "Test User";
	const email = options.email ?? "test.user@example.com";
	const user = await t.mutation(components.betterAuth.adapter.create, {
		input: {
			model: "user",
			data: {
				name,
				email,
				emailVerified: true,
				createdAt: TEST_TIMESTAMP,
				updatedAt: TEST_TIMESTAMP,
			},
		},
	});
	const session = await t.mutation(components.betterAuth.adapter.create, {
		input: {
			model: "session",
			data: {
				expiresAt: TEST_SESSION_EXPIRY,
				token: `test-session-${email}`,
				createdAt: TEST_TIMESTAMP,
				updatedAt: TEST_TIMESTAMP,
				userId: user._id,
			},
		},
	});

	return {
		client: t.withIdentity({
			subject: user._id,
			issuer: "https://test.soc.local",
			sessionId: session._id,
			name,
			email,
		}),
		userId: user._id,
		sessionId: session._id,
	};
}
