/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { Button } from "~/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "~/components/ui/field";
import {
	type OrganisationFormProps,
	useOrganisationForm,
} from "./use-organisation-form";

export function OrganisationForm(props: OrganisationFormProps) {
	const { form, error } = useOrganisationForm(props);
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
						<fieldset disabled={pending} className="flex flex-col gap-4">
							<legend className="font-medium">
								{props.entry ? "Edit organisation" : "New organisation"}
							</legend>
							<FieldGroup>
								<form.AppField
									name="name"
									children={(field) => (
										<field.FormInput label="Organisation name" />
									)}
								/>
								<form.AppField
									name="description"
									children={(field) => (
										<field.FormTextarea
											label="Public description"
											description="Describe the organisation as a whole; no private data or unsupported assurance claims."
										/>
									)}
								/>
								<FieldSet>
									<FieldLegend variant="label">Catalogue status</FieldLegend>
									<FieldGroup>
										<form.AppField
											name="isSynthetic"
											children={(field) => (
												<field.FormCheckbox
													label="Synthetic example"
													description="Clearly labelled, not a real recipient."
												/>
											)}
										/>
										<form.AppField
											name="isReady"
											children={(field) => (
												<field.FormCheckbox
													label="Listed as ready"
													description="For real entries, SOC approval and receiving readiness must already be established separately."
												/>
											)}
										/>
									</FieldGroup>
								</FieldSet>
								<form.FormErrors />
								{error ? (
									<p role="alert" className="text-sm text-destructive">
										{error}
									</p>
								) : null}
								<form.SubmitButton
									label={props.entry ? "Save changes" : "Create organisation"}
									pendingLabel="Saving…"
								/>
								<Button type="button" variant="ghost" onClick={props.onClose}>
									Close editor
								</Button>
							</FieldGroup>
						</fieldset>
					)}
				</form.Subscribe>
			</form.AppForm>
		</form>
	);
}
