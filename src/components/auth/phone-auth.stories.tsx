import type { Meta, StoryObj } from "@storybook/tanstack-react";
import type { ComponentProps } from "react";
import {
	expect,
	fireEvent,
	fn,
	mocked,
	userEvent,
	type within,
} from "storybook/test";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import { PhoneAuthContent } from "./phone-auth";

type Actions = ComponentProps<typeof PhoneAuthContent>;
type Canvas = ReturnType<typeof within>;
type Result = Awaited<ReturnType<Actions["sendOtp"]>>;
// Synthetic fixtures only. These actions never contact Better Auth or Twilio.
const phoneNumber = "+27821234567";
const code = "000000";
const sent = { data: { message: "code sent" } };
const verified = {
	data: { status: true, token: "synthetic-controlled-session" },
};
const providerDetail = "INTERNAL_TEST_DETAIL: opaque provider failure";

const meta = {
	title: "Auth/Phone Auth",
	component: PhoneAuthContent,
	parameters: { layout: "centered" },
	args: {
		sendOtp: fn<Actions["sendOtp"]>(),
		verifyOtp: fn<Actions["verifyOtp"]>(),
		onSignedIn: fn<Actions["onSignedIn"]>(),
	},
	beforeEach: ({ args }) => {
		mocked(args.sendOtp).mockReset().mockResolvedValue(sent);
		mocked(args.verifyOtp).mockReset().mockResolvedValue(verified);
		mocked(args.onSignedIn).mockReset();
	},
} satisfies Meta<typeof PhoneAuthContent>;
export default meta;
type Story = StoryObj<typeof meta>;
type StoryArgs = typeof meta.args;

export const ReturnedFailuresAndRetry: Story = {
	play: async ({ canvas, args }) => {
		args.sendOtp.mockResolvedValueOnce({ error: { message: providerDetail } });
		args.verifyOtp.mockResolvedValueOnce({
			error: { message: providerDetail },
		});
		await checkFailureRecovery(canvas, args);
	},
};
export const ThrownFailuresAndRetry: Story = {
	play: async ({ canvas, args }) => {
		args.sendOtp.mockRejectedValueOnce(new Error(providerDetail));
		args.verifyOtp.mockRejectedValueOnce(new Error(providerDetail));
		await checkFailureRecovery(canvas, args);
	},
};
export const PendingPreventsDuplicateSubmissions: Story = {
	play: async ({ canvas, args }) => {
		const send = deferred();
		const verify = deferred();
		args.sendOtp.mockImplementationOnce(() => send.promise);
		args.verifyOtp.mockImplementationOnce(() => verify.promise);
		await enterPhone(canvas);
		const sending = canvas.getByRole("button", { name: "Sending…" });
		await expect(sending).toBeDisabled();
		await expect(sending).toHaveAttribute("aria-busy", "true");
		await submitAgain(canvas.getByRole("textbox", { name: "Phone number" }));
		await expect(args.sendOtp).toHaveBeenCalledTimes(1);
		send.resolve(sent);
		const otp = await canvas.findByRole("textbox", {
			name: "One-time password",
		});
		await userEvent.type(otp, code);
		await userEvent.keyboard("{Enter}");
		await expect(
			canvas.getByRole("button", { name: "Verifying…" }),
		).toBeDisabled();
		await expect(
			canvas.getByRole("button", { name: "Verifying…" }),
		).toHaveAttribute("aria-busy", "true");
		await expect(
			canvas.getByRole("button", { name: "Use another number" }),
		).toBeDisabled();
		await expect(
			canvas.getByRole("button", { name: "Resend SMS code" }),
		).toBeDisabled();
		await submitAgain(otp);
		await expect(args.verifyOtp).toHaveBeenCalledTimes(1);
		await expect(args.onSignedIn).not.toHaveBeenCalled();
		verify.resolve({ error: { message: providerDetail } });
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			GENERIC_ERROR_MESSAGE,
		);
		const back = canvas.getByRole("button", { name: "Use another number" });
		await expect(back).toBeEnabled();
		await userEvent.click(back);
		await expect(
			canvas.getByRole("textbox", { name: "Phone number" }),
		).toBeVisible();
		await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
	},
};
export const LocalValidationAndKeyboardBack: Story = {
	play: async ({ canvas, args }) => {
		const phone = canvas.getByRole("textbox", { name: "Phone number" });
		await userEvent.type(phone, "+12025550142");
		await userEvent.keyboard("{Enter}");
		await expect(phone).toHaveAttribute("aria-invalid", "true");
		await expect(args.sendOtp).not.toHaveBeenCalled();
		await userEvent.clear(phone);
		await enterPhone(canvas);
		const otp = await canvas.findByRole("textbox", {
			name: "One-time password",
		});
		await userEvent.type(otp, "abc");
		await userEvent.keyboard("{Enter}");
		await expect(otp).toHaveAttribute("aria-invalid", "true");
		await expect(args.verifyOtp).not.toHaveBeenCalled();
		await userEvent.click(otp);
		await userEvent.tab();
		await userEvent.tab();
		await userEvent.tab();
		await expect(
			canvas.getByRole("button", { name: "Use another number" }),
		).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect(
			canvas.getByRole("textbox", { name: "Phone number" }),
		).toBeVisible();
		await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
	},
};
export const MalformedVerificationDoesNotSignIn: Story = {
	play: async ({ canvas, args }) => {
		args.verifyOtp
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ data: { status: true, token: null } });
		await enterPhone(canvas);
		const otp = await canvas.findByRole("textbox", {
			name: "One-time password",
		});
		await userEvent.type(otp, code);
		for (let n = 0; n < 2; n++) {
			await userEvent.click(
				canvas.getByRole("button", { name: "Verify and sign in" }),
			);
			await expect(canvas.getByRole("status")).toHaveTextContent(
				GENERIC_ERROR_MESSAGE,
			);
			await expect(args.onSignedIn).not.toHaveBeenCalled();
		}
		await userEvent.click(
			canvas.getByRole("button", { name: "Verify and sign in" }),
		);
		await expect(args.onSignedIn).toHaveBeenCalledTimes(1);
	},
};
export const ResendPendingAndExpiredCode: Story = {
	play: async ({ canvas, args }) => {
		const resend = deferred();
		args.sendOtp
			.mockResolvedValueOnce(sent)
			.mockImplementationOnce(() => resend.promise);
		args.verifyOtp.mockResolvedValueOnce({
			error: { code: "PHONE_AUTH_INVALID_CODE", message: providerDetail },
		});
		await enterPhone(canvas);
		const otp = await canvas.findByRole("textbox", {
			name: "One-time password",
		});
		await userEvent.type(otp, code);
		await userEvent.click(
			canvas.getByRole("button", { name: "Resend SMS code" }),
		);
		await expect(
			canvas.getByRole("button", { name: "Sending…" }),
		).toBeDisabled();
		await expect(
			canvas.getByRole("button", { name: "Verify and sign in" }),
		).toBeDisabled();
		await submitAgain(otp);
		await expect(args.verifyOtp).not.toHaveBeenCalled();
		await expect(args.sendOtp).toHaveBeenCalledTimes(2);
		resend.resolve(sent);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"resends may contain the same code",
		);
		await expect(otp).toHaveValue("");
		await userEvent.type(otp, code);
		await userEvent.click(
			canvas.getByRole("button", { name: "Verify and sign in" }),
		);
		await expect(canvas.getByRole("status")).toHaveTextContent(
			"This code could not be verified",
		);
		await expect(canvas.queryByText(providerDetail)).not.toBeInTheDocument();
		await expect(args.onSignedIn).not.toHaveBeenCalled();
	},
};
export const MonthlyAllowanceAndUnavailable: Story = {
	play: async ({ canvas, args }) => {
		args.sendOtp
			.mockResolvedValueOnce({
				error: { code: "PHONE_AUTH_UNAVAILABLE", message: providerDetail },
			})
			.mockResolvedValueOnce({
				error: { code: "PHONE_AUTH_MONTHLY_LIMIT", message: providerDetail },
			});
		await enterPhone(canvas);
		await expect(canvas.getByRole("status")).toHaveTextContent(
			"SMS sign-in is temporarily unavailable",
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Send SMS code" }),
		);
		await expect(canvas.getByRole("status")).toHaveTextContent(
			"monthly SMS allowance has been reached",
		);
		await expect(canvas.queryByText(providerDetail)).not.toBeInTheDocument();
		await expect(args.onSignedIn).not.toHaveBeenCalled();
	},
};

