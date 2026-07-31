/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useFieldContext } from "../contexts";

export interface SelectOption {
	label: string;
	value: string;
}

export interface FormSelectProps {
	label?: string;
	description?: string;
	placeholder?: string;
	options: ReadonlyArray<SelectOption>;
	className?: string;
	/**
	 * Whether to hide the error message below the field
	 * @default false
	 */
	hideError?: boolean;
	/**
	 * Whether to show a "None" option to clear the selection
	 * Use this for optional select fields
	 * @default false
	 */
	clearable?: boolean;
}

/**
 * FormSelect - A select dropdown field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible select dropdown experience with validation support.
 * Ideal for foreign key relationships and predefined option sets.
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="providerId"
 *   children={(field) => (
 *     <field.FormSelect
 *       label="Provider"
 *       description="Select the medical aid provider"
 *       placeholder="Choose a provider..."
 *       options={[
 *         { label: "Discovery", value: "discovery-id" },
 *         { label: "Momentum", value: "momentum-id" }
 *       ]}
 *     />
 *   )}
 * />
 * ```
 */
export function FormSelect({
	label,
	description,
	placeholder,
	options,
	className,
	hideError = false,
	clearable = false,
}: FormSelectProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	const selectValue = field.state.value || null;
	const items = clearable
		? [{ label: "None", value: null }, ...options]
		: options;

	const handleValueChange = (value: string | null) => {
		field.handleChange(value ?? "");
	};

	return (
		<Field className={className} data-invalid={isInvalid}>
			{label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
			<Select
				items={items}
				value={selectValue}
				onValueChange={handleValueChange}
			>
				<SelectTrigger
					id={field.name}
					aria-invalid={isInvalid}
					onBlur={field.handleBlur}
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{clearable && (
							<SelectItem value={null} className="text-muted-foreground">
								None
							</SelectItem>
						)}
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && !hideError && (
				<FieldError errors={field.state.meta.errors} />
			)}
		</Field>
	);
}
