import {
	TODO_PRIORITIES,
	TODO_PRIORITY_META,
} from "../../../../convex/schema/todo_validators";

export const todoPriorityOptions = TODO_PRIORITIES.map((priority) => ({
	label: TODO_PRIORITY_META[priority].label,
	value: priority,
}));
