import { AddTodoForm } from "./add-todo-form";
import { Todos } from "./todos";

export function TodoList() {
	return (
		<section className="border-t border-border pt-8">
			<div className="mb-6">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					Persistent state
				</p>
				<h2 className="mt-2 text-2xl font-semibold">Your todos</h2>
			</div>
			<AddTodoForm />
			<Todos />
		</section>
	);
}
