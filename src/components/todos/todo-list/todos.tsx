import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import { api } from "../../../../convex/_generated/api";
import { TodoItem } from "./todo-item";

export function Todos() {
	const { data: todos } = useSuspenseQuery(convexQuery(api.todos.list, {}));

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
