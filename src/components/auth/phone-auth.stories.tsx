import type { Meta, StoryObj } from "@storybook/tanstack-react";
import type { ComponentProps } from "react";
import {
	expect,
	fireEvent,
	fn,
	mocked,
	userEvent,
	within,
} from "storybook/test";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import { PhoneAuthContent } from "./phone-auth";

type Actions = ComponentProps<typeof PhoneAuthContent>;
type Canvas = ReturnType<typeof within>;

// Reserved example number and synthetic code; these actions never contact auth.
const phoneNumber = "+12025550142";
const code = "000000";
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
		mocked(args.sendOtp).mockReset().mockResolvedValue({});
		mocked(args.verifyOtp).mockReset().mockResolvedValue({});
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
		const generating = canvas.getByRole("button", { name: "Generating…" });
		await expect(generating).toBeDisabled();
		await expect(generating).toHaveAttribute("aria-busy", "true");
		submitAgain(canvas.getByRole("textbox", { name: "Phone number" }));
		await expect(args.sendOtp).toHaveBeenCalledTimes(1);
		send.resolve({});

		const otp = await canvas.findByRole("textbox", {
			name: "One-time password",
		});
		await userEvent.type(otp, code);
		await userEvent.keyboard("{Enter}");
		const verifying = canvas.getByRole("button", { name: "Verifying…" });
		await expect(verifying).toBeDisabled();
		await expect(verifying).toHaveAttribute("aria-busy", "true");
		await expect(
			canvas.getByRole("button", { name: "Use another number" }),
		).toBeDisabled();
		submitAgain(otp);
		await expect(args.verifyOtp).toHaveBeenCalledTimes(1);
		await expect(args.onSignedIn).not.toHaveBeenCalled();
		verify.resolve({ error: { message: providerDetail } });

		await expect(await canvas.findByRole("status")).toHaveTextContent(
			GENERIC_ERROR_MESSAGE,
		);
		await expect(
			canvas.getByRole("button", { name: "Verify and sign in" }),
		).toBeEnabled();
		const back = canvas.getByRole("button", { name: "Use another number" });
		await expect(back).toBeEnabled();
		await userEvent.click(back);
		await expect(
			canvas.getByRole("textbox", { name: "Phone number" }),
		).toBeVisible();
		await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
		await expect(args.onSignedIn).not.toHaveBeenCalled();
	},
};

export const LocalValidationAndKeyboardBack: Story = {
	play: async ({ canvas, args }) => {
		const phone = canvas.getByRole("textbox", { name: "Phone number" });
		await userEvent.click(phone);
		await userEvent.keyboard("{Enter}");
		await expect(
			await within(canvas.getByRole("group")).findByText(
				/Enter a phone number with a country code/,
			),
		).toBeVisible();
		await expect(phone).toHaveAttribute("aria-invalid", "true");
		await expect(args.sendOtp).not.toHaveBeenCalled();
		await enterPhone(canvas);
		const otp = await canvas.findByRole("textbox", {
			name: "One-time password",
		});
		await userEvent.type(otp, "abc");
		await userEvent.keyboard("{Enter}");
		await expect(
			await within(canvas.getByRole("group")).findByText(
				"Enter the six-digit OTP.",
			),
		).toBeVisible();
		await expect(otp).toHaveAttribute("aria-invalid", "true");
		await expect(args.verifyOtp).not.toHaveBeenCalled();
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
		canvas.getByRole("button", { name: "Generate OTP" }),
	).toBeEnabled();
	await expect(
		canvas.queryByRole("textbox", { name: "One-time password" }),
	).not.toBeInTheDocument();
	await userEvent.click(canvas.getByRole("button", { name: "Generate OTP" }));
	const otp = await canvas.findByRole("textbox", { name: "One-time password" });
	await expect(args.sendOtp).toHaveBeenLastCalledWith({ phoneNumber });
	await userEvent.type(otp, code);
	await userEvent.keyboard("{Enter}");
	await expect(canvas.getByRole("status")).toHaveTextContent(
		GENERIC_ERROR_MESSAGE,
	);
	await expect(canvas.queryByText(providerDetail)).not.toBeInTheDocument();
	await expect(otp).toHaveValue(code);
	await expect(
		canvas.getByRole("button", { name: "Verify and sign in" }),
	).toBeEnabled();
	await expect(
		canvas.getByRole("button", { name: "Use another number" }),
	).toBeEnabled();
	await expect(args.onSignedIn).not.toHaveBeenCalled();
	await userEvent.keyboard("{Enter}");
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
		"+1 202 555 0142",
	);
	await userEvent.keyboard("{Enter}");
}

function submitAgain(input: HTMLElement) {
	const form = input.closest("form");
	if (!form) throw new Error("Expected an auth form");
	fireEvent.submit(form);
}

function deferred() {
	let resolve: (value: { error?: unknown }) => void = () => {
		throw new Error("Expected deferred action initialisation");
	};
	const promise = new Promise<{ error?: unknown }>((complete) => {
		resolve = complete;
	});
	return { promise, resolve };
}
