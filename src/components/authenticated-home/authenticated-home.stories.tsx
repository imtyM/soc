import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { type ReactNode, useRef, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { TodoListContent } from "~/components/todos/todo-list";
import {
	type TodoListContextValue,
	TodoListProvider,
} from "~/components/todos/todo-list/todo-list-context";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { AuthenticatedHomeContent } from ".";

const initialTodos: Array<Doc<"todos">> = [];

const meta = {
	title: "Authenticated/Authenticated Home",
	component: AuthenticatedHomeContent,
	parameters: {
		layout: "centered",
	},
	args: {
		children: null,
		name: "Amina Patel",
		phoneNumber: "+1 202 555 0142",
	},
	render: ({ name, phoneNumber }) => (
		<ControlledTodoListProvider>
			<div className="w-[40rem] max-w-full">
				<AuthenticatedHomeContent name={name} phoneNumber={phoneNumber}>
					<TodoListContent />
				</AuthenticatedHomeContent>
			</div>
		</ControlledTodoListProvider>
	),
} satisfies Meta<typeof AuthenticatedHomeContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HappyPath: Story = {
	play: async ({ canvas, canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		const todoText = "Test the controlled boundary";
		const todoInput = canvas.getByRole("textbox", { name: "New todo" });
		const addButton = canvas.getByRole("button", { name: "Add" });
		const addPriority = canvas.getByRole("combobox", { name: "Priority" });

		await expect(canvas.getByText("Amina Patel")).toBeVisible();
		await expect(canvas.getByText("+1 202 555 0142")).toBeVisible();
		await expect(canvas.getByText("No todos yet")).toBeVisible();

		await userEvent.click(addButton);
		await expect(canvas.getByText("Todo text is required")).toBeVisible();

		await userEvent.type(todoInput, todoText);
		await userEvent.click(addPriority);
		await userEvent.click(await page.findByRole("option", { name: "High" }));
		await userEvent.click(addButton);

		await expect(canvas.getByText(todoText)).toBeVisible();
		await expect(todoInput).toHaveValue("");
		await expect(
			canvas.getByRole("combobox", { name: `Priority for ${todoText}` }),
		).toHaveTextContent("High");

		await userEvent.click(
			canvas.getByRole("checkbox", { name: `Mark ${todoText} as complete` }),
		);
		await expect(
			canvas.getByRole("checkbox", { name: `Mark ${todoText} as incomplete` }),
		).toBeChecked();

		const todoPriority = canvas.getByRole("combobox", {
			name: `Priority for ${todoText}`,
		});
		await userEvent.click(todoPriority);
		await userEvent.click(await page.findByRole("option", { name: "Low" }));
		await expect(todoPriority).toHaveTextContent("Low");

		await userEvent.click(canvas.getByRole("button", { name: "Delete" }));
		await expect(canvas.getByText("No todos yet")).toBeVisible();
		await expect(canvas.queryByText(todoText)).not.toBeInTheDocument();
	},
};

function ControlledTodoListProvider({ children }: { children: ReactNode }) {
	const [todos, setTodos] = useState(initialTodos);
	const nextTodoNumber = useRef(initialTodos.length + 1);
	const value: TodoListContextValue = {
		todos,
		addTodo: (args) => {
			const todoNumber = nextTodoNumber.current;
			nextTodoNumber.current += 1;
			setTodos((current) => [
				{
					_id: todoId(`controlled-todo-${todoNumber}`),
					_creationTime: todoNumber,
					userId: "controlled-user",
					text: args.text,
					completed: false,
					priority: args.priority,
				},
				...current,
			]);
			return Promise.resolve();
		},
		setCompleted: ({ id, completed }) => {
			setTodos((current) =>
				current.map((todo) =>
					todo._id === id ? { ...todo, completed } : todo,
				),
			);
			return Promise.resolve();
		},
		setPriority: ({ id, priority }) => {
			setTodos((current) =>
				current.map((todo) => (todo._id === id ? { ...todo, priority } : todo)),
			);
			return Promise.resolve();
		},
		removeTodo: ({ id }) => {
			setTodos((current) => current.filter((todo) => todo._id !== id));
			return Promise.resolve();
		},
	};

	return <TodoListProvider value={value}>{children}</TodoListProvider>;
}

function todoId(value: string) {
	return value as Id<"todos">;
}
