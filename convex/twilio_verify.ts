export type VerifyConfiguration = {
	accountSid: string;
	keySid: string;
	keySecret: string;
	serviceSid: string;
};

type Verification = {
	sid: string;
	status: "pending" | "approved";
	createdAt?: number;
};

// Deliberately no automatic retries: a timeout may still represent a billed start.
export async function requestVerification(
	config: VerifyConfiguration,
	phone: string,
	check?: { sid: string; code: string },
): Promise<Verification | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 8_000);
	try {
		const body = check
			? new URLSearchParams({ VerificationSid: check.sid, Code: check.code })
			: new URLSearchParams({ To: phone, Channel: "sms" });
		const response = await fetch(
			`https://verify.twilio.com/v2/Services/${config.serviceSid}/${check ? "VerificationCheck" : "Verifications"}`,
			{
				method: "POST",
				redirect: "error",
				signal: controller.signal,
				headers: {
					Authorization: `Basic ${btoa(`${config.keySid}:${config.keySecret}`)}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body,
			},
		);
		if (!response.ok) return null;
		const result: unknown = await response.json();
		if (
			!result ||
			typeof result !== "object" ||
			!("sid" in result) ||
			typeof result.sid !== "string" ||
			!/^VE[0-9a-f]{32}$/i.test(result.sid) ||
			!("account_sid" in result) ||
			result.account_sid !== config.accountSid ||
			!("service_sid" in result) ||
			result.service_sid !== config.serviceSid ||
			!("to" in result) ||
			result.to !== phone ||
			!("channel" in result) ||
			result.channel !== "sms" ||
			!("status" in result) ||
			(check ? result.sid !== check.sid : result.status !== "pending") ||
			(result.status !== "pending" && result.status !== "approved")
		)
			return null;
		let createdAt: number | undefined;
		if (!check) {
			if (
				!("date_created" in result) ||
				typeof result.date_created !== "string"
			)
				return null;
			createdAt = Date.parse(result.date_created);
			if (!Number.isFinite(createdAt) || createdAt > Date.now() + 30_000)
				return null;
		}
		return { sid: result.sid, status: result.status, createdAt };
	} catch {
		// Never expose provider bodies, credentials, recipient, code or raw errors.
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
