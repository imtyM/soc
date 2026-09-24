import { ConvexError } from "convex/values";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function getPublicErrorMessage(error: unknown) {
	if (error instanceof ConvexError && isPublicErrorData(error.data)) {
		return error.data.message;
	}

	return GENERIC_ERROR_MESSAGE;
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
