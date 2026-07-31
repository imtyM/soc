/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { useFieldContext } from "../contexts";

export interface FormTextareaProps {
	label: string;
	description?: string;
	placeholder?: string;
	rows?: number;
	/**
	 * Whether to hide the error message below the field
	 * @default false
	 */
	hideError?: boolean;
}

/**
 * FormTextarea - A textarea field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible textarea experience with validation support.
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="description"
 *   children={(field) => (
 *     <field.FormTextarea
 *       label="Description"
 *       description="Provide a detailed description."
 *       placeholder="Enter description..."
 *       rows={4}
 *     />
 *   )}
 * />
 * ```
 */
export function FormTextarea({
	label,
	description,
	placeholder,
	rows = 3,
	hideError = false,
}: FormTextareaProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Textarea
				id={field.name}
				name={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				aria-invalid={isInvalid}
				placeholder={placeholder}
				rows={rows}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && !hideError && (
				<FieldError errors={field.state.meta.errors} />
			)}
		</Field>
	);
}
