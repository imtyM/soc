import { useConvexMutation } from "@convex-dev/react-query";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { DEFAULT_TODO_PRIORITY } from "../../../../convex/schema/todo_validators";
import { todoPriorityOptions } from "./todo-priority-options";

interface TodoItemProps {
	todo: Doc<"todos">;
}

export function TodoItem({ todo }: TodoItemProps) {
	const setCompleted = useConvexMutation(api.todos.setCompleted);
	const setPriority = useConvexMutation(api.todos.setPriority);
	const removeTodo = useConvexMutation(api.todos.remove);
	const priority = todo.priority ?? DEFAULT_TODO_PRIORITY;

	return (
		<li className="flex items-center gap-3 py-3">
			<Checkbox
				checked={todo.completed}
				onCheckedChange={(checked) => {
					void setCompleted({ id: todo._id, completed: checked });
				}}
				aria-label={`Mark ${todo.text} as ${todo.completed ? "incomplete" : "complete"}`}
			/>
			<span
				className={cn(
					"min-w-0 flex-1 text-sm",
					todo.completed && "text-muted-foreground line-through",
				)}
			>
				{todo.text}
			</span>
			<Select
				items={todoPriorityOptions}
				value={priority}
				onValueChange={(nextPriority) => {
					if (nextPriority) {
						void setPriority({
							id: todo._id,
							priority: nextPriority,
						});
					}
				}}
			>
				<SelectTrigger
					className="w-28"
					aria-label={`Priority for ${todo.text}`}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{todoPriorityOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<Button
				variant="ghost"
				size="xs"
				onClick={() => void removeTodo({ id: todo._id })}
			>
				Delete
			</Button>
		</li>
	);
}
