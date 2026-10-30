export const PHONE_AUTH_ERRORS = {
	PHONE_AUTH_UNAVAILABLE:
		"SMS sign-in is temporarily unavailable. Please try again later.",
	PHONE_AUTH_INVALID_PHONE:
		"Enter a valid South African phone number starting with +27.",
	PHONE_AUTH_INVALID_CODE:
		"This code could not be verified. Check it or request a new code.",
	PHONE_AUTH_THROTTLED: "Please wait before trying again.",
	PHONE_AUTH_MONTHLY_LIMIT:
		"The app's monthly SMS allowance has been reached. Please try again next month.",
	PHONE_AUTH_UNSUPPORTED:
		"This sign-in or account-change method is not available.",
} as const;

export type PhoneAuthErrorCode = keyof typeof PHONE_AUTH_ERRORS;
