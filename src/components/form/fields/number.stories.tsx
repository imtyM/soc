/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import z from "zod";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormNumber",
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
				quantity: 0,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="quantity"
						children={(field) => (
							<field.FormNumber label="Quantity" placeholder="0" />
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.quantity,
							errors: state.fieldMeta.quantity?.errors || [],
							isTouched: state.fieldMeta.quantity?.isTouched || false,
							isValid: state.fieldMeta.quantity?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const WithCurrency: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				price: 0,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="price"
						children={(field) => (
							<field.FormNumber
								label="Price"
								description="Enter the price in Rand"
								prefix="R"
								min={0}
								step={0.01}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.price,
							formatted: `R ${state.values.price?.toFixed(2) || "0.00"}`,
							errors: state.fieldMeta.price?.errors || [],
							isTouched: state.fieldMeta.price?.isTouched || false,
							isValid: state.fieldMeta.price?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const WithSuffix: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				rate: 0,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="rate"
						children={(field) => (
							<field.FormNumber
								label="Coverage Rate"
								description="Percentage covered by the plan"
								suffix="%"
								min={0}
								max={100}
								step={1}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.rate,
							formatted: `${state.values.rate}%`,
							errors: state.fieldMeta.rate?.errors || [],
							isTouched: state.fieldMeta.rate?.isTouched || false,
							isValid: state.fieldMeta.rate?.isValid ?? true,
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
			age: z
				.number()
				.min(18, "Must be at least 18 years old")
				.max(120, "Invalid age"),
		});

		const form = useAppForm({
			defaultValues: {
				age: 0,
			},
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="age"
						children={(field) => (
							<field.FormNumber
								label="Age"
								description="Must be 18 or older"
								min={0}
								max={120}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.age,
							errors: state.fieldMeta.age?.errors || [],
							isTouched: state.fieldMeta.age?.isTouched || false,
							isValid: state.fieldMeta.age?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const DifferentFormats: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				amount: 0,
				percentage: 0,
				weight: 0,
				temperature: 0,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="amount"
						children={(field) => (
							<field.FormNumber
								label="Premium Amount"
								prefix="R"
								min={0}
								step={0.01}
							/>
						)}
					/>
					<form.AppField
						name="percentage"
						children={(field) => (
							<field.FormNumber
								label="Coverage Percentage"
								suffix="%"
								min={0}
								max={100}
							/>
						)}
					/>
					<form.AppField
						name="weight"
						children={(field) => (
							<field.FormNumber label="Weight" suffix="kg" min={0} step={0.1} />
						)}
					/>
					<form.AppField
						name="temperature"
						children={(field) => (
							<field.FormNumber label="Temperature" suffix="°C" step={0.1} />
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
