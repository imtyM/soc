/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import z from "zod";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormRadioGroup",
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const planOptions = [
	{ value: "free", label: "Free" },
	{ value: "pro", label: "Pro" },
	{ value: "enterprise", label: "Enterprise" },
];

export const Default: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				plan: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="plan"
						children={(field) => (
							<field.FormRadioGroup
								label="Plan"
								description="Choose your plan"
								options={planOptions}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.plan,
							errors: state.fieldMeta.plan?.errors || [],
							isTouched: state.fieldMeta.plan?.isTouched || false,
							isValid: state.fieldMeta.plan?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const CardVariant: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				hasAccount: "",
			},
		});

		return (
			<div className="w-[640px] space-y-4">
				<form.AppForm>
					<form.AppField
						name="hasAccount"
						children={(field) => (
							<field.FormRadioGroup
								variant="card"
								options={[
									{ value: "yes", label: "YES" },
									{ value: "no", label: "NOPE" },
								]}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.hasAccount,
							errors: state.fieldMeta.hasAccount?.errors || [],
							isTouched: state.fieldMeta.hasAccount?.isTouched || false,
							isValid: state.fieldMeta.hasAccount?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const CardWithValidation: Story = {
	render: () => {
		const schema = z.object({
			choice: z.string().min(1, "Please make a selection"),
		});

		const form = useAppForm({
			defaultValues: {
				choice: "",
			},
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-[640px] space-y-4">
				<form.AppForm>
					<form.AppField
						name="choice"
						children={(field) => (
							<field.FormRadioGroup
								label="Coverage Type"
								variant="card"
								options={[
									{ value: "individual", label: "Individual" },
									{ value: "family", label: "Family" },
									{ value: "couple", label: "Couple" },
								]}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.choice,
							errors: state.fieldMeta.choice?.errors || [],
							isTouched: state.fieldMeta.choice?.isTouched || false,
							isValid: state.fieldMeta.choice?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};
