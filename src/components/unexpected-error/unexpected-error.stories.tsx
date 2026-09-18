import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { expect, fn, userEvent } from "storybook/test";
import { UnexpectedError } from ".";
import { RouterUnexpectedError } from "./router-unexpected-error";

const PRIVATE_DETAIL = "session-token=storybook-private-value";

const meta = {
	title: "Feedback/Unexpected Error",
	component: UnexpectedError,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		onTryAgain: fn(),
		onReloadPage: fn(),
	},
} satisfies Meta<typeof UnexpectedError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TryAgain: Story = {
	play: async ({ canvas, args }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
		await expect(args.onTryAgain).toHaveBeenCalledOnce();
	},
};

export const ReloadPage: Story = {
	play: async ({ canvas, args }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Reload page" }));
		await expect(args.onReloadPage).toHaveBeenCalledOnce();
	},
};

export const SensitiveDetailsHidden: Story = {
	render: (args) => {
		const error = new Error(PRIVATE_DETAIL);
		error.stack = `Error: ${PRIVATE_DETAIL}\n    at private-file.ts:1:1`;

		return <RouterUnexpectedError error={error} reset={args.onTryAgain} />;
	},
	play: async ({ canvas, canvasElement }) => {
		await expect(
			canvas.getByRole("heading", { name: "Something went wrong" }),
		).toBeVisible();
		await expect(canvasElement).not.toHaveTextContent(PRIVATE_DETAIL);
	},
};
