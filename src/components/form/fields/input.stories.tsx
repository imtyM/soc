/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import z from "zod";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormInput",
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
				name: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="name"
						children={(field) => <field.FormInput label="Name" />}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.name,
							errors: state.fieldMeta.name?.errors || [],
							isTouched: state.fieldMeta.name?.isTouched || false,
							isValid: state.fieldMeta.name?.isValid ?? true,
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
				email: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="email"
						children={(field) => (
							<field.FormInput
								label="Email"
								description="We'll never share your email with anyone."
								placeholder="name@example.com"
								type="email"
								autoComplete="email"
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.email,
							errors: state.fieldMeta.email?.errors || [],
							isTouched: state.fieldMeta.email?.isTouched || false,
							isValid: state.fieldMeta.email?.isValid ?? true,
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
			username: z
				.string()
				.min(3, "Username must be at least 3 characters")
				.max(20, "Username must be at most 20 characters"),
		});

		const form = useAppForm({
			defaultValues: {
				username: "",
			},
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="username"
						children={(field) => (
							<field.FormInput
								label="Username"
								description="Choose a unique username (3-20 characters)"
								placeholder="johndoe"
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.username,
							errors: state.fieldMeta.username?.errors || [],
							isTouched: state.fieldMeta.username?.isTouched || false,
							isValid: state.fieldMeta.username?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const WithError: Story = {
	render: () => {
		const schema = z.object({
			password: z.string().min(8, "Password must be at least 8 characters"),
		});

		const form = useAppForm({
			defaultValues: {
				password: "short",
			},
			validators: {
				onChange: schema,
			},
		});

		// Trigger validation by touching the field
		setTimeout(() => {
			form.setFieldMeta("password", (prev) => ({ ...prev, isTouched: true }));
		}, 0);

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="password"
						children={(field) => (
							<field.FormInput
								label="Password"
								description="Must be at least 8 characters"
								type="password"
								autoComplete="new-password"
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.password,
							errors: state.fieldMeta.password?.errors || [],
							isTouched: state.fieldMeta.password?.isTouched || false,
							isValid: state.fieldMeta.password?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const DifferentTypes: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				text: "",
				email: "",
				password: "",
				tel: "",
				url: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="text"
						children={(field) => (
							<field.FormInput label="Text" placeholder="Enter text" />
						)}
					/>
					<form.AppField
						name="email"
						children={(field) => (
							<field.FormInput
								label="Email"
								type="email"
								placeholder="name@example.com"
								autoComplete="email"
							/>
						)}
					/>
					<form.AppField
						name="password"
						children={(field) => (
							<field.FormInput
								label="Password"
								type="password"
								autoComplete="new-password"
							/>
						)}
					/>
					<form.AppField
						name="tel"
						children={(field) => (
							<field.FormInput
								label="Phone"
								type="tel"
								placeholder="+1 (555) 000-0000"
								autoComplete="tel"
							/>
						)}
					/>
					<form.AppField
						name="url"
						children={(field) => (
							<field.FormInput
								label="Website"
								type="url"
								placeholder="https://example.com"
								autoComplete="url"
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
