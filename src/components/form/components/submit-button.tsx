import type { VariantProps } from "class-variance-authority";
import { Button, type buttonVariants } from "~/components/ui/button";
import { useFormContext } from "../contexts";

export interface SubmitButtonProps extends VariantProps<typeof buttonVariants> {
	label: string;
	form?: string;
}

/**
 * SubmitButton - A form submission button that automatically handles loading state.
 *
 * This component subscribes to the form's isSubmitting state and disables itself
 * during form submission, providing visual feedback to users.
 *
 * @example
 * ```tsx
 * <form.AppForm>
 *   <form.SubmitButton label="Submit" variant="default" />
 * </form.AppForm>
 * ```
 */
export function SubmitButton({
	label,
	variant,
	size,
	form,
}: SubmitButtonProps) {
	const formContext = useFormContext();

	return (
		<formContext.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button
					type="submit"
					disabled={isSubmitting}
					variant={variant}
					size={size}
					form={form}
				>
					{label}
				</Button>
			)}
		</formContext.Subscribe>
	);
}
