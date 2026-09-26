import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import { TodoItem } from "./todo-item";
import { useTodoList } from "./todo-list-context";

export function Todos() {
	const { todos } = useTodoList();

	if (todos.length === 0) {
		return (
			<Empty className="mt-6 border">
				<EmptyHeader>
					<EmptyTitle>No todos yet</EmptyTitle>
					<EmptyDescription>
						Add one, sign out, then sign back in to test persistence.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className="mt-6 divide-y border-y border-border">
			{todos.map((todo) => (
				<TodoItem key={todo._id} todo={todo} />
			))}
		</ul>
	);
}
