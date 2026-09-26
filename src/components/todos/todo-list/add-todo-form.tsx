/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { useState } from "react";
import { z } from "zod";
import { useAppForm } from "~/components/form";
import { FieldError, FieldGroup } from "~/components/ui/field";
import {
	GENERIC_ERROR_MESSAGE,
	getPublicErrorMessage,
} from "~/lib/public-error";
import {
	DEFAULT_TODO_PRIORITY,
	TODO_PRIORITIES,
} from "../../../../convex/schema/todo_validators";
import { useTodoList } from "./todo-list-context";
import { todoPriorityOptions } from "./todo-priority-options";

const todoFormSchema = z.object({
	text: z.string().trim().min(1, "Todo text is required"),
	priority: z.enum(TODO_PRIORITIES),
});

const defaultValues: z.infer<typeof todoFormSchema> = {
	text: "",
	priority: DEFAULT_TODO_PRIORITY,
};

export function AddTodoForm() {
	const { addTodo } = useTodoList();
	const [mutationError, setMutationError] = useState<string | null>(null);
	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: todoFormSchema,
		},
		onSubmit: async ({ value }) => {
			setMutationError(null);

			try {
				await addTodo(value);
				form.reset();
			} catch (error) {
				const message = getPublicErrorMessage(error);
				if (message === GENERIC_ERROR_MESSAGE) {
					console.error("Todo add mutation failed unexpectedly.");
				}
				setMutationError(message);
			}
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!form.state.isSubmitting) {
					void form.handleSubmit();
				}
			}}
		>
			<form.AppForm>
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<fieldset
							disabled={isSubmitting}
							aria-busy={isSubmitting}
							aria-label="Add a todo"
							className="min-w-0 border-0 p-0"
						>
							<FieldGroup className="gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
								<form.AppField
									name="text"
									children={(field) => (
										<field.FormInput
											label="New todo"
											placeholder="What needs doing?"
										/>
									)}
								/>
								<form.AppField
									name="priority"
									children={(field) => (
										<field.FormSelect
											label="Priority"
											options={todoPriorityOptions}
										/>
									)}
								/>
								<form.SubmitButton label="Add" pendingLabel="Adding…" />
								<FieldError className="sm:col-span-3">
									{mutationError}
								</FieldError>
							</FieldGroup>
						</fieldset>
					)}
				</form.Subscribe>
			</form.AppForm>
		</form>
	);
}
