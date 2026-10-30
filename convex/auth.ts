import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { phoneNumber } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env, query } from "./_generated/server";
import authConfig from "./auth.config";
import {
	phoneAuthError,
	requirePhoneConfiguration,
	sendPhoneCode,
	verifyPhoneCode,
} from "./phone_auth";
import { canonicalPhoneNumber } from "./phone_numbers";

export const authComponent = createClient<DataModel>(components.betterAuth);

// Fail closed for unselected auth/recovery/account-changing endpoints, including
// endpoints added by future library releases. Session reads and revocation stay
// available even while SMS delivery is disabled or exhausted.
const sessionPaths = new Set([
	"/get-session",
	"/sign-out",
	"/list-sessions",
	"/revoke-session",
	"/revoke-sessions",
	"/revoke-other-sessions",
	"/convex/token",
	"/convex/jwks",
	"/convex/.well-known/openid-configuration",
	"/ok",
	"/error",
]);

function bodyHasOnly(
	value: unknown,
	keys: string[],
): value is Record<string, unknown> {
	return (
		value !== null &&
		typeof value === "object" &&
		!Array.isArray(value) &&
		Object.keys(value).every((key) => keys.includes(key))
	);
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
	betterAuth({
		baseURL: env.SITE_URL,
		database: authComponent.adapter(ctx),
		logger: { disabled: true },
		emailAndPassword: { enabled: false },
		hooks: {
			before: createAuthMiddleware(async (request) => {
				const path = request.path;
				if (sessionPaths.has(path)) return;
				if (path === "/update-user") {
					if (!bodyHasOnly(request.body, ["name", "image"]))
						phoneAuthError("PHONE_AUTH_UNSUPPORTED");
					return;
				}
				if (
					path !== "/phone-number/send-otp" &&
					path !== "/phone-number/verify"
				)
					phoneAuthError("PHONE_AUTH_UNSUPPORTED");
				const verifying = path === "/phone-number/verify";
				if (
					!bodyHasOnly(
						request.body,
						verifying ? ["phoneNumber", "code"] : ["phoneNumber"],
					)
				)
					phoneAuthError("PHONE_AUTH_UNSUPPORTED");
				const body = request.body;
				if (typeof body.phoneNumber !== "string")
					phoneAuthError("PHONE_AUTH_INVALID_PHONE");
				const phone = canonicalPhoneNumber(body.phoneNumber);
				if (!phone) phoneAuthError("PHONE_AUTH_INVALID_PHONE");
				if (
					verifying &&
					(typeof body.code !== "string" || !/^\d{6}$/.test(body.code))
				)
					phoneAuthError("PHONE_AUTH_INVALID_CODE");
				requirePhoneConfiguration();
				return { context: { body: { ...body, phoneNumber: phone } } };
			}),
		},
		plugins: [
			phoneNumber({
				phoneNumberValidator: (phone) => canonicalPhoneNumber(phone) !== null,
				sendOTP: async ({ phoneNumber }) => {
					await sendPhoneCode(requireActionCtx(ctx), phoneNumber);
				},
				verifyOTP: async ({ phoneNumber, code }) =>
					await verifyPhoneCode(requireActionCtx(ctx), phoneNumber, code),
				signUpOnVerification: {
					getTempEmail: () => `${crypto.randomUUID()}@phone.soc.invalid`,
					getTempName: () => "SOC member",
				},
			}),
			convex({ authConfig }),
		],
	});

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => await authComponent.getAuthUser(ctx),
});
