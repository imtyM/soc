import { useRef, useState } from "react";
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
import {
	GENERIC_ERROR_MESSAGE,
	getPublicErrorMessage,
} from "~/lib/public-error";
import { cn } from "~/lib/utils";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { DEFAULT_TODO_PRIORITY } from "../../../../convex/schema/todo_validators";
import { useTodoList } from "./todo-list-context";
import { todoPriorityOptions } from "./todo-priority-options";

interface TodoItemProps {
	todo: Doc<"todos">;
}

type PendingAction = "completion" | "priority" | "removal";

export function TodoItem({ todo }: TodoItemProps) {
	const {
		pendingAction,
		mutationError,
		handleCompletedChange,
		handlePriorityChange,
		handleRemove,
	} = useTodoItemMutations(todo);
	const priority = todo.priority ?? DEFAULT_TODO_PRIORITY;
	const isPending = pendingAction !== null;

	return (
		<li className="flex flex-col gap-2 py-3" aria-busy={isPending}>
			<div className="flex items-center gap-3">
				<Checkbox
					checked={todo.completed}
					disabled={isPending}
					aria-busy={pendingAction === "completion"}
					onCheckedChange={(checked) => {
						void handleCompletedChange(checked);
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
					disabled={isPending}
					onValueChange={(nextPriority) => {
						if (nextPriority) {
							void handlePriorityChange(nextPriority);
						}
					}}
				>
					<SelectTrigger
						className="w-28"
						aria-busy={pendingAction === "priority"}
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
					disabled={isPending}
					aria-busy={pendingAction === "removal"}
					aria-label={`Delete ${todo.text}`}
					onClick={() => void handleRemove()}
				>
					{pendingAction === "removal" ? "Deleting…" : "Delete"}
				</Button>
			</div>
			{pendingAction === "completion" ? (
				<output className="text-xs text-muted-foreground">
					Updating completion…
				</output>
			) : pendingAction === "priority" ? (
				<output className="text-xs text-muted-foreground">
					Updating priority…
				</output>
			) : null}
			{mutationError ? (
				<p role="alert" className="text-sm text-destructive">
					{mutationError}
				</p>
			) : null}
		</li>
	);
}

function useTodoItemMutations(todo: Doc<"todos">) {
	const { setCompleted, setPriority, removeTodo } = useTodoList();
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(
		null,
	);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const pendingActionRef = useRef<PendingAction | null>(null);

	async function runAction(
		action: PendingAction,
		mutation: () => Promise<void>,
	) {
		if (pendingActionRef.current) {
			return;
		}

		pendingActionRef.current = action;
		setMutationError(null);
		setPendingAction(action);
		try {
			await mutation();
		} catch (error) {
			const message = getPublicErrorMessage(error);
			if (message === GENERIC_ERROR_MESSAGE) {
				console.error(`Todo ${action} mutation failed unexpectedly.`);
			}
			setMutationError(message);
		} finally {
			pendingActionRef.current = null;
			setPendingAction(null);
		}
	}

	async function handleCompletedChange(completed: boolean) {
		await runAction("completion", () =>
			setCompleted({ id: todo._id, completed }),
		);
	}

	async function handlePriorityChange(
		priority: NonNullable<Doc<"todos">["priority"]>,
	) {
		await runAction("priority", () => setPriority({ id: todo._id, priority }));
	}

	async function handleRemove() {
		await runAction("removal", () => removeTodo({ id: todo._id }));
	}

	return {
		pendingAction,
		mutationError,
		handleCompletedChange,
		handlePriorityChange,
		handleRemove,
	};
}
