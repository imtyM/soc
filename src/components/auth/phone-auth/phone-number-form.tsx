/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { FieldGroup } from "~/components/ui/field";
import { AuthFeedback } from "./auth-feedback";
import {
	type FormFeedback,
	type PhoneAuthActions,
	usePhoneNumberForm,
} from "./use-phone-auth";

export function PhoneNumberForm(
	props: Pick<PhoneAuthActions, "sendOtp"> &
		FormFeedback & { onOtpSent: (phone: string) => void },
) {
	const form = usePhoneNumberForm(props);
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!form.state.isSubmitting) void form.handleSubmit();
			}}
		>
			<form.AppForm>
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(pending) => (
						<fieldset disabled={pending}>
							<FieldGroup className="gap-4">
								<form.AppField
									name="phoneNumber"
									children={(field) => (
										<field.FormInput
											label="Phone number"
											type="tel"
											autoComplete="tel"
											placeholder="+27 82 123 4567"
											description="South African numbers only (+27). No password needed."
										/>
									)}
								/>
								<form.FormErrors />
								<AuthFeedback feedback={props.feedback} />
								<form.SubmitButton
									label="Send SMS code"
									pendingLabel="Sending…"
								/>
							</FieldGroup>
						</fieldset>
					)}
				</form.Subscribe>
			</form.AppForm>
		</form>
	);
}
