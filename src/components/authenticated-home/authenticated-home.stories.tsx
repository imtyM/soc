import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { ConvexError } from "convex/values";
import {
	expect,
	fireEvent,
	spyOn,
	userEvent,
	waitFor,
	within,
} from "storybook/test";
import { TodoListContent } from "~/components/todos/todo-list";
import type { TodoListContextValue } from "~/components/todos/todo-list/todo-list-context";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import type { Doc } from "../../../convex/_generated/dataModel";
import { AuthenticatedHomeContent } from ".";
import {
	ControlledTodoListProvider,
	controlledTodo,
} from "./controlled-todo-list-provider";

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
		<AuthenticatedTodoStory name={name} phoneNumber={phoneNumber} />
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

		await userEvent.click(
			canvas.getByRole("button", { name: `Delete ${todoText}` }),
		);
		await expect(canvas.getByText("No todos yet")).toBeVisible();
		await expect(canvas.queryByText(todoText)).not.toBeInTheDocument();
	},
};

const addAction = createDeferredAction();

export const AddPendingFailureAndRetry: Story = {
	render: ({ name, phoneNumber }) => (
		<AuthenticatedTodoStory
			name={name}
			phoneNumber={phoneNumber}
			actions={{ addTodo: addAction.wait }}
		/>
	),
	play: async ({ canvas, canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		const todoInput = canvas.getByRole("textbox", { name: "New todo" });
		const priority = canvas.getByRole("combobox", { name: "Priority" });
		const todoText = "Retry adding this todo";
		const callsBeforeSubmit = addAction.calls;

		await userEvent.type(todoInput, todoText);
		await userEvent.click(priority);
		await userEvent.click(await page.findByRole("option", { name: "High" }));
		await userEvent.click(canvas.getByRole("button", { name: "Add" }));

		const pendingButton = canvas.getByRole("button", { name: "Adding…" });
		await expect(pendingButton).toBeDisabled();
		await expect(pendingButton).toHaveAttribute("aria-busy", "true");
		await expect(todoInput).toBeDisabled();
		await expect(priority).toBeDisabled();
		await expect(todoInput).toHaveValue(todoText);
		await expect(priority).toHaveTextContent("High");
		const form = todoInput.closest("form");
		if (!form) {
			throw new Error("Expected the add todo form");
		}
		fireEvent.submit(form);
		await expect(addAction.calls).toBe(callsBeforeSubmit + 1);

		addAction.reject(
			new ConvexError({
				code: "TODO_TEXT_REQUIRED",
				message: "Todo text is required",
			}),
		);
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			"Todo text is required",
		);
		await expect(todoInput).toHaveValue(todoText);
		await expect(todoInput).toBeEnabled();
		await expect(priority).toHaveTextContent("High");
		await expect(priority).toBeEnabled();

		await userEvent.click(canvas.getByRole("button", { name: "Add" }));
		await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
		addAction.resolve();

		await expect(await canvas.findByText(todoText)).toBeVisible();
		await expect(todoInput).toHaveValue("");
		await expect(priority).toHaveTextContent("Medium");
	},
};

const completionAction = createDeferredAction();
const completionTodo = controlledTodo("completion", {
	text: "Test optimistic completion",
});
const unrelatedTodo = controlledTodo("unrelated", {
	_creationTime: 2,
	text: "Keep another item interactive",
});

