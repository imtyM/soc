/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { useState } from "react";
import z from "zod";
import { useAppForm } from "~/components/form";
import { Button } from "~/components/ui/button";
import { FieldGroup } from "~/components/ui/field";
import { phoneAuthClient } from "~/lib/auth-client";

type AuthStep = { kind: "phone" } | { kind: "otp"; phoneNumber: string };

const phoneNumberSchema = z.object({
	phoneNumber: z.string().trim().refine(isValidPhoneNumber, {
		message: "Enter a phone number with a country code, such as +27821234567.",
	}),
});

const phoneNumberDefaultValues: z.infer<typeof phoneNumberSchema> = {
	phoneNumber: "",
};

const otpSchema = z.object({
	code: z
		.string()
		.trim()
		.regex(/^\d{6}$/, "Enter the six-digit OTP."),
});

const otpDefaultValues: z.infer<typeof otpSchema> = {
	code: "",
};

export function PhoneAuth() {
	const [step, setStep] = useState<AuthStep>({ kind: "phone" });
	const [message, setMessage] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-6">
			{step.kind === "phone" ? (
				<PhoneNumberForm
					onOtpSent={(phoneNumber) => {
						setStep({ kind: "otp", phoneNumber });
						setMessage("OTP generated. Copy it from the Convex function logs.");
					}}
					onMessage={setMessage}
				/>
			) : (
				<OtpForm
					phoneNumber={step.phoneNumber}
					onBack={() => {
						setStep({ kind: "phone" });
						setMessage(null);
					}}
					onMessage={setMessage}
				/>
			)}

			{message ? (
				<output className="text-sm text-muted-foreground" aria-live="polite">
					{message}
				</output>
			) : null}
		</div>
	);
}

function PhoneNumberForm({
	onOtpSent,
	onMessage,
}: {
	onOtpSent: (phoneNumber: string) => void;
	onMessage: (message: string | null) => void;
}) {
	const form = useAppForm({
		defaultValues: phoneNumberDefaultValues,
		validators: { onSubmit: phoneNumberSchema },
		onSubmit: async ({ value }) => {
			onMessage(null);
			const phoneNumber = normalizePhoneNumber(value.phoneNumber);
			const result = await phoneAuthClient.phoneNumber.sendOtp({ phoneNumber });

			if (result.error) {
				onMessage(result.error.message ?? "Could not generate the OTP.");
				return;
			}

			onOtpSent(phoneNumber);
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup>
					<form.AppField
						name="phoneNumber"
						children={(field) => (
							<field.FormInput
								label="Phone number"
								type="tel"
								autoComplete="tel"
								placeholder="+27 82 123 4567"
								description="Include the international country code."
							/>
						)}
					/>
					<form.FormErrors />
					<form.SubmitButton label="Generate OTP" />
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}

function OtpForm({
	phoneNumber,
	onBack,
	onMessage,
}: {
	phoneNumber: string;
	onBack: () => void;
	onMessage: (message: string | null) => void;
}) {
	const form = useAppForm({
		defaultValues: otpDefaultValues,
		validators: { onSubmit: otpSchema },
		onSubmit: async ({ value }) => {
			onMessage(null);
			const result = await phoneAuthClient.phoneNumber.verify({
				phoneNumber,
				code: value.code,
			});

			if (result.error) {
				onMessage(result.error.message ?? "The OTP could not be verified.");
				return;
			}

			onMessage("Phone number verified. You are signed in.");
			window.location.reload();
		},
	});

	return (
		<div className="flex flex-col gap-4">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void form.handleSubmit();
				}}
			>
				<form.AppForm>
					<FieldGroup>
						<form.AppField
							name="code"
							children={(field) => (
								<field.FormInput
									label="One-time password"
									type="text"
									autoComplete="one-time-code"
									placeholder="123456"
									description={`Generated for ${phoneNumber}`}
								/>
							)}
						/>
						<form.FormErrors />
						<form.SubmitButton label="Verify and sign in" />
					</FieldGroup>
				</form.AppForm>
			</form>
			<Button type="button" variant="ghost" onClick={onBack}>
				Use another number
			</Button>
		</div>
	);
}

function normalizePhoneNumber(phoneNumber: string) {
	return phoneNumber.replace(/[^\d+]/g, "");
}

function isValidPhoneNumber(phoneNumber: string) {
	return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(phoneNumber));
}
