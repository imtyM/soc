/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "~/components/ui/input-group";
import { useFieldContext } from "../contexts";

export interface FormNumberProps {
	label?: string;
	description?: string;
	placeholder?: string;
	min?: number;
	max?: number;
	step?: number;
	prefix?: string;
	suffix?: string;
	className?: string;
	/**
	 * Whether to hide the error message below the field
	 * @default false
	 */
	hideError?: boolean;
}

/**
 * FormNumber - A number input field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible number input experience with validation support.
 * Supports currency formatting with prefix/suffix.
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="price"
 *   children={(field) => (
 *     <field.FormNumber
 *       label="Price"
 *       description="Enter the product price"
 *       prefix="$"
 *       min={0}
 *       step={0.01}
 *     />
 *   )}
 * />
 * ```
 */
export function FormNumber({
	label,
	description,
	placeholder,
	min,
	max,
	step = 1,
	prefix,
	suffix,
	className,
	hideError = false,
}: FormNumberProps) {
	const field = useFieldContext<number>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field className={className} data-invalid={isInvalid}>
			{label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
			<InputGroup>
				{prefix && (
					<InputGroupAddon>
						<InputGroupText>{prefix}</InputGroupText>
					</InputGroupAddon>
				)}
				<InputGroupInput
					id={field.name}
					name={field.name}
					type="number"
					inputMode="decimal"
					value={field.state.value ?? ""}
					onBlur={field.handleBlur}
					onChange={(e) => {
						const value = e.target.value;
						if (value === "") {
							field.handleChange(0);
							return;
						}
						const num = Number(value);
						if (!Number.isNaN(num)) {
							field.handleChange(num);
						}
					}}
					aria-invalid={isInvalid}
					placeholder={placeholder}
					min={min}
					max={max}
					step={step}
				/>
				{suffix && (
					<InputGroupAddon align="inline-end">
						<InputGroupText>{suffix}</InputGroupText>
					</InputGroupAddon>
				)}
			</InputGroup>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && !hideError && (
				<FieldError errors={field.state.meta.errors} />
			)}
		</Field>
	);
}
