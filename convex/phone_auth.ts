import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { APIError } from "better-auth/api";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	type ActionCtx,
	env,
	internalMutation,
	type MutationCtx,
} from "./_generated/server";
import {
	PHONE_AUTH_ERRORS,
	type PhoneAuthErrorCode,
} from "./phone_auth_errors";
import { canonicalPhoneNumber } from "./phone_numbers";
import { phoneChallengeValidator } from "./schema/phone_auth_validators";
import { requestVerification, type VerifyConfiguration } from "./twilio_verify";

const VALIDITY = 10 * MINUTE;
const LEASE = 30_000;
const limiter = new RateLimiter(components.rateLimiter, {
	sendGlobal: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 5 },
	sendCooldown: { kind: "token bucket", rate: 1, period: 30_000, capacity: 1 },
	sendPhone: { kind: "token bucket", rate: 3, period: VALIDITY, capacity: 3 },
	checkGlobal: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 10 },
	checkPhone: { kind: "token bucket", rate: 1, period: 3_000, capacity: 1 },
});

type Denied = { ok: false; code: PhoneAuthErrorCode };
type Reservation = { ok: true; id: Id<"phoneChallenges">; generation: number };
type CheckReservation = Reservation & { sid: string };
const denied = (code: PhoneAuthErrorCode): Denied => ({ ok: false, code });

export const reserveSend = internalMutation({
	args: phoneChallengeValidator.pick("phoneKey"),
	handler: async (ctx, { phoneKey }): Promise<Reservation | Denied> => {
		const now = Date.now();
		const previous = await ctx.db
			.query("phoneChallenges")
			.withIndex("by_phoneKey", (q) => q.eq("phoneKey", phoneKey))
			.unique();
		if (
			previous &&
			(previous.phase === "starting" || previous.phase === "checking") &&
			previous.leaseUntil > now
		) {
			return denied("PHONE_AUTH_THROTTLED");
		}
		// A separate key per UTC calendar month avoids a rolling 30-day allowance.
		const date = new Date(now);
		const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
		const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
		const monthly = {
			key: date.toISOString().slice(0, 7),
			config: {
				kind: "fixed window" as const,
				rate: 50,
				capacity: 50,
				start,
				period: end - start,
			},
		};
		if (!(await limiter.check(ctx, "smsMonth", monthly)).ok)
			return denied("PHONE_AUTH_MONTHLY_LIMIT");
		if (!(await checkSendLimits(ctx, phoneKey)))
			return denied("PHONE_AUTH_THROTTLED");
		// Component writes and challenge reservation share this transaction. Return
		// normally; never roll back the reservation after a potentially billed call.
		await limiter.limit(ctx, "sendGlobal", { throws: true });
		await limiter.limit(ctx, "sendCooldown", { key: phoneKey, throws: true });
		await limiter.limit(ctx, "sendPhone", { key: phoneKey, throws: true });
		await limiter.limit(ctx, "smsMonth", { ...monthly, throws: true });
		const generation = (previous?.generation ?? 0) + 1;
		const data = {
			phoneKey,
			generation,
			phase: "starting" as const,
			leaseUntil: now + LEASE,
			startedAt: now,
			expiresAt: previous?.expiresAt ?? now + VALIDITY,
			verificationSid: previous?.verificationSid,
		};
		const id = previous?._id ?? (await ctx.db.insert("phoneChallenges", data));
		if (previous) await ctx.db.replace("phoneChallenges", id, data);
		return { ok: true, id, generation };
	},
});

async function checkSendLimits(ctx: MutationCtx, key: string) {
	return (
		(await limiter.check(ctx, "sendGlobal")).ok &&
		(await limiter.check(ctx, "sendCooldown", { key })).ok &&
		(await limiter.check(ctx, "sendPhone", { key })).ok
	);
}

const completionArgs = phoneChallengeValidator
	.pick("generation")
	.extend({ id: v.id("phoneChallenges") });

export const finishSend = internalMutation({
	args: completionArgs.extend({
		verificationSid: v.optional(v.string()),
		providerCreatedAt: v.optional(v.number()),
	}),
	handler: async (
		ctx,
		{ id, generation, verificationSid, providerCreatedAt },
	) => {
		const challenge = await ctx.db.get("phoneChallenges", id);
		if (
			!challenge ||
			challenge.generation !== generation ||
			challenge.phase !== "starting" ||
			challenge.leaseUntil <= Date.now()
		)
			return false;
		const same =
			verificationSid !== undefined &&
			verificationSid === challenge.verificationSid;
		// Preserve known SID identity even on an uncertain resend. Provider creation
		// time also bounds a SID first observed after an earlier timed-out start.
		const expiresAt =
			verificationSid !== undefined && providerCreatedAt !== undefined
				? Math.min(
						challenge.startedAt + VALIDITY,
						providerCreatedAt + VALIDITY,
						same ? challenge.expiresAt : Infinity,
					)
				: challenge.expiresAt;
		const valid =
			verificationSid !== undefined &&
			providerCreatedAt !== undefined &&
			expiresAt > Date.now();
		await ctx.db.patch("phoneChallenges", id, {
			phase: valid ? "pending" : "unavailable",
			leaseUntil: 0,
			verificationSid: verificationSid ?? challenge.verificationSid,
			expiresAt,
		});
		return valid;
	},
});

