import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useAppForm } from "..";
import { FormStateInspector } from "./form-state-inspector";

const meta = {
	title: "Form/Components/SubmitButton",
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
			defaultValues: {},
			onSubmit: async () => {
				await new Promise((resolve) => setTimeout(resolve, 2000));
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<form.SubmitButton label="Submit" />
						<FormStateInspector
							title="Form State"
							selector={(state) => ({
								isSubmitting: state.isSubmitting,
								canSubmit: state.canSubmit,
								isValid: state.isValid,
							})}
						/>
					</form.AppForm>
				</form>
			</div>
		);
	},
};

export const Variants: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {},
			onSubmit: async () => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<div className="flex flex-col gap-2">
							<form.SubmitButton label="Default" variant="default" />
							<form.SubmitButton label="Destructive" variant="destructive" />
							<form.SubmitButton label="Outline" variant="outline" />
							<form.SubmitButton label="Secondary" variant="secondary" />
							<form.SubmitButton label="Ghost" variant="ghost" />
							<form.SubmitButton label="Link" variant="link" />
						</div>
					</form.AppForm>
				</form>
			</div>
		);
	},
};

export const Sizes: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {},
			onSubmit: async () => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<div className="flex flex-col gap-2 items-start">
							<form.SubmitButton label="Small" size="sm" />
							<form.SubmitButton label="Default" size="default" />
							<form.SubmitButton label="Large" size="lg" />
						</div>
					</form.AppForm>
				</form>
			</div>
		);
	},
};

export const LoadingState: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {},
			onSubmit: async () => {
				// Simulate a long API call
				await new Promise((resolve) => setTimeout(resolve, 3000));
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<form.SubmitButton label="Submit (will take 3s)" />
						<FormStateInspector
							title="Form State"
							selector={(state) => ({
								isSubmitting: state.isSubmitting,
								canSubmit: state.canSubmit,
								submissionAttempts: state.submissionAttempts,
							})}
						/>
					</form.AppForm>
				</form>
				<p className="text-sm text-muted-foreground">
					Click the button to see the loading state. The button will be disabled
					for 3 seconds while "submitting".
				</p>
			</div>
		);
	},
};
