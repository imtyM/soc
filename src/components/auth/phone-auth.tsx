/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { useState } from "react";
import z from "zod";
import { useAppForm } from "~/components/form";
import { Button } from "~/components/ui/button";
import { FieldGroup } from "~/components/ui/field";
import { phoneAuthClient } from "~/lib/auth-client";
import { getPublicErrorMessage } from "~/lib/public-error";

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

type PhoneAuthActions = {
	sendOtp: (input: { phoneNumber: string }) => Promise<{ error?: unknown }>;
	verifyOtp: (input: {
		phoneNumber: string;
		code: string;
	}) => Promise<{ error?: unknown }>;
	onSignedIn: () => void;
};

export function PhoneAuth() {
	return (
		<PhoneAuthContent
			sendOtp={(input) => phoneAuthClient.phoneNumber.sendOtp(input)}
			verifyOtp={(input) => phoneAuthClient.phoneNumber.verify(input)}
			onSignedIn={() => window.location.reload()}
		/>
	);
}

export function PhoneAuthContent({
	sendOtp,
	verifyOtp,
	onSignedIn,
}: PhoneAuthActions) {
	const [step, setStep] = useState<AuthStep>({ kind: "phone" });
	const [message, setMessage] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-6">
			{step.kind === "phone" ? (
				<PhoneNumberForm
					sendOtp={sendOtp}
					onOtpSent={(phoneNumber) => {
						setStep({ kind: "otp", phoneNumber });
						setMessage("OTP generated. Copy it from the Convex function logs.");
					}}
					onMessage={setMessage}
				/>
			) : (
				<OtpForm
					phoneNumber={step.phoneNumber}
					verifyOtp={verifyOtp}
					onSignedIn={onSignedIn}
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
	sendOtp,
	onOtpSent,
	onMessage,
}: {
	sendOtp: PhoneAuthActions["sendOtp"];
	onOtpSent: (phoneNumber: string) => void;
	onMessage: (message: string | null) => void;
}) {
	const form = useAppForm({
		defaultValues: phoneNumberDefaultValues,
		validators: { onSubmit: phoneNumberSchema },
		onSubmit: async ({ value }) => {
			onMessage(null);
			const phoneNumber = normalizePhoneNumber(value.phoneNumber);
			try {
				const result = await sendOtp({ phoneNumber });
				if (result.error) {
					onMessage(getPublicErrorMessage(result.error));
					return;
				}

				onOtpSent(phoneNumber);
			} catch (error) {
				onMessage(getPublicErrorMessage(error));
			}
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!form.state.isSubmitting) {
					void form.handleSubmit();
				}
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
					<form.SubmitButton label="Generate OTP" pendingLabel="Generating…" />
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}

function OtpForm({
	phoneNumber,
	verifyOtp,
	onSignedIn,
	onBack,
	onMessage,
}: {
	phoneNumber: string;
	verifyOtp: PhoneAuthActions["verifyOtp"];
	onSignedIn: PhoneAuthActions["onSignedIn"];
	onBack: () => void;
	onMessage: (message: string | null) => void;
}) {
	const form = useAppForm({
		defaultValues: otpDefaultValues,
		validators: { onSubmit: otpSchema },
		onSubmit: async ({ value }) => {
			onMessage(null);
			try {
				const result = await verifyOtp({ phoneNumber, code: value.code });
				if (result.error) {
					onMessage(getPublicErrorMessage(result.error));
					return;
				}

				onMessage("Phone number verified. You are signed in.");
				onSignedIn();
			} catch (error) {
				onMessage(getPublicErrorMessage(error));
			}
		},
	});

	return (
		<div className="flex flex-col gap-4">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (!form.state.isSubmitting) {
						void form.handleSubmit();
					}
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
						<form.SubmitButton
							label="Verify and sign in"
							pendingLabel="Verifying…"
						/>
					</FieldGroup>
				</form.AppForm>
			</form>
			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button
						type="button"
						variant="ghost"
						disabled={isSubmitting}
						onClick={onBack}
					>
						Use another number
					</Button>
				)}
			</form.Subscribe>
		</div>
	);
}

function normalizePhoneNumber(phoneNumber: string) {
	return phoneNumber.replace(/[^\d+]/g, "");
}

function isValidPhoneNumber(phoneNumber: string) {
	return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(phoneNumber));
}
