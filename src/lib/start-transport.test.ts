import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { isSsrResponse } from "@tanstack/router-core/ssr/server";
import { requestHandler } from "@tanstack/start-server-core/request-response";
import { fromJSON, toJSON } from "seroval";
import { afterEach, describe, expect, test, vi } from "vitest";

const fixtureOrigin = "https://soc.example.test";
const fixtureAuthOrigin = "https://auth.example.test";
const fixtureAuth = convexBetterAuthReactStart({
	convexUrl: "https://data.example.test",
	convexSiteUrl: fixtureAuthOrigin,
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Start serialization security regressions", () => {
	test("round-trips the structured values used by the transport", () => {
		const value = {
			date: new Date("2026-01-01T00:00:00Z"),
			bytes: new Uint8Array([1, 2, 3]),
			map: new Map([["fixture", true]]),
		};

		expect(fromJSON(toJSON(value))).toEqual(value);
	});

	// Upstream ac0163e: reject a claimed length beyond the deserialization cap.
	// Mutate a tiny node rather than allocating an oversized source buffer.
	test("rejects an oversized typed-array length in serialized input", () => {
		const payload = toJSON(new Uint8Array([1, 2, 3]));
		Object.assign(payload.t, { l: 1_000_001 });

		expect(() => fromJSON(payload)).toThrow();
	});
});

describe("Start response boundary regressions", () => {
	// Upstream d521abd: only genuine Response instances may cross the boundary.
	test("rejects a response-shaped object in an SSR result", () => {
		expect(
			isSsrResponse({
				response: {
					status: 200,
					headers: { "Content-Type": "text/html" },
					body: "<p>untrusted fixture</p>",
				},
				serverSsrCleanup: "none",
			}),
		).toBe(false);
	});

	test("requires a disposer for streaming SSR responses", () => {
		const response = new Response("fixture");

		expect(isSsrResponse({ response, serverSsrCleanup: "stream" })).toBe(false);
		expect(
			isSsrResponse({ response, serverSsrCleanup: "stream", dispose() {} }),
		).toBe(true);
		expect(isSsrResponse({ response, serverSsrCleanup: "none" })).toBe(true);
	});

	test("does not render a rejected response-shaped payload as HTML", async () => {
		const handler = requestHandler(() =>
			Promise.reject({
				status: 200,
				headers: { "Content-Type": "text/html" },
				body: "<p>untrusted fixture</p>",
			}),
		);

		const response = await handler(new Request(fixtureOrigin), {});

		expect(response.status).toBe(500);
		expect(response.headers.get("Content-Type")).not.toContain("text/html");
		expect(await response.text()).toBe("Internal Server Error");
	});

	test("preserves a legitimate application Response", async () => {
		const handler = requestHandler(async () =>
			Response.json({ fixture: true }, { status: 202 }),
		);

		const response = await handler(new Request(fixtureOrigin), {});

		expect(response.status).toBe(202);
		expect(await response.json()).toEqual({ fixture: true });
	});
});

describe("controlled Start auth-helper compatibility", () => {
	test("reads the unauthenticated token through Start request context", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(Response.json({ token: null }));
		const handler = requestHandler(async () =>
			Response.json({ isAuthenticated: Boolean(await fixtureAuth.getToken()) }),
		);

		const response = await handler(new Request(fixtureOrigin), {});

		expect(await response.json()).toEqual({ isAuthenticated: false });
		expect(fetchMock.mock.calls).toHaveLength(1);
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			`${fixtureAuthOrigin}/api/auth/convex/token`,
		);
		expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
	});

	test.each([
		"GET",
		"POST",
	])("preserves %s auth-proxy forwarding without a network request", async (method) => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("controlled proxy response"));
		const request = new Request(
			`${fixtureOrigin}/api/auth/fixture?mode=controlled`,
			{
				method,
				body: method === "POST" ? "fixture=value" : undefined,
			},
		);

		const response = await fixtureAuth.handler(request);

		expect(await response.text()).toBe("controlled proxy response");
		expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
			`${fixtureAuthOrigin}/api/auth/fixture?mode=controlled`,
			expect.objectContaining({ method, redirect: "manual" }),
		);
	});
});
