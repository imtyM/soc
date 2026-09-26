import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "../../../../convex/_generated/api";
import { DEFAULT_TODO_PRIORITY } from "../../../../convex/schema/todo_validators";
import { TodoListProvider } from "./todo-list-context";

export function ConvexTodoListProvider({ children }: { children: ReactNode }) {
	const { data: todos } = useSuspenseQuery(convexQuery(api.todos.list, {}));
	const addTodo = useConvexMutation(api.todos.add);
	const setCompleted = useConvexMutation(
		api.todos.setCompleted,
	).withOptimisticUpdate((localStore, args) => {
		const currentTodos = localStore.getQuery(api.todos.list, {});
		if (currentTodos === undefined) {
			return;
		}

		localStore.setQuery(
			api.todos.list,
			{},
			currentTodos.map((todo) =>
				todo._id === args.id ? { ...todo, completed: args.completed } : todo,
			),
		);
	});
	const setPriority = useConvexMutation(
		api.todos.setPriority,
	).withOptimisticUpdate((localStore, args) => {
		const currentTodos = localStore.getQuery(api.todos.list, {});
		if (currentTodos === undefined) {
			return;
		}

		localStore.setQuery(
			api.todos.list,
			{},
			currentTodos.map((todo) =>
				todo._id === args.id
					? {
							...todo,
							priority: args.priority ?? DEFAULT_TODO_PRIORITY,
						}
					: todo,
			),
		);
	});
	const removeTodo = useConvexMutation(api.todos.remove);

	return (
		<TodoListProvider
			value={{
				todos,
				addTodo: async (args) => {
					await addTodo(args);
				},
				setCompleted: async (args) => {
					await setCompleted(args);
				},
				setPriority: async (args) => {
					await setPriority(args);
				},
				removeTodo: async (args) => {
					await removeTodo(args);
				},
			}}
		>
			{children}
		</TodoListProvider>
	);
}
