import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// Numbering-plan validation is not proof of ownership or SMS reachability.
export function canonicalPhoneNumber(value: string): string | null {
	if (value.length > 40 || !value.trim().startsWith("+27")) return null;
	const phone = parsePhoneNumberFromString(value.trim(), { extract: false });
	return phone?.country === "ZA" && !phone.ext && phone.isValid()
		? phone.number
		: null;
}
