import { phoneAuthClient } from "~/lib/auth-client";
import { OtpForm } from "./otp-form";
import { PhoneNumberForm } from "./phone-number-form";
import { type PhoneAuthActions, usePhoneAuthFlow } from "./use-phone-auth";

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
	const flow = usePhoneAuthFlow();
	return (
		<div ref={flow.stepRef} className="flex min-w-0 flex-col gap-4">
			{flow.phone === null ? (
				<PhoneNumberForm
					sendOtp={actions.sendOtp}
					feedback={flow.feedback}
					onMessage={flow.onMessage}
					onOtpSent={flow.onOtpSent}
				/>
			) : (
				<OtpForm
					{...actions}
					phoneNumber={flow.phone}
					feedback={flow.feedback}
					onMessage={flow.onMessage}
					onBack={flow.onBack}
				/>
			)}
		</div>
	);
}