export const CompletionRollbackAndRetry: Story = {
	render: ({ name, phoneNumber }) => (
		<AuthenticatedTodoStory
			name={name}
			phoneNumber={phoneNumber}
			initialTodos={[completionTodo, unrelatedTodo]}
			actions={{ setCompleted: completionAction.wait }}
		/>
	),
	play: async ({ canvas, canvasElement }) => {
		const row = getTodoRow(canvasElement, completionTodo.text);
		const rowCanvas = within(row);
		const otherRow = getTodoRow(canvasElement, unrelatedTodo.text);
		const otherRowCanvas = within(otherRow);
		const callsBeforeChange = completionAction.calls;

		await userEvent.click(
			rowCanvas.getByRole("checkbox", {
				name: `Mark ${completionTodo.text} as complete`,
			}),
		);
		await expect(
			rowCanvas.getByRole("checkbox", {
				name: `Mark ${completionTodo.text} as incomplete`,
			}),
		).toBeChecked();
		await expect(rowCanvas.getByText("Updating completion…")).toBeVisible();
		const pendingCheckbox = rowCanvas.getByRole("checkbox", {
			name: `Mark ${completionTodo.text} as incomplete`,
		});
		await expect(pendingCheckbox).toHaveAttribute("aria-disabled", "true");
		await expect(
			rowCanvas.getByRole("combobox", {
				name: `Priority for ${completionTodo.text}`,
			}),
		).toBeDisabled();
		await expect(
			rowCanvas.getByRole("button", {
				name: `Delete ${completionTodo.text}`,
			}),
		).toBeDisabled();
		fireEvent.click(pendingCheckbox);
		await expect(completionAction.calls).toBe(callsBeforeChange + 1);
		await expect(
			otherRowCanvas.getByRole("checkbox", {
				name: `Mark ${unrelatedTodo.text} as complete`,
			}),
		).not.toHaveAttribute("aria-disabled", "true");
		await expect(canvas.getByRole("button", { name: "Add" })).toBeEnabled();

		completionAction.reject(
			new ConvexError({ code: "TODO_NOT_FOUND", message: "Todo not found" }),
		);
		await expect(await rowCanvas.findByRole("alert")).toHaveTextContent(
			"Todo not found",
		);
		await expect(
			rowCanvas.getByRole("checkbox", {
				name: `Mark ${completionTodo.text} as complete`,
			}),
		).not.toBeChecked();

		await userEvent.click(
			rowCanvas.getByRole("checkbox", {
				name: `Mark ${completionTodo.text} as complete`,
			}),
		);
		await expect(rowCanvas.queryByRole("alert")).not.toBeInTheDocument();
		completionAction.resolve();
		await waitFor(() =>
			expect(
				rowCanvas.getByRole("checkbox", {
					name: `Mark ${completionTodo.text} as incomplete`,
				}),
			).toBeChecked(),
		);
	},
};

const priorityAction = createDeferredAction();
const priorityTodo = controlledTodo("priority", {
	text: "Test optimistic priority",
});

