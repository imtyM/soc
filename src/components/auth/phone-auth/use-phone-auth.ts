import { useEffect, useRef, useState } from "react";
import z from "zod";
import { useAppForm } from "~/components/form";
import {
	GENERIC_ERROR_MESSAGE,
	getPublicErrorMessage,
} from "~/lib/public-error";
import { canonicalPhoneNumber } from "../../../../convex/phone_numbers";

type Result = { error?: unknown; data?: unknown };
export type PhoneAuthActions = {
	sendOtp: (input: { phoneNumber: string }) => Promise<Result>;
	verifyOtp: (input: { phoneNumber: string; code: string }) => Promise<Result>;
	onSignedIn: () => void;
};
export type AuthFeedbackValue = {
	kind: "error" | "status";
	text: string;
};
export type FormFeedback = {
	feedback: AuthFeedbackValue | null;
	onMessage: (message: string | null, kind?: AuthFeedbackValue["kind"]) => void;
};
const phoneSchema = z.object({
	phoneNumber: z
		.string()
		.trim()
		.refine(
			(value) => canonicalPhoneNumber(value) !== null,
			"Enter a valid South African phone number starting with +27.",
		),
});
const phoneDefaults: z.infer<typeof phoneSchema> = { phoneNumber: "" };
const codeSchema = z.object({
	code: z
		.string()
		.trim()
		.regex(/^\d{6}$/, "Enter the six-digit code."),
});
const codeDefaults: z.infer<typeof codeSchema> = { code: "" };

export function usePhoneNumberForm({
	sendOtp,
	onOtpSent,
	onMessage,
}: Pick<PhoneAuthActions, "sendOtp"> &
	FormFeedback & { onOtpSent: (phone: string) => void }) {
	return useAppForm({
		defaultValues: phoneDefaults,
		validators: { onSubmit: phoneSchema },
		onSubmit: async ({ value }) => {
			onMessage(null);
			const phoneNumber = canonicalPhoneNumber(value.phoneNumber);
			if (!phoneNumber) return;
			try {
				const result = await sendOtp({ phoneNumber });
				if (result.error) return onMessage(getPublicErrorMessage(result.error));
				if (!sent(result.data)) return onMessage(GENERIC_ERROR_MESSAGE);
				onOtpSent(phoneNumber);
			} catch (error) {
				onMessage(getPublicErrorMessage(error));
			}
		},
	});
}

export function useOtpForm({
	phoneNumber,
	sendOtp,
	verifyOtp,
	onSignedIn,
	onMessage,
}: PhoneAuthActions & FormFeedback & { phoneNumber: string }) {
	const pending = useRef(false);
	const [isResending, setIsResending] = useState(false);
	const form = useAppForm({
		defaultValues: codeDefaults,
		validators: { onSubmit: codeSchema },
		onSubmit: async ({ value }) => {
			if (pending.current) return;
			pending.current = true;
			onMessage(null);
			try {
				const result = await verifyOtp({ phoneNumber, code: value.code });
				if (result.error) return onMessage(getPublicErrorMessage(result.error));
				if (!signedIn(result.data)) return onMessage(GENERIC_ERROR_MESSAGE);
				onMessage("Phone number verified. You are signed in.", "status");
				onSignedIn();
			} catch (error) {
				onMessage(getPublicErrorMessage(error));
			} finally {
				pending.current = false;
			}
		},
	});
	async function handleResend() {
		if (pending.current || form.state.isSubmitting) return;
		pending.current = true;
		setIsResending(true);
		onMessage(null);
		try {
			const result = await sendOtp({ phoneNumber });
			if (result.error) return onMessage(getPublicErrorMessage(result.error));
			if (!sent(result.data)) return onMessage(GENERIC_ERROR_MESSAGE);
			form.reset();
			onMessage(
				"SMS requested. Check your phone; resends may contain the same code.",
				"status",
			);
		} catch (error) {
			onMessage(getPublicErrorMessage(error));
		} finally {
			pending.current = false;
			setIsResending(false);
		}
	}
	return { form, isResending, handleResend };
}

export function usePhoneAuthFlow() {
	const [phone, setPhone] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<AuthFeedbackValue | null>(null);
	const stepRef = useRef<HTMLDivElement>(null);
	const previousPhone = useRef(phone);
	useEffect(() => {
		if (previousPhone.current !== phone) {
			stepRef.current?.querySelector<HTMLInputElement>("input")?.focus();
			previousPhone.current = phone;
		}
	}, [phone]);
	return {
		phone,
		feedback,
		stepRef,
		onMessage: (
			text: string | null,
			kind: AuthFeedbackValue["kind"] = "error",
		) => setFeedback(text === null ? null : { kind, text }),
		onOtpSent: (value: string) => {
			setPhone(value);
			setFeedback(null);
		},
		onBack: () => {
			setPhone(null);
			setFeedback(null);
		},
	};
}

function sent(data: unknown) {
	return (
		typeof data === "object" &&
		data !== null &&
		"message" in data &&
		data.message === "code sent"
	);
}
function signedIn(data: unknown) {
	return (
		typeof data === "object" &&
		data !== null &&
		"status" in data &&
		data.status === true &&
		"token" in data &&
		typeof data.token === "string" &&
		data.token.length > 0
	);
}
