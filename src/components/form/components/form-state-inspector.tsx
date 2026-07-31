/**
 * FormStateInspector - A utility component for visualizing form and field state in Storybook.
 *
 * This component uses the form context to automatically display the current form state.
 * It's reactive and updates in real-time as the form state changes.
 *
 * Uses TanStack Form's useStore hook for reactive updates via useFormContext.
 */

import { type AnyFormState, useStore } from "@tanstack/react-form";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useFormContext } from "../contexts";

export interface FormStateInspectorProps {
	/**
	 * Optional title for the inspector card
	 * @default "Form State"
	 */
	title?: string;
	/**
	 * Optional selector to narrow down what state to display.
	 * By default, shows all form state.
	 *
	 * @example
	 * // Show only values
	 * selector={(state) => state.values}
	 *
	 * @example
	 * // Show specific field
	 * selector={(state) => ({
	 *   email: state.values.email,
	 *   errors: state.fieldMeta.email?.errors
	 * })}
	 */
	selector?: (state: AnyFormState) => unknown;
}

/**
 * Displays reactive form state in a JSON viewer.
 *
 * Must be used within a form context (inside form.AppForm or as a child of useAppForm).
 *
 * @example
 * ```tsx
 * // Show all form state
 * <FormStateInspector />
 *
 * // Show only form values
 * <FormStateInspector
 *   title="Form Values"
 *   selector={(state) => state.values}
 * />
 *
 * // Show specific field state
 * <FormStateInspector
 *   title="Email Field"
 *   selector={(state) => ({
 *     value: state.values.email,
 *     errors: state.fieldMeta.email?.errors,
 *     isTouched: state.fieldMeta.email?.isTouched
 *   })}
 * />
 * ```
 */
export function FormStateInspector({
	title = "Form State",
	selector = (state) => state,
}: FormStateInspectorProps) {
	// Get form from context
	const form = useFormContext();

	// Subscribe to form state reactively
	const state = useStore(form.store, selector);

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<pre className="text-xs overflow-auto max-h-96 p-4 bg-muted rounded-md">
					<code>{JSON.stringify(state, null, 2)}</code>
				</pre>
			</CardContent>
		</Card>
	);
}