async function checkFailureRecovery(canvas: Canvas, args: StoryArgs) {
	await enterPhone(canvas);
	await expect(await canvas.findByRole("status")).toHaveTextContent(
		GENERIC_ERROR_MESSAGE,
	);
	await expect(canvas.getByRole("status")).toHaveAttribute(
		"aria-live",
		"polite",
	);
	await expect(canvas.queryByText(providerDetail)).not.toBeInTheDocument();
	await expect(
		canvas.queryByRole("textbox", { name: "One-time password" }),
	).not.toBeInTheDocument();
	await userEvent.click(canvas.getByRole("button", { name: "Send SMS code" }));
	const otp = await canvas.findByRole("textbox", { name: "One-time password" });
	await expect(args.sendOtp).toHaveBeenLastCalledWith({ phoneNumber });
	await userEvent.type(otp, code);
	await userEvent.keyboard("{Enter}");
	await expect(canvas.getByRole("status")).toHaveTextContent(
		GENERIC_ERROR_MESSAGE,
	);
	await expect(canvas.queryByText(providerDetail)).not.toBeInTheDocument();
	await expect(otp).toHaveValue(code);
	await expect(args.onSignedIn).not.toHaveBeenCalled();
	await userEvent.click(
		canvas.getByRole("button", { name: "Verify and sign in" }),
	);
	await expect(args.verifyOtp).toHaveBeenCalledTimes(2);
	await expect(args.verifyOtp).toHaveBeenLastCalledWith({ phoneNumber, code });
	await expect(args.onSignedIn).toHaveBeenCalledTimes(1);
	await expect(canvas.getByRole("status")).toHaveTextContent(
		"Phone number verified. You are signed in.",
	);
}
async function enterPhone(canvas: Canvas) {
	await userEvent.type(
		canvas.getByRole("textbox", { name: "Phone number" }),
		"+27 82 123 4567",
	);
	await userEvent.keyboard("{Enter}");
}
async function submitAgain(input: HTMLElement) {
	const form = input.closest("form");
	if (!form) throw Error("Expected an auth form");
	await fireEvent.submit(form);
}
function deferred() {
	let resolve: (value: Result) => void = () => {
		throw Error("Expected fixture initialisation");
	};
	const promise = new Promise<Result>((complete) => {
		resolve = complete;
	});
	return { promise, resolve };
}