export const PriorityRollbackAndRetry: Story = {
	render: ({ name, phoneNumber }) => (
		<AuthenticatedTodoStory
			name={name}
			phoneNumber={phoneNumber}
			initialTodos={[priorityTodo]}
			actions={{ setPriority: priorityAction.wait }}
		/>
	),
	play: async ({ canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		const row = getTodoRow(canvasElement, priorityTodo.text);
		const rowCanvas = within(row);
		const priority = rowCanvas.getByRole("combobox", {
			name: `Priority for ${priorityTodo.text}`,
		});
		const callsBeforeChange = priorityAction.calls;

		await userEvent.click(priority);
		await userEvent.click(await page.findByRole("option", { name: "High" }));
		await expect(priority).toHaveTextContent("High");
		await expect(priority).toBeDisabled();
		await expect(
			rowCanvas.getByRole("checkbox", {
				name: `Mark ${priorityTodo.text} as complete`,
			}),
		).toHaveAttribute("aria-disabled", "true");
		await expect(
			rowCanvas.getByRole("button", {
				name: `Delete ${priorityTodo.text}`,
			}),
		).toBeDisabled();
		await expect(rowCanvas.getByText("Updating priority…")).toBeVisible();
		fireEvent.click(priority);
		await expect(priorityAction.calls).toBe(callsBeforeChange + 1);

		priorityAction.reject(
			new ConvexError({ code: "TODO_NOT_FOUND", message: "Todo not found" }),
		);
		await expect(await rowCanvas.findByRole("alert")).toHaveTextContent(
			"Todo not found",
		);
		await waitFor(() =>
			expect(page.queryByRole("listbox")).not.toBeInTheDocument(),
		);
		await expect(priority).toHaveTextContent("Medium");

		await userEvent.click(priority);
		await userEvent.click(await page.findByRole("option", { name: "Low" }));
		await expect(rowCanvas.queryByRole("alert")).not.toBeInTheDocument();
		await expect(priority).toHaveTextContent("Low");
		priorityAction.resolve();
		await waitFor(() => expect(priority).toBeEnabled());
		await waitFor(() =>
			expect(page.queryByRole("listbox")).not.toBeInTheDocument(),
		);
		await expect(priority).toHaveTextContent("Low");
	},
};

const removeAction = createDeferredAction();
const removableTodo = controlledTodo("removal", {
	text: "Delete only after confirmation",
});
const PRIVATE_ERROR_DETAIL = "private-token-distinctive-value";

export const DeletePendingFailureAndRetry: Story = {
	render: ({ name, phoneNumber }) => (
		<AuthenticatedTodoStory
			name={name}
			phoneNumber={phoneNumber}
			initialTodos={[removableTodo, unrelatedTodo]}
			actions={{ removeTodo: removeAction.wait }}
		/>
	),
	play: async ({ canvas, canvasElement }) => {
		const consoleError = spyOn(console, "error").mockImplementation(() => {});
		const row = getTodoRow(canvasElement, removableTodo.text);
		const rowCanvas = within(row);
		const otherRow = getTodoRow(canvasElement, unrelatedTodo.text);
		const otherRowCanvas = within(otherRow);
		const callsBeforeRemove = removeAction.calls;

		await userEvent.click(
			rowCanvas.getByRole("button", {
				name: `Delete ${removableTodo.text}`,
			}),
		);
		await expect(rowCanvas.getByText(removableTodo.text)).toBeVisible();
		await expect(
			rowCanvas.getByRole("button", {
				name: `Delete ${removableTodo.text}`,
			}),
		).toBeDisabled();
		await expect(
			rowCanvas.getByRole("checkbox", {
				name: `Mark ${removableTodo.text} as complete`,
			}),
		).toHaveAttribute("aria-disabled", "true");
		await expect(
			rowCanvas.getByRole("combobox", {
				name: `Priority for ${removableTodo.text}`,
			}),
		).toBeDisabled();
		const pendingDelete = rowCanvas.getByRole("button", {
			name: `Delete ${removableTodo.text}`,
		});
		fireEvent.click(pendingDelete);
		await expect(removeAction.calls).toBe(callsBeforeRemove + 1);
		await expect(
			otherRowCanvas.getByRole("button", {
				name: `Delete ${unrelatedTodo.text}`,
			}),
		).toBeEnabled();
		await userEvent.click(
			otherRowCanvas.getByRole("checkbox", {
				name: `Mark ${unrelatedTodo.text} as complete`,
			}),
		);
		await expect(
			otherRowCanvas.getByRole("checkbox", {
				name: `Mark ${unrelatedTodo.text} as incomplete`,
			}),
		).toBeChecked();

		removeAction.reject(new Error(PRIVATE_ERROR_DETAIL));
		await expect(await rowCanvas.findByRole("alert")).toHaveTextContent(
			GENERIC_ERROR_MESSAGE,
		);
		await expect(
			canvas.queryByText(PRIVATE_ERROR_DETAIL),
		).not.toBeInTheDocument();
		await expect(consoleError).toHaveBeenCalledTimes(1);
		await expect(consoleError).toHaveBeenCalledWith(
			"Todo removal mutation failed unexpectedly.",
		);

		await userEvent.click(
			rowCanvas.getByRole("button", {
				name: `Delete ${removableTodo.text}`,
			}),
		);
		await expect(rowCanvas.queryByRole("alert")).not.toBeInTheDocument();
		removeAction.resolve();
		await waitFor(() =>
			expect(canvas.queryByText(removableTodo.text)).not.toBeInTheDocument(),
		);
		await expect(canvas.getByText(unrelatedTodo.text)).toBeVisible();
		consoleError.mockRestore();
	},
};

export const AddInlineFailureReview: Story = {
	render: ({ name, phoneNumber }) => (
		<AuthenticatedTodoStory
			name={name}
			phoneNumber={phoneNumber}
			actions={{
				addTodo: async () => {
					throw new ConvexError({
						code: "TODO_TEXT_REQUIRED",
						message: "Todo text is required",
					});
				},
			}}
		/>
	),
	play: async ({ canvas }) => {
		await userEvent.type(
			canvas.getByRole("textbox", { name: "New todo" }),
			"Preserved after failure",
		);
		await userEvent.click(canvas.getByRole("button", { name: "Add" }));
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			"Todo text is required",
		);
	},
};

