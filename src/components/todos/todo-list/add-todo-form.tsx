/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { z } from "zod";
import { useAppForm } from "~/components/form";
import { FieldGroup } from "~/components/ui/field";
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
	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: todoFormSchema,
		},
		onSubmit: async ({ value }) => {
			await addTodo(value);
			form.reset();
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<form.AppForm>
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
					<form.SubmitButton label="Add" />
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
