import { type ReactNode, useRef, useState } from "react";
import {
	type TodoListContextValue,
	TodoListProvider,
} from "~/components/todos/todo-list/todo-list-context";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { DEFAULT_TODO_PRIORITY } from "../../../convex/schema/todo_validators";

type TodoActions = Pick<
	TodoListContextValue,
	"addTodo" | "setCompleted" | "setPriority" | "removeTodo"
>;

type ControlledTodoListProviderProps = {
	actions?: Partial<TodoActions>;
	children: ReactNode;
	initialTodos?: Array<Doc<"todos">>;
};

export function ControlledTodoListProvider({
	actions = {},
	children,
	initialTodos = [],
}: ControlledTodoListProviderProps) {
	const [todos, setTodos] = useState(initialTodos);
	const nextTodoNumber = useRef(initialTodos.length + 1);
	const value: TodoListContextValue = {
		todos,
		addTodo: async (args) => {
			await actions.addTodo?.(args);
			const todoNumber = nextTodoNumber.current;
			nextTodoNumber.current += 1;
			setTodos((current) => [
				{
					_id: controlledTodoId(`controlled-todo-${todoNumber}`),
					_creationTime: todoNumber,
					userId: "controlled-user",
					text: args.text,
					completed: false,
					priority: args.priority,
				},
				...current,
			]);
		},
		setCompleted: async ({ id, completed }) => {
			const previousCompleted = todos.find(
				(todo) => todo._id === id,
			)?.completed;
			setTodos((current) =>
				current.map((todo) =>
					todo._id === id ? { ...todo, completed } : todo,
				),
			);

			try {
				await actions.setCompleted?.({ id, completed });
			} catch (error) {
				if (previousCompleted !== undefined) {
					setTodos((current) =>
						current.map((todo) =>
							todo._id === id
								? { ...todo, completed: previousCompleted }
								: todo,
						),
					);
				}
				throw error;
			}
		},
		setPriority: async ({ id, priority }) => {
			const previousPriority = todos.find((todo) => todo._id === id)?.priority;
			const nextPriority = priority ?? DEFAULT_TODO_PRIORITY;
			setTodos((current) =>
				current.map((todo) =>
					todo._id === id ? { ...todo, priority: nextPriority } : todo,
				),
			);

			try {
				await actions.setPriority?.({ id, priority });
			} catch (error) {
				setTodos((current) =>
					current.map((todo) =>
						todo._id === id ? { ...todo, priority: previousPriority } : todo,
					),
				);
				throw error;
			}
		},
		removeTodo: async (args) => {
			await actions.removeTodo?.(args);
			setTodos((current) => current.filter((todo) => todo._id !== args.id));
		},
	};

	return <TodoListProvider value={value}>{children}</TodoListProvider>;
}

export function controlledTodo(
	value: string,
	overrides: Partial<Omit<Doc<"todos">, "_id">> = {},
): Doc<"todos"> {
	return {
		_id: controlledTodoId(value),
		_creationTime: 1,
		userId: "controlled-user",
		text: "Controlled todo",
		completed: false,
		priority: DEFAULT_TODO_PRIORITY,
		...overrides,
	};
}

function controlledTodoId(value: string) {
	return value as Id<"todos">;
}
