/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useState } from "react";
import z from "zod";
import { FieldGroup } from "~/components/ui/field";
import { useAppForm } from "..";
import { FormStateInspector } from "./form-state-inspector";

const meta = {
	title: "Form/Components/FormErrors",
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default FormErrors - Shows all field and form-level errors in a consolidated list
 */
export const Default: Story = {
	render: () => {
		const schema = z.object({
			email: z.string().email("Please enter a valid email address"),
			username: z.string().min(3, "Username must be at least 3 characters"),
		});

		const defaultValues: z.input<typeof schema> = {
			email: "",
			username: "",
		};

		const form = useAppForm({
			defaultValues,
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form>
					<FieldGroup>
						<form.AppField
							name="email"
							children={(field) => (
								<field.FormInput
									label="Email"
									placeholder="name@example.com"
									type="email"
									hideError={true}
								/>
							)}
						/>
						<form.AppField
							name="username"
							children={(field) => (
								<field.FormInput
									label="Username"
									placeholder="johndoe"
									hideError={true}
								/>
							)}
						/>

						{/* Consolidated errors at the bottom */}
						<form.AppForm>
							<form.FormErrors />
						</form.AppForm>
					</FieldGroup>
				</form>
				<div className="text-xs text-muted-foreground border-t pt-4">
					<p>
						<strong>Try it:</strong> Click on each field and blur without
						entering valid data to see errors collected at the bottom.
					</p>
				</div>
			</div>
		);
	},
};

/**
 * Only Field Errors - Shows only field-level validation errors
 */
export const OnlyFieldErrors: Story = {
	render: () => {
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
		});

		return (
			<div className="w-96 space-y-4">
				<form>
					<FieldGroup>
						<form.AppField
							name="email"
							children={(field) => (
								<field.FormInput
									label="Email"
									placeholder="name@example.com"
									type="email"
									hideError={true}
								/>
							)}
						/>
						<form.AppField
							name="password"
							children={(field) => (
								<field.FormInput
									label="Password"
									type="password"
									hideError={true}
								/>
							)}
						/>

						{/* Show the hidden inline errors in one consolidated list */}
						<form.AppForm>
							<form.FormErrors />
						</form.AppForm>
					</FieldGroup>
				</form>
			</div>
		);
	},
};

/**
 * Registration Form with Cross-Field Validation
 * Demonstrates FormErrors with both field-level and form-level (cross-field) validation
 */
export const RegistrationFormWithConsolidatedErrors: Story = {
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
					.max(20, "Username must be at most 20 characters"),
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
									hideError={true}
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
									hideError={true}
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
									hideError={true}
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
									hideError={true}
								/>
							)}
						/>

						{/* All errors consolidated here */}
						<form.AppForm>
							<form.FormErrors />
						</form.AppForm>

						<form.AppForm>
							<form.SubmitButton label="Create Account" />
						</form.AppForm>
						<form.AppForm>
							<FormStateInspector
								title="Form State"
								selector={(state) => ({
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

/**
 * Mixed Error Display
 * Some fields show inline errors, others are consolidated
 */
export const MixedErrorDisplay: Story = {
	render: () => {
		const schema = z.object({
			name: z.string().min(3, "Name must be at least 3 characters"),
			email: z.string().email("Please enter a valid email address"),
			age: z.number().min(18, "Must be at least 18 years old").optional(),
		});

		const defaultValues: z.input<typeof schema> = {
			name: "",
			email: "",
			age: undefined,
		};

		const form = useAppForm({
			defaultValues,
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form>
					<FieldGroup>
						{/* This field shows inline error */}
						<form.AppField
							name="name"
							children={(field) => (
								<field.FormInput
									label="Name (inline error)"
									placeholder="Enter your name"
								/>
							)}
						/>

						{/* These fields hide inline errors */}
						<form.AppField
							name="email"
							children={(field) => (
								<field.FormInput
									label="Email (error in list below)"
									placeholder="name@example.com"
									type="email"
									hideError={true}
								/>
							)}
						/>
						<form.AppField
							name="age"
							children={(field) => (
								<field.FormNumber
									label="Age (error in list below)"
									placeholder="Enter your age"
									hideError={true}
								/>
							)}
						/>

						{/* Consolidated errors (will only show email and age) */}
						<form.AppForm>
							<form.FormErrors />
						</form.AppForm>
					</FieldGroup>
				</form>
				<div className="text-xs text-muted-foreground border-t pt-4">
					<p>
						<strong>Note:</strong> The "name" field shows inline errors, while
						"email" and "age" errors appear in the consolidated list below.
					</p>
				</div>
			</div>
		);
	},
};

/**
 * Custom Styling
 * FormErrors with custom className
 */
export const CustomStyling: Story = {
	render: () => {
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
		});

		return (
			<div className="w-96 space-y-4">
				<form>
					<FieldGroup>
						<form.AppField
							name="email"
							children={(field) => (
								<field.FormInput
									label="Email"
									placeholder="name@example.com"
									type="email"
									hideError={true}
								/>
							)}
						/>
						<form.AppField
							name="password"
							children={(field) => (
								<field.FormInput
									label="Password"
									type="password"
									hideError={true}
								/>
							)}
						/>

						{/* Custom styled errors */}
						<form.AppForm>
							<form.FormErrors className="p-4 bg-destructive/10 rounded-md border border-destructive/50" />
						</form.AppForm>
					</FieldGroup>
				</form>
			</div>
		);
	},
};
