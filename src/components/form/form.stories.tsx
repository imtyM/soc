/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import z from "zod";
import { FieldGroup } from "~/components/ui/field";
import { FormStateInspector } from "./components/form-state-inspector";
import { useAppForm, withForm } from "./index";

const meta = {
	title: "Form/Examples",
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicForm: Story = {
	render: () => {
		const schema = z.object({
			name: z.string().min(4, "Name must be at least 4 characters long"),
		});

		const defaultValues: z.input<typeof schema> = {
			name: "",
		};

		const form = useAppForm({
			defaultValues,
			validators: {
				onChange: schema,
			},
			onSubmit: ({ value }) => {
				console.log("Submitted:", value);
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
					<FieldGroup>
						<form.AppField
							name="name"
							children={(field) => (
								<field.FormInput label="Name" placeholder="Enter your name" />
							)}
						/>
						<form.AppForm>
							<form.SubmitButton label="Submit" />
						</form.AppForm>
						<form.AppForm>
							<FormStateInspector title="Form State" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</div>
		);
	},
};

export const LoginForm: Story = {
	render: () => {
		const [submittedValue, setSubmittedValue] = useState<Record<
			string,
			unknown
		> | null>(null);

		const schema = z.object({
			email: z.string().email("Please enter a valid email address"),
			password: z.string().min(8, "Password must be at least 8 characters"),
		});

		const defaultValues: z.input<typeof schema> = {
			email: "",
			password: "",
		};

		const form = useAppForm({
			defaultValues,
			validators: {
				onBlur: schema,
			},
			onSubmit: async ({ value }) => {
				// Simulate API call
				await new Promise((resolve) => setTimeout(resolve, 1000));
				setSubmittedValue(value);
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
					<FieldGroup>
						<form.AppField
							name="email"
							children={(field) => (
								<field.FormInput
									label="Email"
									description="Your email address"
									placeholder="name@example.com"
									type="email"
									autoComplete="email"
								/>
							)}
						/>
						<form.AppField
							name="password"
							children={(field) => (
								<field.FormInput
									label="Password"
									description="Must be at least 8 characters"
									type="password"
									autoComplete="current-password"
								/>
							)}
						/>
						<form.AppForm>
							<form.SubmitButton label="Sign In" />
						</form.AppForm>
						<form.AppForm>
							<FormStateInspector
								title="Form State"
								selector={(state) => ({
									values: state.values,
									errors: state.errors,
									isSubmitting: state.isSubmitting,
									isValid: state.isValid,
									canSubmit: state.canSubmit,
								})}
							/>
						</form.AppForm>
					</FieldGroup>
				</form>
				{submittedValue && (
					<div className="mt-4">
						<div className="text-sm font-semibold mb-2">Submitted Value</div>
						<pre className="text-xs overflow-auto max-h-96 p-4 bg-muted rounded-md">
							<code>{JSON.stringify(submittedValue, null, 2)}</code>
						</pre>
					</div>
				)}
			</div>
		);
	},
};

export const RegistrationForm: Story = {
	render: () => {
		const [submittedValue, setSubmittedValue] = useState<Record<
			string,
			unknown
		> | null>(null);

		const schema = z
			.object({
				username: z
					.string()
					.min(3, "Username must be at least 3 characters")
					.max(20, "Username must be at most 20 characters")
					.regex(
						/^[a-zA-Z0-9_]+$/,
						"Username can only contain letters, numbers, and underscores",
					),
				email: z.string().email("Please enter a valid email address"),
				password: z
					.string()
					.min(8, "Password must be at least 8 characters")
					.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
					.regex(/[0-9]/, "Password must contain at least one number"),
				confirmPassword: z.string(),
			})
			.refine((data) => data.password === data.confirmPassword, {
				message: "Passwords don't match",
				path: ["confirmPassword"],
			});

		const defaultValues: z.input<typeof schema> = {
			username: "",
			email: "",
			password: "",
			confirmPassword: "",
		};

		const form = useAppForm({
			defaultValues,
			validators: {
				onBlur: schema,
			},
			onSubmit: async ({ value }) => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				setSubmittedValue(value);
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
					<FieldGroup>
						<form.AppField
							name="username"
							children={(field) => (
								<field.FormInput
									label="Username"
									description="Choose a unique username"
									placeholder="johndoe"
									autoComplete="username"
								/>
							)}
						/>
						<form.AppField
							name="email"
							children={(field) => (
								<field.FormInput
									label="Email"
									placeholder="name@example.com"
									type="email"
									autoComplete="email"
								/>
							)}
						/>
						<form.AppField
							name="password"
							children={(field) => (
								<field.FormInput
									label="Password"
									description="Must be at least 8 characters with uppercase and number"
									type="password"
									autoComplete="new-password"
								/>
							)}
						/>
						<form.AppField
							name="confirmPassword"
							children={(field) => (
								<field.FormInput
									label="Confirm Password"
									type="password"
									autoComplete="new-password"
								/>
							)}
						/>
						<form.AppForm>
							<form.SubmitButton label="Create Account" />
						</form.AppForm>
						<form.AppForm>
							<FormStateInspector
								title="Form State"
								selector={(state) => ({
									values: state.values,
									isValid: state.isValid,
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
								})}
							/>
						</form.AppForm>
					</FieldGroup>
				</form>
				{submittedValue && (
					<div className="mt-4">
						<div className="text-sm font-semibold mb-2">Submitted Value</div>
						<pre className="text-xs overflow-auto max-h-96 p-4 bg-muted rounded-md">
							<code>{JSON.stringify(submittedValue, null, 2)}</code>
						</pre>
					</div>
				)}
			</div>
		);
	},
};

export const ValidationModes: Story = {
	render: () => {
		const schemaOnChange = z.object({
			onChangeField: z.string().min(3, "Must be at least 3 characters"),
		});

		const schemaOnBlur = z.object({
			onBlurField: z.string().min(3, "Must be at least 3 characters"),
		});

		const schemaOnSubmit = z.object({
			onSubmitField: z.string().min(3, "Must be at least 3 characters"),
		});

		const defaultValuesOnChange: z.input<typeof schemaOnChange> = {
			onChangeField: "",
		};

		const defaultValuesOnBlur: z.input<typeof schemaOnBlur> = {
			onBlurField: "",
		};

		const defaultValuesOnSubmit: z.input<typeof schemaOnSubmit> = {
			onSubmitField: "",
		};

		const formOnChange = useAppForm({
			defaultValues: defaultValuesOnChange,
			validators: { onChange: schemaOnChange },
		});

		const formOnBlur = useAppForm({
			defaultValues: defaultValuesOnBlur,
			validators: { onBlur: schemaOnBlur },
		});

		const formOnSubmit = useAppForm({
			defaultValues: defaultValuesOnSubmit,
			validators: { onSubmit: schemaOnSubmit },
			onSubmit: () => {},
		});

		return (
			<div className="w-96 space-y-6">
				<div>
					<h3 className="text-sm font-medium mb-2">onChange Validation</h3>
					<p className="text-xs text-muted-foreground mb-4">
						Validates as you type
					</p>
					<formOnChange.AppField
						name="onChangeField"
						children={(field) => (
							<field.FormInput
								label="On Change"
								placeholder="Type something..."
							/>
						)}
					/>
				</div>

				<div>
					<h3 className="text-sm font-medium mb-2">onBlur Validation</h3>
					<p className="text-xs text-muted-foreground mb-4">
						Validates when you leave the field
					</p>
					<formOnBlur.AppField
						name="onBlurField"
						children={(field) => (
							<field.FormInput
								label="On Blur"
								placeholder="Type and leave..."
							/>
						)}
					/>
				</div>

				<div>
					<h3 className="text-sm font-medium mb-2">onSubmit Validation</h3>
					<p className="text-xs text-muted-foreground mb-4">
						Validates only on form submission
					</p>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							formOnSubmit.handleSubmit();
						}}
					>
						<FieldGroup>
							<formOnSubmit.AppField
								name="onSubmitField"
								children={(field) => (
									<field.FormInput
										label="On Submit"
										placeholder="Try submitting..."
									/>
								)}
							/>
							<formOnSubmit.AppForm>
								<formOnSubmit.SubmitButton label="Submit" />
							</formOnSubmit.AppForm>
						</FieldGroup>
					</form>
				</div>
			</div>
		);
	},
};

export const FormValidations: Story = {
	render: () => {
		const schema = z.object({
			name: z
				.string()
				.min(4, "Name must be at least 4 characters long")
				.optional(),
			number: z.number().min(10, "Number must be at least 10").optional(),
		});

		const defaultValues: z.input<typeof schema> = {
			name: undefined,
			number: undefined,
		};

		const form = useAppForm({
			defaultValues,
			validators: {
				onChange: schema,
			},
			onSubmit: ({ value }) => {
				console.log("Submitted:", value);
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
					<FieldGroup>
						<form.AppField
							name="name"
							children={(field) => (
								<field.FormInput
									label="String input"
									placeholder="Enter your name"
								/>
							)}
						/>
						<form.AppField
							name="number"
							children={(field) => (
								<field.FormNumber
									label="Number input"
									placeholder="Enter a number"
								/>
							)}
						/>
						<form.AppForm>
							<form.SubmitButton label="Submit" />
						</form.AppForm>
						<form.AppForm>
							<FormStateInspector title="Form State" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</div>
		);
	},
};

export const ChildFormExample: Story = {
	render: () => {
		// Create reusable address form component
		const AddressForm = withForm({
			defaultValues: {
				street: "",
				city: "",
				zip: "",
			},
			props: {
				title: "Address",
			},
			render: function Render({ form, title }) {
				return (
					<div className="space-y-4">
						<h3 className="font-medium text-sm">{title}</h3>
						<form.AppField
							name="street"
							children={(field) => (
								<field.FormInput label="Street" placeholder="123 Main St" />
							)}
						/>
						<div className="grid grid-cols-2 gap-4">
							<form.AppField
								name="city"
								children={(field) => (
									<field.FormInput label="City" placeholder="New York" />
								)}
							/>
							<form.AppField
								name="zip"
								children={(field) => (
									<field.FormInput label="ZIP" placeholder="10001" />
								)}
							/>
						</div>
					</div>
				);
			},
		});

		const schema = z.object({
			street: z.string().min(1, "Street is required"),
			city: z.string().min(1, "City is required"),
			zip: z.string().regex(/^\d{5}$/, "Must be 5 digits"),
		});

		const defaultValues: z.input<typeof schema> = {
			street: "",
			city: "",
			zip: "",
		};

		const form = useAppForm({
			defaultValues,
			validators: { onBlur: schema },
			onSubmit: ({ value }) => {
				console.log("Submitted:", value);
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
					<FieldGroup>
						<AddressForm form={form} title="Shipping Address" />
						<form.AppForm>
							<form.SubmitButton label="Continue" />
						</form.AppForm>
						<form.AppForm>
							<FormStateInspector
								title="Form State"
								selector={(state) => ({
									values: state.values,
									errors: state.errors,
									isValid: state.isValid,
								})}
							/>
						</form.AppForm>
					</FieldGroup>
				</form>
			</div>
		);
	},
};
