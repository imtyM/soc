/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { useFieldContext } from "../contexts";

export interface FormInputProps {
	label: string;
	description?: string;
	placeholder?: string;
	type?: string;
	autoComplete?: string;
	/**
	 * Whether to hide the error message below the field
	 * @default false
	 */
	hideError?: boolean;
}

/**
 * FormInput - A text input field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible input experience with validation support.
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="email"
 *   children={(field) => (
 *     <field.FormInput
 *       label="Email"
 *       description="We'll never share your email."
 *       placeholder="name@example.com"
 *       type="email"
 *       autoComplete="email"
 *     />
 *   )}
 * />
 * ```
 */
export function FormInput({
	label,
	description,
	placeholder,
	type = "text",
	autoComplete,
	hideError = false,
}: FormInputProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				name={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				aria-invalid={isInvalid}
				placeholder={placeholder}
				type={type}
				autoComplete={autoComplete}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && !hideError && (
				<FieldError errors={field.state.meta.errors} />
			)}
		</Field>
	);
}
