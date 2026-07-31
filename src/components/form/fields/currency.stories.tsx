/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { CurrencyField, useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/CurrencyField",
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const currencyOptions = [
	{ label: "South African rand", value: "ZAR" },
	{ label: "US dollar", value: "USD" },
	{ label: "Euro", value: "EUR" },
];

export const Default: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				premium: {
					amount: 0,
					currency: "ZAR",
				},
			},
		});

		return (
			<div className="w-[32rem] max-w-full">
				<form.AppForm>
					<CurrencyField
						form={form}
						fields="premium"
						label="Monthly premium"
						description="Enter the recurring premium amount."
						currencyOptions={currencyOptions}
					/>
					<FormStateInspector title="Currency value" />
				</form.AppForm>
			</div>
		);
	},
};
