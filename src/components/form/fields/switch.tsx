/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Switch } from "~/components/ui/switch";
import { useFieldContext } from "../contexts";

export interface FormSwitchProps {
	label?: string;
	description?: string;
	className?: string;
	/**
	 * Whether to hide the error message below the field
	 * @default false
	 */
	hideError?: boolean;
}

/**
 * FormSwitch - A switch/toggle field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible switch experience with validation support.
 * Ideal for boolean toggles that are part of form data.
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="isEnabled"
 *   children={(field) => (
 *     <field.FormSwitch
 *       label="Enable feature"
 *       description="Turn this feature on or off"
 *     />
 *   )}
 * />
 * ```
 */
export function FormSwitch({
	label,
	description,
	className,
	hideError = false,
}: FormSwitchProps) {
	const field = useFieldContext<boolean>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field
			orientation="horizontal"
			className={className}
			data-invalid={isInvalid}
		>
			<Switch
				id={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked)}
				onBlur={field.handleBlur}
				aria-invalid={isInvalid}
			/>
			{label || description || (isInvalid && !hideError) ? (
				<FieldContent>
					{label ? (
						<FieldLabel htmlFor={field.name} className="cursor-pointer">
							{label}
						</FieldLabel>
					) : null}
					{description && <FieldDescription>{description}</FieldDescription>}
					{isInvalid && !hideError && (
						<FieldError errors={field.state.meta.errors} />
					)}
				</FieldContent>
			) : null}
		</Field>
	);
}
