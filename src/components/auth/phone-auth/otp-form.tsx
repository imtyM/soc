/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { Button } from "~/components/ui/button";
import { FieldGroup } from "~/components/ui/field";
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
						<form
							onSubmit={(event) => {
								event.preventDefault();
								if (!form.state.isSubmitting && !isResending)
									void form.handleSubmit();
							}}
						>
							<FieldGroup>
								<form.AppField
									name="code"
									children={(field) => (
										<field.FormInput
											label="One-time password"
											type="text"
											autoComplete="one-time-code"
											placeholder="123456"
											description={`Sent to ${props.phoneNumber}. Codes expire after 10 minutes.`}
										/>
									)}
								/>
								<form.FormErrors />
								<form.SubmitButton
									label="Verify and sign in"
									pendingLabel="Verifying…"
								/>
							</FieldGroup>
						</form>
						<p className="text-sm text-muted-foreground">
							Wait at least 30 seconds before resending. A resend may reuse your
							current code.
						</p>
						<Button
							type="button"
							variant="outline"
							aria-busy={isResending}
							onClick={() => void handleResend()}
						>
							{isResending ? "Sending…" : "Resend SMS code"}
						</Button>
						<Button type="button" variant="ghost" onClick={onBack}>
							Use another number
						</Button>
					</fieldset>
				)}
			</form.Subscribe>
		</form.AppForm>
	);
}
