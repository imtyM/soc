/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { Checkbox } from "~/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { useFieldContext } from "../contexts";

export interface FormCheckboxProps {
	label: string;
	description?: string;
	/**
	 * Whether to hide the error message below the field
	 * @default false
	 */
	hideError?: boolean;
}

/**
 * FormCheckbox - A checkbox field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible checkbox experience with validation support.
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="completed"
 *   children={(field) => (
 *     <field.FormCheckbox
 *       label="Mark as completed"
 *       description="Check this box to mark the item as done."
 *     />
 *   )}
 * />
 * ```
 */
export function FormCheckbox({
	label,
	description,
	hideError = false,
}: FormCheckboxProps) {
	const field = useFieldContext<boolean>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field orientation="horizontal" data-invalid={isInvalid}>
			<Checkbox
				id={field.name}
				name={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked === true)}
				onBlur={field.handleBlur}
				aria-invalid={isInvalid}
			/>
			<FieldContent>
				<FieldLabel htmlFor={field.name} className="cursor-pointer">
					{label}
				</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
				{isInvalid && !hideError && (
					<FieldError errors={field.state.meta.errors} />
				)}
			</FieldContent>
		</Field>
	);
}
