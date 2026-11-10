import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { expect, fn, userEvent } from "storybook/test";
import { PhoneAuthContent } from "~/components/auth/phone-auth";
import type { PhoneAuthActions } from "~/components/auth/phone-auth/use-phone-auth";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import { AccountEntryContent, SignOutButton } from ".";
import { AccountIdentity } from "./account-identity";
import { type SignOutActions, useSignOut } from "./use-sign-out";

// Controlled presentation only: no real identity, session, SMS or network calls.
const sendOtp = fn<PhoneAuthActions["sendOtp"]>();
const verifyOtp = fn<PhoneAuthActions["verifyOtp"]>();
const onSignedIn = fn();
const signOut = fn<SignOutActions["signOut"]>();
const onSignedOut = fn();
const phoneNumber = "+27821234567";
const privateDetail = "PRIVATE_CONTROLLED_FAILURE";
const meta = {
	title: "Auth/Account Entry",
	component: AccountEntryContent,
	parameters: { layout: "fullscreen" },
	args: { phase: "signed-out" },
	beforeEach: () => {
		sendOtp.mockReset().mockResolvedValue({ data: { message: "code sent" } });
		verifyOtp.mockReset().mockResolvedValue({
			data: { status: true, token: "synthetic-controlled-proof" },
		});
		onSignedIn.mockReset();
		signOut.mockReset().mockResolvedValue({});
		onSignedOut.mockReset();
	},
	render: (args) => (
		<AccountEntryContent
			{...args}
			phoneAuth={
				<PhoneAuthContent
					sendOtp={sendOtp}
					verifyOtp={verifyOtp}
					onSignedIn={onSignedIn}
				/>
			}
		/>
	),
} satisfies Meta<typeof AccountEntryContent>;
export default meta;
type Story = StoryObj<typeof meta>;
type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

async function enterPhone(canvas: Canvas) {
	await userEvent.type(
		canvas.getByRole("textbox", { name: "Phone number" }),
		phoneNumber,
	);
	await userEvent.keyboard("{Enter}");
	return canvas.findByRole("textbox", { name: "One-time password" });
}

export const PhoneNumber: Story = {};
export const MobilePhoneNumber: Story = {
	globals: { viewport: { value: "mobile1" } },
};
export const Code: Story = {
	play: async ({ canvas }) => {
		const code = await enterPhone(canvas);
		await expect(code).toHaveFocus();
		await expect(code).toHaveAttribute("inputmode", "numeric");
		await expect(code).toHaveAttribute("autocomplete", "one-time-code");
		await expect(
			canvas.getByRole("button", { name: "Resend SMS code" }),
		).toHaveClass("text-primary", "hover:underline");
	},
};
export const MobileCode: Story = {
	...Code,
	globals: { viewport: { value: "mobile1" } },
};
export const Unavailable: Story = {
	play: async ({ canvas }) => {
		sendOtp.mockResolvedValueOnce({
			error: { code: "PHONE_AUTH_UNAVAILABLE", message: privateDetail },
		});
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Phone number" }),
			phoneNumber,
		);
		await userEvent.keyboard("{Enter}");
		const feedback = await canvas.findByRole("status");
		await expect(feedback).toHaveTextContent(
			"SMS sign-in is temporarily unavailable",
		);
		await expect(feedback).toHaveAttribute("data-kind", "error");
		await expect(canvas.queryByText(privateDetail)).not.toBeInTheDocument();
		await expect(
			canvas.getByRole("button", { name: "Send SMS code" }),
		).toBeEnabled();
	},
};
export const CodeFailure: Story = {
	play: async ({ canvas }) => {
		verifyOtp.mockResolvedValueOnce({
			error: { code: "PHONE_AUTH_INVALID_CODE", message: privateDetail },
		});
		const code = await enterPhone(canvas);
		await userEvent.type(code, "000000");
		await userEvent.keyboard("{Enter}");
		await expect(canvas.getByRole("status")).toHaveAttribute(
			"data-kind",
			"error",
		);
		await expect(code).toHaveValue("000000");
		await expect(onSignedIn).not.toHaveBeenCalled();
	},
};
export const Sending: Story = {
	play: async ({ canvas }) => {
		sendOtp.mockImplementationOnce(() => new Promise(() => {}));
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Phone number" }),
			phoneNumber,
		);
		await userEvent.keyboard("{Enter}");
		await expect(
			canvas.getByRole("button", { name: "Sending…" }),
		).toBeDisabled();
	},
};
export const SessionLoading: Story = { args: { phase: "loading" } };
export const SignedIn: Story = { render: () => <ControlledAccount /> };
export const MobileSignedIn: Story = {
	...SignedIn,
	globals: { viewport: { value: "mobile1" } },
};
export const SignOutFailureAndRetry: Story = {
	render: () => <ControlledAccount />,
	play: async ({ canvas }) => {
		signOut.mockResolvedValueOnce({ error: { message: privateDetail } });
		signOut.mockRejectedValueOnce(new Error(privateDetail));
		for (let i = 0; i < 2; i++) {
			await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
			await expect(await canvas.findByRole("alert")).toHaveTextContent(
				GENERIC_ERROR_MESSAGE,
			);
			await expect(canvas.queryByText(privateDetail)).not.toBeInTheDocument();
			await expect(
				canvas.getByRole("region", { name: "Signed-in account" }),
			).toBeVisible();
			await expect(onSignedOut).not.toHaveBeenCalled();
		}
		await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
		await expect(onSignedOut).toHaveBeenCalledTimes(1);
		await expect(
			canvas.queryByText("Controlled workspace content"),
		).not.toBeInTheDocument();
	},
};
export const SignOutPending: Story = {
	render: () => <ControlledAccount />,
	play: async ({ canvas }) => {
		signOut.mockImplementationOnce(() => new Promise(() => {}));
		await userEvent.click(canvas.getByRole("button", { name: "Sign out" }));
		await expect(canvas.getByRole("status")).toHaveTextContent(
			"Closing your account session safely",
		);
		await expect(
			canvas.queryByRole("region", { name: "Signed-in account" }),
		).not.toBeInTheDocument();
		await expect(
			canvas.queryByText("Controlled workspace content"),
		).not.toBeInTheDocument();
		await expect(signOut).toHaveBeenCalledTimes(1);
	},
};

function ControlledAccount() {
	const actions = useSignOut({ signOut, onSignedOut });
	return (
		<AccountEntryContent
			phase={actions.signingOut ? "signing-out" : "signed-in"}
			signOutError={actions.signOutError}
			workspace={
				<div className="flex flex-col gap-6">
					<AccountIdentity phoneNumber={phoneNumber}>
						<SignOutButton onClick={actions.handleSignOut} />
					</AccountIdentity>
					<p className="text-sm text-muted-foreground">
						Controlled workspace content
					</p>
				</div>
			}
		/>
	);
}
