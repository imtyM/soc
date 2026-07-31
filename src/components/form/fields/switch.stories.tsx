/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormSwitch",
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				notifications: true,
			},
		});

		return (
			<div className="w-96 max-w-full">
				<form.AppForm>
					<form.AppField
						name="notifications"
						children={(field) => (
							<field.FormSwitch
								label="Email notifications"
								description="Receive important account updates."
							/>
						)}
					/>
					<FormStateInspector title="Switch value" />
				</form.AppForm>
			</div>
		);
	},
};
