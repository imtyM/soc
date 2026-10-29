import { z } from "zod";
import { useAppForm } from "~/components/form";
import { FieldGroup } from "~/components/ui/field";

const schema = z.object({
	phoneNumber: z
		.string()
		.trim()
		.regex(
			/^\+[1-9]\d{7,14}$/,
			"Enter a full international phone number beginning with +.",
		),
});
const defaultValues: z.infer<typeof schema> = { phoneNumber: "" };

export function PhoneLookupForm({
	onLookup,
}: {
	onLookup: (phone: string) => void;
}) {
	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: schema },
		onSubmit: ({ value }) => onLookup(value.phoneNumber.trim()),
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
					<form.AppField name="phoneNumber">
						{(field) => (
							<field.FormInput
								label="Verified phone number"
								type="tel"
								autoComplete="off"
								description="Use the complete international number, including country code."
							/>
						)}
					</form.AppField>
					<form.SubmitButton
						label="Look up account"
						pendingLabel="Looking up…"
					/>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