export const CompletionRollbackReview: Story = {
	render: ({ name, phoneNumber }) => (
		<AuthenticatedTodoStory
			name={name}
			phoneNumber={phoneNumber}
			initialTodos={[completionTodo]}
			actions={{
				setCompleted: async () => {
					throw new ConvexError({
						code: "TODO_NOT_FOUND",
						message: "Todo not found",
					});
				},
			}}
		/>
	),
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole("checkbox", {
				name: `Mark ${completionTodo.text} as complete`,
			}),
		);
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			"Todo not found",
		);
		await expect(
			canvas.getByRole("checkbox", {
				name: `Mark ${completionTodo.text} as complete`,
			}),
		).not.toBeChecked();
	},
};

export const DeletePendingReview: Story = {
	render: ({ name, phoneNumber }) => (
		<AuthenticatedTodoStory
			name={name}
			phoneNumber={phoneNumber}
			initialTodos={[removableTodo]}
			actions={{ removeTodo: () => new Promise<void>(() => {}) }}
		/>
	),
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole("button", {
				name: `Delete ${removableTodo.text}`,
			}),
		);
		await expect(
			canvas.getByRole("button", {
				name: `Delete ${removableTodo.text}`,
			}),
		).toBeDisabled();
		await expect(canvas.getByText(removableTodo.text)).toBeVisible();
	},
};

function AuthenticatedTodoStory({
	actions,
	initialTodos,
	name,
	phoneNumber,
}: {
	actions?: Partial<
		Pick<
			TodoListContextValue,
			"addTodo" | "setCompleted" | "setPriority" | "removeTodo"
		>
	>;
	initialTodos?: Array<Doc<"todos">>;
	name?: string | null;
	phoneNumber?: string | null;
}) {
	return (
		<ControlledTodoListProvider actions={actions} initialTodos={initialTodos}>
			<div className="w-[40rem] max-w-full">
				<AuthenticatedHomeContent name={name} phoneNumber={phoneNumber}>
					<TodoListContent />
				</AuthenticatedHomeContent>
			</div>
		</ControlledTodoListProvider>
	);
}

function getTodoRow(canvasElement: HTMLElement, text: string) {
	const row = within(canvasElement).getByText(text).closest("li");
	if (!row) {
		throw new Error(`Expected a list item for ${text}`);
	}
	return row;
}

function createDeferredAction() {
	let calls = 0;
	let pending:
		| {
				reject: (error: unknown) => void;
				resolve: () => void;
		  }
		| undefined;

	return {
		get calls() {
			return calls;
		},
		wait: () => {
			calls += 1;
			return new Promise<void>((resolve, reject) => {
				pending = { resolve, reject };
			});
		},
		resolve: () => {
			pending?.resolve();
			pending = undefined;
		},
		reject: (error: unknown) => {
			pending?.reject(error);
			pending = undefined;
		},
	};
}
