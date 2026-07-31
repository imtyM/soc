/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import z from "zod";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormCheckbox",
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				agreed: false,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="agreed"
						children={(field) => (
							<field.FormCheckbox label="I agree to the terms and conditions" />
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.agreed,
							errors: state.fieldMeta.agreed?.errors || [],
							isTouched: state.fieldMeta.agreed?.isTouched || false,
							isValid: state.fieldMeta.agreed?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const WithDescription: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				marketing: false,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="marketing"
						children={(field) => (
							<field.FormCheckbox
								label="Subscribe to marketing emails"
								description="Receive updates about new plans and special offers"
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.marketing,
							errors: state.fieldMeta.marketing?.errors || [],
							isTouched: state.fieldMeta.marketing?.isTouched || false,
							isValid: state.fieldMeta.marketing?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const WithValidation: Story = {
	render: () => {
		const schema = z.object({
			terms: z
				.boolean()
				.refine((val) => val === true, "You must accept the terms"),
		});

		const form = useAppForm({
			defaultValues: {
				terms: false,
			},
			validators: {
				onChange: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="terms"
						children={(field) => (
							<field.FormCheckbox
								label="I accept the terms and conditions"
								description="Required to proceed with registration"
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.terms,
							errors: state.fieldMeta.terms?.errors || [],
							isTouched: state.fieldMeta.terms?.isTouched || false,
							isValid: state.fieldMeta.terms?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const MultipleCheckboxes: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				notifications: false,
				marketing: false,
				newsletter: false,
				sms: false,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<div className="space-y-4">
						<div>
							<h3 className="text-sm font-medium mb-3">
								Communication Preferences
							</h3>
							<div className="space-y-3">
								<form.AppField
									name="notifications"
									children={(field) => (
										<field.FormCheckbox
											label="Push notifications"
											description="Receive push notifications about your account"
										/>
									)}
								/>
								<form.AppField
									name="marketing"
									children={(field) => (
										<field.FormCheckbox
											label="Marketing emails"
											description="Receive marketing emails about new features"
										/>
									)}
								/>
								<form.AppField
									name="newsletter"
									children={(field) => (
										<field.FormCheckbox
											label="Weekly newsletter"
											description="Get our weekly newsletter with tips and updates"
										/>
									)}
								/>
								<form.AppField
									name="sms"
									children={(field) => (
										<field.FormCheckbox
											label="SMS notifications"
											description="Receive important updates via SMS"
										/>
									)}
								/>
							</div>
						</div>
					</div>
					<FormStateInspector
						title="Form Values"
						selector={(state) => state.values}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const BooleanStates: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				isActive: true,
				completed: false,
				verified: true,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="isActive"
						children={(field) => (
							<field.FormCheckbox
								label="Active Plan"
								description="Plan is currently active"
							/>
						)}
					/>
					<form.AppField
						name="completed"
						children={(field) => (
							<field.FormCheckbox
								label="Completed"
								description="Mark as completed"
							/>
						)}
					/>
					<form.AppField
						name="verified"
						children={(field) => (
							<field.FormCheckbox
								label="Verified"
								description="Account has been verified"
							/>
						)}
					/>
					<FormStateInspector
						title="Form Values"
						selector={(state) => state.values}
					/>
				</form.AppForm>
			</div>
		);
	},
};
