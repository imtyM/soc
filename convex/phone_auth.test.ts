import betterAuthTest from "@convex-dev/better-auth/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { components, internal } from "./_generated/api";
import { canonicalPhoneNumber } from "./phone_numbers";
import schema from "./schema";
import { modules } from "./test.setup";

const PHONE = "+27821234567"; // Synthetic fixtures only; never sent over a network.
const SID = `VE${"4".repeat(32)}`;
const ACCOUNT = `AC${"1".repeat(32)}`;
const SERVICE = `VA${"2".repeat(32)}`;

function backend() {
	const t = convexTest(schema, modules);
	betterAuthTest.register(t);
	rateLimiterTest.register(t);
	return t;
}
function provider(status = "pending", overrides: Record<string, unknown> = {}) {
	return Response.json({
		sid: SID,
		account_sid: ACCOUNT,
		service_sid: SERVICE,
		to: PHONE,
		channel: "sms",
		status,
		date_created: new Date(Date.now()).toISOString(),
		...overrides,
	});
}
function post(
	t: ReturnType<typeof backend>,
	path: string,
	body: unknown,
	cookie?: string,
) {
	return t.fetch(`/api/auth${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: "http://localhost:4317",
			...(cookie ? { Cookie: cookie } : {}),
		},
		body: JSON.stringify(body),
	});
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
	vi.stubEnv("SITE_URL", "http://localhost:4317");
	vi.stubEnv("CONVEX_SITE_URL", "https://fixture.convex.site");
	vi.stubEnv(
		"BETTER_AUTH_SECRET",
		"synthetic-test-secret-not-a-real-credential-12345",
	);
	vi.stubEnv("PHONE_AUTH_ENABLED", "true");
	vi.stubEnv("TWILIO_ACCOUNT_SID", ACCOUNT);
	vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", SERVICE);
	vi.stubEnv("TWILIO_API_KEY_SID", `SK${"3".repeat(32)}`);
	vi.stubEnv("TWILIO_API_KEY_SECRET", "synthetic-test-provider-secret");
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("phone-only HTTP authentication", () => {
	test("validates ZA numbering metadata without extracting numbers from text", () => {
		expect(canonicalPhoneNumber("+27 82 123 4567")).toBe(PHONE);
		for (const invalid of [
			"+12025550142",
			"+27000000000",
			"0821234567",
			`call ${PHONE}`,
			`${PHONE} ext 12`,
			"+278212",
		])
			expect(canonicalPhoneNumber(invalid)).toBeNull();
	});

	test("disabled or incomplete configuration fails closed without network/quota", async () => {
		const t = backend();
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		for (const enabled of ["", "false"]) {
			vi.stubEnv("PHONE_AUTH_ENABLED", enabled);
			const r = await post(t, "/phone-number/send-otp", { phoneNumber: PHONE });
			expect(await r.json()).toMatchObject({ code: "PHONE_AUTH_UNAVAILABLE" });
		}
		vi.stubEnv("PHONE_AUTH_ENABLED", "true");
		vi.stubEnv("TWILIO_API_KEY_SECRET", "");
		expect(
			(await post(t, "/phone-number/send-otp", { phoneNumber: PHONE })).ok,
		).toBe(false);
		expect(fetch).not.toHaveBeenCalled();
		const unusedCodes = await t.query(components.betterAuth.adapter.findMany, {
			model: "verification",
			paginationOpts: { cursor: null, numItems: 5 },
		});
		expect(unusedCodes.page).toEqual([]);
		expect(
			await t.run((ctx) => ctx.db.query("phoneChallenges").take(1)),
		).toEqual([]);
	});

	test("rejects invalid phones and verify extras before provider work", async () => {
		const t = backend();
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		for (const phoneNumber of ["+12025550142", "+27000000000"]) {
			const r = await post(t, "/phone-number/send-otp", { phoneNumber });
			expect(r.ok).toBe(false);
		}
		for (const extra of [
			{ updatePhoneNumber: true },
			{ disableSession: true },
			{ role: "admin" },
			{ phoneNumberVerified: true },
			{ email: "fixture@example.com" },
		]) {
			const r = await post(t, "/phone-number/verify", {
				phoneNumber: PHONE,
				code: "000000",
				...extra,
			});
			expect(await r.json()).toMatchObject({ code: "PHONE_AUTH_UNSUPPORTED" });
		}
		expect(fetch).not.toHaveBeenCalled();
	});

	test("gates alternate credentials, recovery and generic phone updates on the server", async () => {
		const t = backend();
		vi.stubGlobal("fetch", vi.fn());
		const body = {
			phoneNumber: PHONE,
			phoneNumberVerified: true,
			email: "fixture@example.com",
			password: "synthetic-test-password",
			newPassword: "synthetic-test-password",
			currentPassword: "synthetic-test-password",
			name: "Fixture",
			code: "000000",
			token: "fixture",
		};
		for (const path of [
			"/sign-up/email",
			"/sign-in/email",
			"/sign-in/phone-number",
			"/phone-number/request-password-reset",
			"/phone-number/reset-password",
			"/request-password-reset",
			"/reset-password",
			"/change-password",
			"/set-password",
			"/change-email",
			"/send-verification-email",
			"/delete-user",
			"/update-user",
			"/sign-in/social",
		]) {
			const r = await post(t, path, body);
			expect(r.ok, path).toBe(false);
		}
		expect(await t.run((ctx) => ctx.db.query("accountRoles").take(1))).toEqual(
			[],
		);
	});

	test("only provider approval creates a verified normal account and session; consumed proof cannot replay", async () => {
		const t = backend();
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(provider())
			.mockResolvedValueOnce(provider("pending"))
			.mockResolvedValueOnce(provider("approved"));
		vi.stubGlobal("fetch", fetch);
		const log = vi.spyOn(console, "info");
		expect(
			(
				await post(t, "/phone-number/send-otp", {
					phoneNumber: "+27 82 123 4567",
				})
			).ok,
		).toBe(true);
		const wrong = await post(t, "/phone-number/verify", {
			phoneNumber: PHONE,
			code: "000000",
		});
		expect(await wrong.json()).toMatchObject({
			code: "PHONE_AUTH_INVALID_CODE",
		});
		vi.setSystemTime(Date.now() + 3_000);
		const verified = await post(t, "/phone-number/verify", {
			phoneNumber: PHONE,
			code: "000000",
		});
		expect(verified.ok).toBe(true);
		const result: unknown = await verified.json();
		expect(result).toMatchObject({
			status: true,
			token: expect.any(String),
			user: {
				phoneNumber: PHONE,
				phoneNumberVerified: true,
				name: "SOC member",
				email: expect.stringMatching(/@phone\.soc\.invalid$/),
			},
		});
		expect(verified.headers.get("set-cookie")).toContain("session_token");
		expect(await t.run((ctx) => ctx.db.query("accountRoles").take(1))).toEqual(
			[],
		);
		const replay = await post(t, "/phone-number/verify", {
			phoneNumber: PHONE,
			code: "000000",
		});
		expect(replay.ok).toBe(false);
		expect(fetch).toHaveBeenCalledTimes(3);
		expect(log).not.toHaveBeenCalled();
		const state = await t.run((ctx) => ctx.db.query("phoneChallenges").take(1));
		expect(state[0]?.phoneKey).toMatch(/^[a-f0-9]{64}$/);
		expect(JSON.stringify(state)).not.toContain(PHONE);
		expect(Object.keys(state[0] ?? {}).sort()).toEqual(
			[
				"_creationTime",
				"_id",
				"expiresAt",
				"generation",
				"leaseUntil",
				"phase",
				"phoneKey",
				"startedAt",
				"verificationSid",
			].sort(),
		);
	});

	test("exhaustion leaves existing sessions usable; signed-in public phone changes fail and sign-out still works", async () => {
		const t = backend();
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(provider())
				.mockResolvedValueOnce(provider("approved")),
		);
		await post(t, "/phone-number/send-otp", { phoneNumber: PHONE });
		const verified = await post(t, "/phone-number/verify", {
			phoneNumber: PHONE,
			code: "000000",
		});
		expect(verified.ok).toBe(true);
		const cookie = verified.headers
			.getSetCookie()
			.map((value) => value.split(";")[0])
			.join("; ");
		for (let n = 0; n < 49; n++) {
			vi.setSystemTime(Date.now() + 60_000);
			expect(
				await t.mutation(internal.phone_auth.reserveSend, {
					phoneKey: `session-fixture-${n}`,
				}),
			).toMatchObject({ ok: true });
		}
		const exhausted = await post(t, "/phone-number/send-otp", {
			phoneNumber: PHONE,
		});
		expect(await exhausted.json()).toMatchObject({
			code: "PHONE_AUTH_MONTHLY_LIMIT",
		});
		const change = await post(
			t,
			"/update-user",
			{ phoneNumber: "+27821234568" },
			cookie,
		);
		expect(change.ok).toBe(false);
		vi.stubEnv("PHONE_AUTH_ENABLED", "false");
		const session = await t.fetch("/api/auth/get-session", {
			headers: { Cookie: cookie },
		});
		expect(await session.json()).toMatchObject({
			user: { phoneNumber: PHONE },
		});
		expect((await post(t, "/sign-out", {}, cookie)).ok).toBe(true);
		const signedOut = await t.fetch("/api/auth/get-session", {
			headers: { Cookie: cookie },
		});
		expect(await signedOut.json()).toBeNull();
	});

	test.each([
		"network",
		"malformed",
		"wrong-recipient",
		"wrong-account",
		"wrong-service",
		"wrong-reference",
		"not-approved",
	])("fails closed on provider %s", async (failure) => {
		const t = backend();
		const fetch = vi.fn().mockResolvedValueOnce(provider());
		if (failure === "network")
			fetch.mockRejectedValueOnce(new Error("sensitive provider detail"));
		else if (failure === "malformed")
			fetch.mockResolvedValueOnce(
				Response.json({ message: "sensitive provider detail" }),
			);
		else if (failure === "wrong-recipient")
			fetch.mockResolvedValueOnce(provider("approved", { to: "+27821234568" }));
		else if (failure === "wrong-account")
			fetch.mockResolvedValueOnce(
				provider("approved", { account_sid: `AC${"6".repeat(32)}` }),
			);
		else if (failure === "wrong-service")
			fetch.mockResolvedValueOnce(
				provider("approved", { service_sid: `VA${"6".repeat(32)}` }),
			);
		else if (failure === "wrong-reference")
			fetch.mockResolvedValueOnce(
				provider("approved", { sid: `VE${"6".repeat(32)}` }),
			);
		else fetch.mockResolvedValueOnce(provider("canceled"));
		vi.stubGlobal("fetch", fetch);
		await post(t, "/phone-number/send-otp", { phoneNumber: PHONE });
		const r = await post(t, "/phone-number/verify", {
			phoneNumber: PHONE,
			code: "000000",
		});
		expect(r.ok).toBe(false);
		expect(await r.text()).not.toContain("sensitive");
		const sessions = await t.query(components.betterAuth.adapter.findMany, {
			model: "session",
			paginationOpts: { cursor: null, numItems: 5 },
		});
		expect(sessions.page).toEqual([]);
	});
});

describe("provider request boundary", () => {
	test("times out without retry and keeps potentially billed start capacity consumed", async () => {
		vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
		const t = backend();
		const fetch = vi.fn(
			(_url: string, options: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					options.signal?.addEventListener("abort", () =>
						reject(Error("synthetic private timeout detail")),
					);
				}),
		);
		vi.stubGlobal("fetch", fetch);
		const pending = post(t, "/phone-number/send-otp", { phoneNumber: PHONE });
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
		await vi.advanceTimersByTimeAsync(8_001);
		const response = await pending;
		expect(await response.json()).toMatchObject({
			code: "PHONE_AUTH_UNAVAILABLE",
		});
		expect(fetch).toHaveBeenCalledTimes(1);
		for (let n = 0; n < 49; n++) {
			vi.setSystemTime(Date.now() + 60_000);
			expect(
				await t.mutation(internal.phone_auth.reserveSend, {
					phoneKey: `timeout-${n}`,
				}),
			).toMatchObject({ ok: true });
		}
		expect(
			await t.mutation(internal.phone_auth.reserveSend, {
				phoneKey: "no-refund",
			}),
		).toMatchObject({ ok: false, code: "PHONE_AUTH_MONTHLY_LIMIT" });
	});

	test.each([
		{ date_created: "invalid" },
		{ date_created: "2099-01-01T00:00:00Z" },
		{ channel: "email" },
	])("rejects malformed start correlation %#", async (fields) => {
		const t = backend();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValueOnce(provider("pending", fields)),
		);
		const response = await post(t, "/phone-number/send-otp", {
			phoneNumber: PHONE,
		});
		expect(await response.json()).toMatchObject({
			code: "PHONE_AUTH_UNAVAILABLE",
		});
	});

	test("returning verified sign-in resolves the same account instead of making another", async () => {
		const t = backend();
		const secondSid = `VE${"7".repeat(32)}`;
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(provider())
				.mockResolvedValueOnce(provider("approved"))
				.mockResolvedValueOnce(provider("pending", { sid: secondSid }))
				.mockResolvedValueOnce(provider("approved", { sid: secondSid })),
		);
		for (let n = 0; n < 2; n++) {
			expect(
				(await post(t, "/phone-number/send-otp", { phoneNumber: PHONE })).ok,
			).toBe(true);
			expect(
				(
					await post(t, "/phone-number/verify", {
						phoneNumber: PHONE,
						code: "000000",
					})
				).ok,
			).toBe(true);
			vi.setSystemTime(Date.now() + 31_000);
		}
		const users = await t.query(components.betterAuth.adapter.findMany, {
			model: "user",
			paginationOpts: { cursor: null, numItems: 5 },
		});
		expect(users.page).toHaveLength(1);
	});
});

describe("transactional reservations and bounded challenges", () => {
	test("uncertain resends retain SID/expiry; first-observed provider creation time also bounds an uncertain initial start", async () => {
		for (const initialKnown of [true, false]) {
			const t = backend();
			const phoneKey = "uncertain-fixture";
			const original = Date.now();
			const first = await t.mutation(internal.phone_auth.reserveSend, {
				phoneKey,
			});
			if (!first.ok) throw Error("fixture start failed");
			await t.mutation(internal.phone_auth.finishSend, {
				id: first.id,
				generation: first.generation,
				...(initialKnown
					? { verificationSid: SID, providerCreatedAt: original }
					: {}),
			});
			if (initialKnown) {
				vi.setSystemTime(Date.now() + 31_000);
				const uncertain = await t.mutation(internal.phone_auth.reserveSend, {
					phoneKey,
				});
				if (!uncertain.ok) throw Error("fixture resend failed");
				await t.mutation(internal.phone_auth.finishSend, {
					id: uncertain.id,
					generation: uncertain.generation,
				});
				expect(
					(await t.run((ctx) => ctx.db.get("phoneChallenges", first.id)))
						?.verificationSid,
				).toBe(SID);
			}
			vi.setSystemTime(Date.now() + 31_000);
			const resent = await t.mutation(internal.phone_auth.reserveSend, {
				phoneKey,
			});
			if (!resent.ok) throw Error("fixture retry failed");
			expect(
				await t.mutation(internal.phone_auth.finishSend, {
					id: resent.id,
					generation: resent.generation,
					verificationSid: SID,
					providerCreatedAt: original,
				}),
			).toBe(true);
			expect(
				(await t.run((ctx) => ctx.db.get("phoneChallenges", first.id)))
					?.expiresAt,
			).toBe(original + 600_000);
			vi.setSystemTime(original + 600_001);
			expect(
				await t.mutation(internal.phone_auth.reserveCheck, { phoneKey }),
			).toMatchObject({ ok: false, code: "PHONE_AUTH_INVALID_CODE" });
		}
	});

	test("expired and superseded approved completions cannot consume a newer challenge", async () => {
		const t = backend();
		const phoneKey = "stale-check-fixture";
		const first = await t.mutation(internal.phone_auth.reserveSend, {
			phoneKey,
		});
		if (!first.ok) throw Error("fixture start failed");
		await t.mutation(internal.phone_auth.finishSend, {
			id: first.id,
			generation: first.generation,
			verificationSid: SID,
			providerCreatedAt: Date.now(),
		});
		const check = await t.mutation(internal.phone_auth.reserveCheck, {
			phoneKey,
		});
		if (!check.ok) throw Error("fixture check failed");
		vi.setSystemTime(Date.now() + 31_000);
		const completion = {
			id: check.id,
			generation: check.generation,
			approved: true,
			available: true,
		};
		expect(await t.mutation(internal.phone_auth.finishCheck, completion)).toBe(
			false,
		);
		const replacement = await t.mutation(internal.phone_auth.reserveSend, {
			phoneKey,
		});
		if (!replacement.ok) throw Error("fixture replacement failed");
		expect(await t.mutation(internal.phone_auth.finishCheck, completion)).toBe(
			false,
		);
		await t.mutation(internal.phone_auth.finishSend, {
			id: replacement.id,
			generation: replacement.generation,
			verificationSid: `VE${"5".repeat(32)}`,
			providerCreatedAt: Date.now(),
		});
		const next = await t.mutation(internal.phone_auth.reserveCheck, {
			phoneKey,
		});
		if (!next.ok) throw Error("fixture replacement check failed");
		vi.setSystemTime(Date.now() + 600_001);
		expect(
			await t.mutation(internal.phone_auth.finishCheck, {
				id: next.id,
				generation: next.generation,
				approved: true,
				available: true,
			}),
		).toBe(false);
	});

	test("unknown phones cannot create check state", async () => {
		const t = backend();
		expect(
			await t.mutation(internal.phone_auth.reserveCheck, {
				phoneKey: "unknown-fixture",
			}),
		).toMatchObject({ ok: false });
		expect(
			await t.run((ctx) => ctx.db.query("phoneChallenges").take(1)),
		).toEqual([]);
	});

	test("one remaining monthly slot cannot be taken twice; failures count, UTC month rollover is automatic", async () => {
		const t = backend();
		for (let n = 0; n < 49; n++) {
			expect(
				await t.mutation(internal.phone_auth.reserveSend, {
					phoneKey: `fixture-${n}`,
				}),
			).toMatchObject({ ok: true });
			vi.setSystemTime(Date.now() + 60_000);
		}
		const results = await Promise.all(
			Array.from({ length: 8 }, (_, n) =>
				t.mutation(internal.phone_auth.reserveSend, { phoneKey: `last-${n}` }),
			),
		);
		expect(results.filter((r) => r.ok)).toHaveLength(1);
		expect(results.filter((r) => !r.ok)).toHaveLength(7);
		vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
		expect(
			await t.mutation(internal.phone_auth.reserveSend, {
				phoneKey: "new-month",
			}),
		).toMatchObject({ ok: true });
	});

	test("serialises starts/checks, rejects stale completions, bounds attempts and preserves resend expiry", async () => {
		const t = backend();
		const phoneKey = "synthetic-digest";
		const first = await t.mutation(internal.phone_auth.reserveSend, {
			phoneKey,
		});
		if (!first.ok) throw Error("fixture reservation failed");
		expect(
			await t.mutation(internal.phone_auth.reserveSend, { phoneKey }),
		).toMatchObject({ ok: false });
		await t.mutation(internal.phone_auth.finishSend, {
			id: first.id,
			generation: first.generation,
			verificationSid: SID,
			providerCreatedAt: Date.now(),
		});
		const initial = await t.run((ctx) =>
			ctx.db.get("phoneChallenges", first.id),
		);
		vi.setSystemTime(Date.now() + 31_000);
		const resend = await t.mutation(internal.phone_auth.reserveSend, {
			phoneKey,
		});
		if (!resend.ok) throw Error("fixture resend failed");
		expect(
			await t.mutation(internal.phone_auth.finishSend, {
				id: first.id,
				generation: first.generation,
				verificationSid: SID,
				providerCreatedAt: Date.now(),
			}),
		).toBe(false);
		await t.mutation(internal.phone_auth.finishSend, {
			id: resend.id,
			generation: resend.generation,
			verificationSid: SID,
			providerCreatedAt: Date.now(),
		});
		expect(
			(await t.run((ctx) => ctx.db.get("phoneChallenges", first.id)))
				?.expiresAt,
		).toBe(initial?.expiresAt);
		for (let n = 0; n < 5; n++) {
			const check = await t.mutation(internal.phone_auth.reserveCheck, {
				phoneKey,
			});
			if (!check.ok) throw Error("fixture check failed");
			expect(
				await t.mutation(internal.phone_auth.reserveCheck, { phoneKey }),
			).toMatchObject({ ok: false });
			await t.mutation(internal.phone_auth.finishCheck, {
				id: check.id,
				generation: check.generation,
				approved: false,
				available: true,
			});
			vi.setSystemTime(Date.now() + 3_000);
		}
		expect(
			await t.mutation(internal.phone_auth.reserveCheck, { phoneKey }),
		).toMatchObject({ ok: false, code: "PHONE_AUTH_INVALID_CODE" });
		vi.setSystemTime(Date.now() + 600_000);
		expect(
			await t.mutation(internal.phone_auth.reserveCheck, { phoneKey }),
		).toMatchObject({ ok: false });
	});
});
