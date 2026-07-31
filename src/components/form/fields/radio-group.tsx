/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { cn } from "~/lib/utils";
import { useFieldContext } from "../contexts";

export interface RadioOption {
	value: string;
	label: string;
	description?: string;
}

export interface FormRadioGroupProps {
	label?: string;
	description?: string;
	options: RadioOption[];
	/**
	 * Display variant for the radio group
	 * - "default": compact radio buttons with labels
	 * - "card": large rectangular card-style options
	 * @default "default"
	 */
	variant?: "default" | "card";
	/**
	 * Whether to hide the error message below the field
	 * @default false
	 */
	hideError?: boolean;
}

/**
 * FormRadioGroup - A radio group field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible radio group experience with validation support.
 * Supports two variants: default (compact) and cards (large card-style options).
 *
 * @example
 * ```tsx
 * <form.AppField
 *   name="plan"
 *   children={(field) => (
 *     <field.FormRadioGroup
 *       label="Select a plan"
 *       description="Choose the plan that works for you"
 *       options={[
 *         { value: "free", label: "Free" },
 *         { value: "pro", label: "Pro" }
 *       ]}
 *     />
 *   )}
 * />
 * ```
 */
export function FormRadioGroup({
	label,
	description,
	options,
	variant = "default",
	hideError = false,
}: FormRadioGroupProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			{label && <FieldLabel>{label}</FieldLabel>}
			{description && <FieldDescription>{description}</FieldDescription>}
			<RadioGroup
				value={field.state.value}
				onValueChange={field.handleChange}
				aria-invalid={isInvalid}
				className={cn(
					variant === "card" && "flex flex-wrap gap-3 justify-center",
				)}
			>
				{options.map((option) =>
					variant === "card" ? (
						<RadioGroupCardOption
							key={option.value}
							option={option}
							fieldName={field.name}
							isSelected={field.state.value === option.value}
						/>
					) : (
						<div className="flex items-center gap-3" key={option.value}>
							<RadioGroupItem
								value={option.value}
								id={`${field.name}-${option.value}`}
							/>
							<Label htmlFor={`${field.name}-${option.value}`}>
								<span>{option.label}</span>
							</Label>
							{option.description && (
								<span className="text-sm text-muted-foreground">
									{option.description}
								</span>
							)}
						</div>
					),
				)}
			</RadioGroup>
			{isInvalid && !hideError && (
				<FieldError errors={field.state.meta.errors} />
			)}
		</Field>
	);
}

function RadioGroupCardOption({
	option,
	fieldName,
	isSelected,
}: {
	option: RadioOption;
	fieldName: string;
	isSelected: boolean;
}) {
	const id = `${fieldName}-${option.value}`;

	return (
		<label
			htmlFor={id}
			className={cn(
				"flex h-14 w-full cursor-pointer items-center gap-4 rounded-xl px-5 transition-all sm:w-72",
				isSelected
					? "border-primary bg-primary/10"
					: "border-transparent bg-muted hover:bg-accent",
			)}
		>
			<RadioGroupItem value={option.value} id={id} className="size-5" />
			<span className="text-base font-semibold">{option.label}</span>
		</label>
	);
}
