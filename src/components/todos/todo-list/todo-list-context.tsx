import type { FunctionArgs } from "convex/server";
import { createContext, type ReactNode, useContext } from "react";
import type { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

export type TodoListContextValue = {
	todos: Array<Doc<"todos">>;
	addTodo: (args: FunctionArgs<typeof api.todos.add>) => Promise<void>;
	setCompleted: (
		args: FunctionArgs<typeof api.todos.setCompleted>,
	) => Promise<void>;
	setPriority: (
		args: FunctionArgs<typeof api.todos.setPriority>,
	) => Promise<void>;
	removeTodo: (args: FunctionArgs<typeof api.todos.remove>) => Promise<void>;
};

const TodoListContext = createContext<TodoListContextValue | null>(null);

export function TodoListProvider({
	children,
	value,
}: {
	children: ReactNode;
	value: TodoListContextValue;
}) {
	return <TodoListContext value={value}>{children}</TodoListContext>;
}

export function useTodoList() {
	const value = useContext(TodoListContext);

	if (!value) {
		throw new Error("useTodoList must be used within TodoListProvider");
	}

	return value;
}
