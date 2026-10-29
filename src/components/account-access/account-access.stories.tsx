import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import {
	expect,
	fireEvent,
	fn,
	mocked,
	userEvent,
	within,
} from "storybook/test";
import { Button } from "~/components/ui/button";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import { AccountAccessContent } from ".";
import { PhoneLookupForm } from "./phone-lookup-form";
import { RoleForm } from "./role-form";
import type { RoleFormProps } from "./use-role-form";

// Reserved synthetic identity/number. No auth, account lookup or backend calls.
const account = {
	authUserId: "fixture-account",
	phoneNumber: "+12025550102",
	role: "user" as const,
};
const meta = {
	title: "Accounts/Account Access",
	component: AccountAccessContent,
	parameters: { layout: "centered" },
	args: { accountRole: "admin" },
} satisfies Meta<typeof AccountAccessContent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const User: Story = {
	args: { accountRole: "user", children: <PhoneLookupForm onLookup={fn()} /> },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("user")).toBeVisible();
		await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
	},
};

export const Operator: Story = {
	...User,
	args: {
		accountRole: "operator",
		children: <PhoneLookupForm onLookup={fn()} />,
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByText("operator")).toBeVisible();
		await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
	},
};

const changeRole = fn<RoleFormProps["changeRole"]>();
export const AdminKeyboardGrant: Story = {
	render: () => <ControlledManager changeRole={changeRole} />,
	beforeEach: () => {
		changeRole.mockReset().mockResolvedValue(null);
	},
	play: async ({ canvas, canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		const phone = canvas.getByRole("textbox", {
			name: "Verified phone number",
		});
		await userEvent.type(phone, "+12025550102");
		await userEvent.keyboard("{Enter}");
		await expect(await canvas.findByText("Current role: user")).toBeVisible();
		const role = canvas.getByRole("combobox", { name: "Account role" });
		role.focus();
		await userEvent.keyboard("{ArrowDown}");
		await userEvent.click(
			await page.findByRole("option", { name: "operator" }),
		);
		await userEvent.tab();
		await userEvent.keyboard("{Enter}");
		await expect(changeRole).toHaveBeenCalledWith({
			phoneNumber: account.phoneNumber,
			expectedAuthUserId: account.authUserId,
			role: "operator",
		});
		await expect(
			await canvas.findByText("Current role: operator"),
		).toBeVisible();
	},
};

export const NoMatch: Story = {
	render: () => <ControlledManager changeRole={fn()} />,
	play: async ({ canvas }) => {
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Verified phone number" }),
			"+12025550199",
		);
		await userEvent.keyboard("{Enter}");
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"No account with that exact verified phone number was found.",
		);
		await expect(canvas.queryByRole("combobox")).not.toBeInTheDocument();
	},
};

export const PendingFailureAndRetry: Story = {
	render: () => (
		<RoleForm account={{ ...account, role: "admin" }} changeRole={changeRole} />
	),
	beforeEach: () => {
		changeRole.mockReset();
	},
	play: async ({ canvas, canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		let rejectPending: (error: unknown) => void = () => {
			throw new Error("Pending action not initialised");
		};
		changeRole.mockImplementationOnce(
			() =>
				new Promise((_resolve, reject) => {
					rejectPending = reject;
				}),
		);
		await userEvent.click(
			canvas.getByRole("combobox", { name: "Account role" }),
		);
		await userEvent.click(await page.findByRole("option", { name: "user" }));
		await userEvent.click(canvas.getByRole("button", { name: "Save role" }));
		const pending = canvas.getByRole("button", { name: "Saving role…" });
		await expect(pending).toBeDisabled();
		await expect(pending).toHaveAttribute("aria-busy", "true");
		await expect(canvas.getByRole("combobox")).toBeDisabled();
		const form = pending.closest("form");
		if (!form) throw new Error("Missing role form");
		fireEvent.submit(form);
		await expect(changeRole).toHaveBeenCalledTimes(1);
		rejectPending(
			new ConvexError({
				code: "ACCOUNT_LAST_ADMIN",
				message:
					"Another verified administrator must remain before removing your administrator role.",
			}),
		);
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			"Another verified administrator must remain",
		);
		await expect(canvas.getByRole("combobox")).toHaveTextContent("user");
		mocked(changeRole).mockResolvedValueOnce(null);
		await userEvent.click(canvas.getByRole("button", { name: "Save role" }));
		await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
		await expect(changeRole).toHaveBeenCalledTimes(2);
	},
};

export const UnknownFailureIsGeneric: Story = {
	render: () => <RoleForm account={account} changeRole={changeRole} />,
	beforeEach: () => {
		changeRole
			.mockReset()
			.mockRejectedValueOnce(new Error("INTERNAL_FIXTURE_DETAIL"));
	},
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Save role" }));
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			GENERIC_ERROR_MESSAGE,
		);
		await expect(
			canvas.queryByText(/INTERNAL_FIXTURE_DETAIL/),
		).not.toBeInTheDocument();
	},
};

export const PrivilegeLoss: Story = {
	render: () => <RevokedManager />,
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("textbox")).toBeVisible();
		await userEvent.click(
			canvas.getByRole("button", {
				name: "Simulate server-confirmed revocation",
			}),
		);
		await expect(canvas.getByText("user")).toBeVisible();
		await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
	},
};

function ControlledManager({
	changeRole: change,
}: Pick<RoleFormProps, "changeRole">) {
	const [found, setFound] = useState<boolean | null>(null);
	const [current, setCurrent] = useState<RoleFormProps["account"]>(account);
	return (
		<AccountAccessContent accountRole="admin">
			<PhoneLookupForm
				onLookup={(phone) => setFound(phone === account.phoneNumber)}
			/>
			{found === true ? (
				<RoleForm
					key={current.role}
					account={current}
					changeRole={async (args) => {
						await change(args);
						setCurrent({ ...current, role: args.role });
					}}
				/>
			) : null}
			{found === false ? (
				<output>
					No account with that exact verified phone number was found.
				</output>
			) : null}
		</AccountAccessContent>
	);
}

function RevokedManager() {
	const [role, setRole] = useState<"admin" | "user">("admin");
	return (
		<>
			<Button onClick={() => setRole("user")}>
				Simulate server-confirmed revocation
			</Button>
			<AccountAccessContent accountRole={role}>
				<PhoneLookupForm onLookup={fn()} />
			</AccountAccessContent>
		</>
	);
}