export const reserveCheck = internalMutation({
	args: phoneChallengeValidator.pick("phoneKey"),
	handler: async (ctx, { phoneKey }): Promise<CheckReservation | Denied> => {
		const challenge = await ctx.db
			.query("phoneChallenges")
			.withIndex("by_phoneKey", (q) => q.eq("phoneKey", phoneKey))
			.unique();
		const now = Date.now();
		if (
			!challenge ||
			challenge.phase !== "pending" ||
			challenge.expiresAt <= now ||
			!challenge.verificationSid
		) {
			return denied("PHONE_AUTH_INVALID_CODE");
		}
		const attempts = {
			key: challenge.verificationSid,
			config: {
				kind: "fixed window" as const,
				rate: 5,
				capacity: 5,
				start: challenge.expiresAt - VALIDITY,
				period: VALIDITY,
			},
		};
		if (!(await limiter.check(ctx, "challengeAttempts", attempts)).ok)
			return denied("PHONE_AUTH_INVALID_CODE");
		if (
			!(await limiter.check(ctx, "checkGlobal")).ok ||
			!(await limiter.check(ctx, "checkPhone", { key: phoneKey })).ok
		)
			return denied("PHONE_AUTH_THROTTLED");
		await limiter.limit(ctx, "challengeAttempts", {
			...attempts,
			throws: true,
		});
		await limiter.limit(ctx, "checkGlobal", { throws: true });
		await limiter.limit(ctx, "checkPhone", { key: phoneKey, throws: true });
		const generation = challenge.generation + 1;
		await ctx.db.patch("phoneChallenges", challenge._id, {
			phase: "checking",
			generation,
			leaseUntil: now + LEASE,
		});
		return {
			ok: true,
			id: challenge._id,
			generation,
			sid: challenge.verificationSid,
		};
	},
});

export const finishCheck = internalMutation({
	args: completionArgs.extend({
		approved: v.boolean(),
		available: v.boolean(),
	}),
	handler: async (ctx, { id, generation, approved, available }) => {
		const challenge = await ctx.db.get("phoneChallenges", id);
		if (
			!challenge ||
			challenge.generation !== generation ||
			challenge.phase !== "checking" ||
			challenge.leaseUntil <= Date.now() ||
			challenge.expiresAt <= Date.now()
		)
			return false;
		await ctx.db.patch("phoneChallenges", id, {
			phase: approved ? "consumed" : available ? "pending" : "unavailable",
			leaseUntil: 0,
		});
		return approved;
	},
});

export function requirePhoneConfiguration(): VerifyConfiguration {
	if (env.PHONE_AUTH_ENABLED !== "true")
		phoneAuthError("PHONE_AUTH_UNAVAILABLE");
	const {
		TWILIO_ACCOUNT_SID: accountSid,
		TWILIO_API_KEY_SID: keySid,
		TWILIO_API_KEY_SECRET: keySecret,
		TWILIO_VERIFY_SERVICE_SID: serviceSid,
	} = env;
	if (
		!accountSid ||
		!/^AC[0-9a-f]{32}$/i.test(accountSid) ||
		!keySid ||
		!/^SK[0-9a-f]{32}$/i.test(keySid) ||
		!keySecret ||
		!serviceSid ||
		!/^VA[0-9a-f]{32}$/i.test(serviceSid)
	)
		phoneAuthError("PHONE_AUTH_UNAVAILABLE");
	return { accountSid, keySid, keySecret, serviceSid };
}

async function phoneDigest(phone: string) {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(env.BETTER_AUTH_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const digest = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(`soc:phone-auth:v1:${phone}`),
	);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}

export function phoneAuthError(code: PhoneAuthErrorCode): never {
	throw new APIError("BAD_REQUEST", { code, message: PHONE_AUTH_ERRORS[code] });
}

// Called directly within Better Auth's HTTP action: no nested same-runtime action,
// no runtime fake delivery, and no generated/local code is sent to the provider.
export async function sendPhoneCode(
	ctx: ActionCtx,
	value: string,
): Promise<void> {
	const phone = canonicalPhoneNumber(value);
	if (!phone) phoneAuthError("PHONE_AUTH_INVALID_PHONE");
	const config = requirePhoneConfiguration();
	const reservation: Reservation | Denied = await ctx.runMutation(
		internal.phone_auth.reserveSend,
		{ phoneKey: await phoneDigest(phone) },
	);
	if (!reservation.ok) phoneAuthError(reservation.code);
	const result = await requestVerification(config, phone);
	const accepted: boolean = await ctx.runMutation(
		internal.phone_auth.finishSend,
		{
			id: reservation.id,
			generation: reservation.generation,
			verificationSid: result?.sid,
			providerCreatedAt: result?.createdAt,
		},
	);
	if (!accepted) phoneAuthError("PHONE_AUTH_UNAVAILABLE");
}

export async function verifyPhoneCode(
	ctx: ActionCtx,
	value: string,
	code: string,
): Promise<boolean> {
	const phone = canonicalPhoneNumber(value);
	if (!phone) phoneAuthError("PHONE_AUTH_INVALID_PHONE");
	if (!/^\d{6}$/.test(code)) phoneAuthError("PHONE_AUTH_INVALID_CODE");
	const config = requirePhoneConfiguration();
	const reservation: CheckReservation | Denied = await ctx.runMutation(
		internal.phone_auth.reserveCheck,
		{ phoneKey: await phoneDigest(phone) },
	);
	if (!reservation.ok) phoneAuthError(reservation.code);
	const result = await requestVerification(config, phone, {
		sid: reservation.sid,
		code,
	});
	const approved: boolean = await ctx.runMutation(
		internal.phone_auth.finishCheck,
		{
			id: reservation.id,
			generation: reservation.generation,
			approved: result?.status === "approved",
			available: result !== null,
		},
	);
	if (!approved)
		phoneAuthError(
			result ? "PHONE_AUTH_INVALID_CODE" : "PHONE_AUTH_UNAVAILABLE",
		);
	return true;
}
