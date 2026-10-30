import { useState } from "react";
import { phoneAuthClient } from "~/lib/auth-client";
import { OtpForm } from "./otp-form";
import { PhoneNumberForm } from "./phone-number-form";
import type { PhoneAuthActions } from "./use-phone-auth";

export function PhoneAuth() {
	return (
		<PhoneAuthContent
			sendOtp={(input) => phoneAuthClient.phoneNumber.sendOtp(input)}
			verifyOtp={(input) => phoneAuthClient.phoneNumber.verify(input)}
			onSignedIn={() => window.location.reload()}
		/>
	);
}

export function PhoneAuthContent(actions: PhoneAuthActions) {
	const [phone, setPhone] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	return (
		<div className="flex flex-col gap-6">
			{phone === null ? (
				<PhoneNumberForm
					sendOtp={actions.sendOtp}
					onMessage={setMessage}
					onOtpSent={(value) => {
						setPhone(value);
						setMessage(
							"SMS requested. Check your phone for your sign-in code.",
						);
					}}
				/>
			) : (
				<OtpForm
					{...actions}
					phoneNumber={phone}
					onMessage={setMessage}
					onBack={() => {
						setPhone(null);
						setMessage(null);
					}}
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
