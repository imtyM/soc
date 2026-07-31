/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import z from "zod";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormSelect",
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const countryOptions = [
	{ label: "United States", value: "us" },
	{ label: "United Kingdom", value: "uk" },
	{ label: "Canada", value: "ca" },
	{ label: "Australia", value: "au" },
	{ label: "Germany", value: "de" },
];

const providerOptions = [
	{ label: "Discovery Health", value: "discovery" },
	{ label: "Momentum Health", value: "momentum" },
	{ label: "Bonitas", value: "bonitas" },
	{ label: "Fedhealth", value: "fedhealth" },
];

export const Default: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				country: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="country"
						children={(field) => (
							<field.FormSelect
								label="Country"
								placeholder="Select a country..."
								options={countryOptions}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.country,
							errors: state.fieldMeta.country?.errors || [],
							isTouched: state.fieldMeta.country?.isTouched || false,
							isValid: state.fieldMeta.country?.isValid ?? true,
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
				provider: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="provider"
						children={(field) => (
							<field.FormSelect
								label="Medical Aid Provider"
								description="Select your medical aid provider"
								placeholder="Choose provider..."
								options={providerOptions}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.provider,
							errors: state.fieldMeta.provider?.errors || [],
							isTouched: state.fieldMeta.provider?.isTouched || false,
							isValid: state.fieldMeta.provider?.isValid ?? true,
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
			plan: z.string().min(1, "Please select a plan"),
		});

		const form = useAppForm({
			defaultValues: {
				plan: "",
			},
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="plan"
						children={(field) => (
							<field.FormSelect
								label="Plan"
								description="Select a medical aid plan (required)"
								placeholder="Choose a plan..."
								options={[
									{ label: "Executive Plan", value: "executive" },
									{ label: "Comprehensive Plan", value: "comprehensive" },
									{ label: "Essential Plan", value: "essential" },
									{ label: "Basic Plan", value: "basic" },
								]}
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

export const MultipleSelects: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				provider: "",
				plan: "",
				coverage: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="provider"
						children={(field) => (
							<field.FormSelect
								label="Provider"
								placeholder="Select provider..."
								options={providerOptions}
							/>
						)}
					/>
					<form.AppField
						name="plan"
						children={(field) => (
							<field.FormSelect
								label="Plan Type"
								placeholder="Select plan..."
								options={[
									{ label: "Executive", value: "executive" },
									{ label: "Comprehensive", value: "comprehensive" },
									{ label: "Essential", value: "essential" },
								]}
							/>
						)}
					/>
					<form.AppField
						name="coverage"
						children={(field) => (
							<field.FormSelect
								label="Coverage Type"
								placeholder="Select coverage..."
								options={[
									{ label: "Individual", value: "individual" },
									{ label: "Family", value: "family" },
									{ label: "Couple", value: "couple" },
								]}
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
