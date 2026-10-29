import { FieldError, FieldGroup } from "~/components/ui/field";
import { type RoleFormProps, roleOptions, useRoleForm } from "./use-role-form";

export function RoleForm(props: RoleFormProps) {
	const { form, error } = useRoleForm(props);
	return (
		<div className="flex max-w-md flex-col gap-3">
			<p>Verified account: {props.account.phoneNumber}</p>
			<p className="text-sm text-muted-foreground">
				Current role: {props.account.role}
			</p>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (!form.state.isSubmitting) void form.handleSubmit();
				}}
			>
				<form.AppForm>
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<fieldset
								disabled={isSubmitting}
								aria-busy={isSubmitting}
								aria-label="Change account role"
								className="min-w-0 border-0 p-0"
							>
								<FieldGroup>
									<form.AppField name="role">
										{(field) => (
											<field.FormSelect
												label="Account role"
												options={roleOptions}
											/>
										)}
									</form.AppField>
									<form.SubmitButton
										label="Save role"
										pendingLabel="Saving role…"
									/>
									<FieldError>{error}</FieldError>
								</FieldGroup>
							</fieldset>
						)}
					</form.Subscribe>
				</form.AppForm>
			</form>
		</div>
	);
}
