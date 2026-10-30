import { ConvexError } from "convex/values";
import { describe, expect, test } from "vitest";
import { GENERIC_ERROR_MESSAGE, getPublicErrorMessage } from "./public-error";

const PRIVATE_DETAIL = "session-token=distinctive-private-value";

describe("getPublicErrorMessage", () => {
	test("returns the trusted message from a structured Convex application error", () => {
		const error = new ConvexError({
			code: "TODO_NOT_FOUND",
			message: "Todo not found",
		});

		expect(getPublicErrorMessage(error)).toBe("Todo not found");
	});

	test("maps only owned auth codes, never provider message text", () => {
		expect(
			getPublicErrorMessage({
				code: "PHONE_AUTH_THROTTLED",
				message: PRIVATE_DETAIL,
			}),
		).toBe("Please wait before trying again.");
		expect(
			getPublicErrorMessage({
				code: "OTHER_PROVIDER_CODE",
				message: PRIVATE_DETAIL,
			}),
		).toBe(GENERIC_ERROR_MESSAGE);
		expect(
			getPublicErrorMessage({ code: "__proto__", message: PRIVATE_DETAIL }),
		).toBe(GENERIC_ERROR_MESSAGE);
	});

	test.each([
		new Error(PRIVATE_DETAIL),
		new TypeError(`Failed to fetch: ${PRIVATE_DETAIL}`),
		PRIVATE_DETAIL,
		null,
		undefined,
		{ data: { code: "LOOKALIKE", message: PRIVATE_DETAIL } },
		new ConvexError(PRIVATE_DETAIL),
		new ConvexError({ code: "", message: PRIVATE_DETAIL }),
		new ConvexError({ code: "TODO_ERROR", message: "   " }),
		new ConvexError({ code: "TODO_ERROR" }),
	])("returns the generic fallback for untrusted or malformed value %#", (error) => {
		expect(getPublicErrorMessage(error)).toBe(GENERIC_ERROR_MESSAGE);
		expect(getPublicErrorMessage(error)).not.toContain(PRIVATE_DETAIL);
	});
});
