import { type Infer, v } from "convex/values";

export const TODO_PRIORITIES = ["low", "medium", "high"] as const;

export const todoPriorityValidator = v.union(
	...TODO_PRIORITIES.map((priority) => v.literal(priority)),
);

export type TodoPriority = Infer<typeof todoPriorityValidator>;

export const DEFAULT_TODO_PRIORITY: TodoPriority = "medium";

export const TODO_PRIORITY_META: Record<TodoPriority, { label: string }> = {
	low: { label: "Low" },
	medium: { label: "Medium" },
	high: { label: "High" },
};
