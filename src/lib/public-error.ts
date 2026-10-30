import { ConvexError } from "convex/values";
import { PHONE_AUTH_ERRORS } from "../../convex/phone_auth_errors";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function getPublicErrorMessage(error: unknown) {
	if (error instanceof ConvexError && isPublicErrorData(error.data)) {
		return error.data.message;
	}

	if (
		error !== null &&
		typeof error === "object" &&
		"code" in error &&
		typeof error.code === "string" &&
		isPhoneAuthCode(error.code)
	) {
		return PHONE_AUTH_ERRORS[error.code];
	}
	return GENERIC_ERROR_MESSAGE;
}

function isPhoneAuthCode(code: string): code is keyof typeof PHONE_AUTH_ERRORS {
	return Object.hasOwn(PHONE_AUTH_ERRORS, code);
}

function isPublicErrorData(
	value: unknown,
): value is { code: string; message: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		"code" in value &&
		typeof value.code === "string" &&
		value.code.trim().length > 0 &&
		"message" in value &&
		typeof value.message === "string" &&
		value.message.trim().length > 0
	);
}
