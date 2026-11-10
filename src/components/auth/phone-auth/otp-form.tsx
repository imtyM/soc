/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { Button } from "~/components/ui/button";
import { FieldGroup } from "~/components/ui/field";
import { AuthFeedback } from "./auth-feedback";
import {
	type FormFeedback,
	type PhoneAuthActions,
	useOtpForm,
} from "./use-phone-auth";

export function OtpForm({
	onBack,
	...props
}: PhoneAuthActions &
	FormFeedback & { phoneNumber: string; onBack: () => void }) {
	const { form, isResending, handleResend } = useOtpForm(props);
	return (
		<form.AppForm>
			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(pending) => (
					<fieldset
						disabled={pending || isResending}
						className="flex flex-col gap-4"
					>
						<h2 className="text-base font-medium">Check your phone</h2>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								if (!form.state.isSubmitting && !isResending)
									void form.handleSubmit();
							}}
						>
							<FieldGroup className="gap-4">
								<form.AppField
									name="code"
									children={(field) => (
										<field.FormInput
											label="One-time password"
											type="text"
											inputMode="numeric"
											autoComplete="one-time-code"
											placeholder="123456"
											description={`Sent to ${props.phoneNumber}. Codes expire after 10 minutes.`}
										/>
									)}
								/>
								<form.FormErrors />
								<AuthFeedback feedback={props.feedback} />
								<form.SubmitButton
									label="Verify and sign in"
									pendingLabel="Verifying…"
								/>
							</FieldGroup>
						</form>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Button
								type="button"
								variant="link"
								size="xs"
								className="px-0"
								aria-busy={isResending}
								onClick={() => void handleResend()}
							>
								{isResending ? "Sending…" : "Resend SMS code"}
							</Button>
							<Button
								type="button"
								variant="link"
								size="xs"
								className="px-0"
								onClick={onBack}
							>
								Use another number
							</Button>
						</div>
						<p className="text-xs leading-relaxed text-muted-foreground">
							Wait at least 30 seconds before resending. A resend may reuse your
							current code and does not extend its expiry.
						</p>
					</fieldset>
				)}
			</form.Subscribe>
		</form.AppForm>
	);
}
