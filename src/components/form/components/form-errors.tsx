import { FieldError } from "~/components/ui/field";
import { useFormContext } from "../contexts";

export interface FormErrorsProps {
	/**
	 * Additional CSS classes
	 */
	className?: string;
}

/**
 * Extracts all error messages from form errors.
 * Handles nested structures - form errors can be arrays or objects containing arrays of error objects.
 */
function collectFormErrors(formErrors: unknown): Array<{ message: string }> {
	const errorCollection: Array<{ message: string }> = [];

	if (!Array.isArray(formErrors)) {
		return errorCollection;
	}

	for (const fieldError of formErrors) {
		if (typeof fieldError !== "object" || fieldError === null) {
			continue;
		}

		for (const errors of Object.values(fieldError)) {
			if (!Array.isArray(errors)) continue;
			for (const error of errors) {
				if (
					typeof error === "object" &&
					error !== null &&
					"message" in error &&
					typeof error.message === "string"
				) {
					errorCollection.push({ message: error.message });
				}
			}
		}
	}

	return errorCollection;
}

/**
 * FormErrors - Displays all form validation errors in a consolidated list.
 *
 * This component subscribes to form state and displays validation errors
 * in a single location, useful for showing all errors together at the
 * bottom of a form instead of inline with each field.
 *
 * @example
 * ```tsx
 * <form.AppForm>
 *   <form.FormErrors />
 * </form.AppForm>
 * ```
 */
export function FormErrors({ className }: FormErrorsProps) {
	const formContext = useFormContext();

	return (
		<formContext.Subscribe selector={(state) => state.errors}>
			{(formErrors) => {
				const errors = collectFormErrors(formErrors);

				if (errors.length === 0) {
					return null;
				}

				return <FieldError errors={errors} className={className} />;
			}}
		</formContext.Subscribe>
	);
}
