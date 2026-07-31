/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import z from "zod";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormTextarea",
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
				description: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="description"
						children={(field) => (
							<field.FormTextarea
								label="Description"
								placeholder="Enter a description..."
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.description,
							errors: state.fieldMeta.description?.errors || [],
							isTouched: state.fieldMeta.description?.isTouched || false,
							isValid: state.fieldMeta.description?.isValid ?? true,
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
				bio: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="bio"
						children={(field) => (
							<field.FormTextarea
								label="Biography"
								description="Tell us a bit about yourself"
								placeholder="I am a..."
								rows={5}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.bio,
							errors: state.fieldMeta.bio?.errors || [],
							isTouched: state.fieldMeta.bio?.isTouched || false,
							isValid: state.fieldMeta.bio?.isValid ?? true,
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
			comment: z
				.string()
				.min(10, "Comment must be at least 10 characters")
				.max(500, "Comment must be at most 500 characters"),
		});

		const form = useAppForm({
			defaultValues: {
				comment: "",
			},
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="comment"
						children={(field) => (
							<field.FormTextarea
								label="Comment"
								description="Share your thoughts (10-500 characters)"
								placeholder="Write your comment..."
								rows={4}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.comment,
							length: state.values.comment?.length || 0,
							errors: state.fieldMeta.comment?.errors || [],
							isTouched: state.fieldMeta.comment?.isTouched || false,
							isValid: state.fieldMeta.comment?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const DifferentSizes: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				small: "",
				medium: "",
				large: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="small"
						children={(field) => (
							<field.FormTextarea label="Small (3 rows)" rows={3} />
						)}
					/>
					<form.AppField
						name="medium"
						children={(field) => (
							<field.FormTextarea label="Medium (5 rows)" rows={5} />
						)}
					/>
					<form.AppField
						name="large"
						children={(field) => (
							<field.FormTextarea label="Large (8 rows)" rows={8} />
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
