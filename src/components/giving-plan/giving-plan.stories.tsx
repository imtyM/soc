import { convexQuery } from "@convex-dev/react-query";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexError } from "convex/values";
import { type ReactNode, useState } from "react";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { PhoneAuthContent } from "~/components/auth/phone-auth";
import { CatalogueSearch } from "~/components/catalogue/catalogue-browser";
import { Button } from "~/components/ui/button";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PlanLoading } from ".";
import {
	draftSchema,
	emptyDraft,
	GUEST_DRAFT_KEY,
	type PlanDraft,
	persistGuestDraft,
} from "./draft";
import { GivingPlanLayout } from "./page-layout";
import { PlanAllocation } from "./plan-allocation";
import { PlanError } from "./plan-error";
import { PlanForm } from "./plan-form";
import { AvailableOrganisations } from "./ready-choices";
import { useInitialPlan } from "./use-initial-plan";
import { type EditorOptions, usePlanEditor } from "./use-plan-editor";

// All data, authentication and save results below are controlled presentation fixtures.
// Nothing here calls Convex/Better Auth/Twilio or constitutes a runtime auth bypass.
const entries = ["Orchard", "School", "Shelter", "Garden"].map((name, i) => ({
	organisationId: `synthetic-${i}` as Id<"organisations">,
	name: `Example ${name}`,
	description: [
		"Food-growing skills and access to fresh produce.",
		"Learning resources and support for local classrooms.",
		"A safe place and practical support for families.",
		"Community spaces that bring neighbours together.",
	][i],
	isSynthetic: true,
}));
const chosen: PlanDraft = {
	amount: "100.00",
	selections: entries.slice(0, 3).map((e, i) => ({
		organisationId: e.organisationId,
		name: e.name,
		isSynthetic: true,
		percentage: ["50.00", "30.00", "20.00"][i],
	})),
};
const save = fn<EditorOptions["save"]>();
const signedIn = fn();
const sendOtp = fn().mockResolvedValue({ data: { message: "code sent" } });
const verifyOtp = fn().mockResolvedValue({
	data: { status: true, token: "synthetic-controlled-proof" },
});
const meta = {
	title: "Giving/Giving Plan",
	component: PlanLoading,
	parameters: { layout: "fullscreen" },
	beforeEach: () => {
		save.mockReset().mockImplementation(async (args) => ({
			version: (args.expectedVersion ?? 0) + 1,
		}));
		signedIn.mockClear();
		sendOtp.mockReset().mockResolvedValue({ data: { message: "code sent" } });
		verifyOtp.mockReset().mockResolvedValue({
			data: { status: true, token: "synthetic-controlled-proof" },
		});
	},
} satisfies Meta<typeof PlanLoading>;
export default meta;
type Story = StoryObj<typeof meta>;
type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];
async function nextStep(canvas: Canvas) {
	await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
}
async function reviewFromAmount(canvas: Canvas) {
	await nextStep(canvas);
	await nextStep(canvas);
	await nextStep(canvas);
}

export const BuildAdjustAndSave: Story = {
	render: () => (
		<Workspace options={{ initial: emptyDraft, version: null, save }} />
	),
	play: async ({ canvas }) => {
		await nextStep(canvas);
		await expect(
			canvas.queryByRole("textbox", { name: "Monthly total (rand)" }),
		).not.toBeInTheDocument();
		for (const e of entries.slice(0, 3))
			await userEvent.click(
				canvas.getByRole("button", { name: `Add ${e.name}` }),
			);
		await expect(
			canvas.getByRole("button", { name: "Added Example Orchard" }),
		).toBeDisabled();
		await nextStep(canvas);
		const share = canvas.getByRole("textbox", {
			name: "Share for Example Orchard (%)",
		});
		await userEvent.clear(share);
		await userEvent.type(share, "50");
		const preview = canvas.getByRole("region", { name: "Allocation preview" });
		await expect(preview).toHaveTextContent("Example Orchard: R50.00");
		await expect(preview).toHaveTextContent("Example School: R25.00");
		await expect(preview).toHaveTextContent("Example Shelter: R25.00");
		await nextStep(canvas);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(save).toHaveBeenCalledTimes(1);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Plan saved — not funded",
		);
		await userEvent.click(canvas.getByRole("button", { name: "Edit amount" }));
		const amount = canvas.getByRole("textbox", {
			name: "Monthly total (rand)",
		});
		await userEvent.clear(amount);
		await userEvent.type(amount, "150.00");
		await reviewFromAmount(canvas);
		await expect(
			canvas.getByRole("region", { name: "Allocation preview" }),
		).toHaveTextContent("Example Orchard: R75.00");
		await expect(
			canvas.getByText("Unsaved changes — not funded"),
		).toBeVisible();
		// Native Enter is covered by the Playwright smoke: user-event's keypress
		// simulation only searches descendants, not external form-associated buttons.
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() =>
			expect(save).toHaveBeenLastCalledWith(
				expect.objectContaining({
					monthlyAmountMinor: 15000,
					expectedVersion: 1,
				}),
			),
		);
	},
};
export const ProportionalEdits: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Edit organisations" }),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Add Example Garden" }),
		);
		await nextStep(canvas);
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Orchard (%)" }),
		).toHaveValue("37.50");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example School (%)" }),
		).toHaveValue("22.50");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Garden (%)" }),
		).toHaveValue("25.00");
		await userEvent.click(
			canvas.getByRole("button", { name: "Remove Example Garden" }),
		);
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Orchard (%)" }),
		).toHaveValue("50.00");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example School (%)" }),
		).toHaveValue("30.00");
		await userEvent.click(canvas.getByRole("button", { name: "Amount" }));
		const amount = canvas.getByRole("textbox", {
			name: "Monthly total (rand)",
		});
		await userEvent.clear(amount);
		await userEvent.type(amount, "100.01");
		await nextStep(canvas);
		await nextStep(canvas);
		await expect(
			canvas.getByRole("region", { name: "Allocation preview" }),
		).toHaveTextContent("Example Orchard: R50.01");
		const shelter = canvas.getByRole("textbox", {
			name: "Share for Example Shelter (%)",
		});
		await userEvent.clear(shelter);
		await userEvent.type(shelter, "100");
		await userEvent.click(
			canvas.getByRole("button", { name: "Remove Example Shelter" }),
		);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Give a remaining organisation a positive share",
		);
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Shelter (%)" }),
		).toHaveValue("100");
	},
};
export const ValidationAndEmpty: Story = {
	render: () => (
		<Workspace options={{ initial: emptyDraft, version: null, save }} />
	),
	play: async ({ canvas }) => {
		await nextStep(canvas);
		await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
		await waitFor(() =>
			expect(
				canvas.getByRole("button", { name: "Add Example Orchard" }),
			).toBeEnabled(),
		);
		await expect(save).not.toHaveBeenCalled();
		await userEvent.click(
			canvas.getByRole("button", { name: "Add Example Orchard" }),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Amount" }));
		const amount = canvas.getByRole("textbox", {
			name: "Monthly total (rand)",
		});
		await userEvent.clear(amount);
		await userEvent.type(amount, "49.99");
		await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
		await waitFor(() => expect(amount).toHaveAttribute("aria-invalid", "true"));
		await expect(save).not.toHaveBeenCalled();
		await userEvent.clear(amount);
		await userEvent.type(amount, "50");
		await reviewFromAmount(canvas);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Plan saved — not funded",
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Edit organisations" }),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Remove Example Orchard" }),
		);
		await expect(
			canvas.getByText(
				"No organisations selected. Add ready organisations above.",
			),
		).toBeVisible();
	},
};
export const PendingFailureAndRetry: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		let reject: (e: unknown) => void = () => {};
		save.mockImplementationOnce(
			() =>
				new Promise((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(
			canvas.getByRole("button", { name: "Saving…" }),
		).toBeDisabled();
		await expect(
			canvas.getByRole("button", { name: "Edit amount" }),
		).toBeDisabled();
		const formId = canvas
			.getByRole("button", { name: "Saving…" })
			.getAttribute("form");
		const form = formId ? document.getElementById(formId) : null;
		if (!form) throw new Error("Missing form");
		await fireEvent.submit(form);
		await fireEvent.submit(form);
		await expect(save).toHaveBeenCalledTimes(1);
		reject(
			new ConvexError({
				code: "PLAN_UNAVAILABLE",
				message:
					"An organisation is no longer selectable. Review your mix before saving.",
			}),
		);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"no longer selectable",
		);
		await expect(save).toHaveBeenCalledTimes(1);
		await userEvent.click(canvas.getByRole("button", { name: "Edit amount" }));
		await expect(
			canvas.getByRole("textbox", { name: "Monthly total (rand)" }),
		).toHaveValue("100.00");
		await reviewFromAmount(canvas);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(save).toHaveBeenCalledTimes(2);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Plan saved — not funded",
		);
	},
};
export const UnknownFailureIsGeneric: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		save.mockRejectedValueOnce(new Error("PRIVATE_INTERNAL_FIXTURE_DETAIL"));
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			GENERIC_ERROR_MESSAGE,
		);
		await expect(
			canvas.queryByText("PRIVATE_INTERNAL_FIXTURE_DETAIL"),
		).not.toBeInTheDocument();
	},
};
export const StaleEdit: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		save.mockRejectedValueOnce(
			new ConvexError({
				code: "PLAN_CHANGED",
				message:
					"Your saved plan changed. Reload it before saving these edits.",
			}),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Reload it",
		);
		await expect(
			canvas.getByRole("button", { name: "Reload saved plan (discard edits)" }),
		).toBeEnabled();
	},
};
export const GuestStorageFailure: Story = {
	render: () => (
		<Workspace
			options={{ initial: chosen, version: null, save, persist: () => false }}
			phone={<p>Verification fixture</p>}
		/>
	),
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Continue to verify phone" }),
		);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Tab storage is unavailable",
		);
		await expect(
			canvas.queryByText("Verification fixture"),
		).not.toBeInTheDocument();
		await expect(save).not.toHaveBeenCalled();
	},
};
export const AuthFailureAndRetry: Story = {
	render: () => (
		<Workspace
			options={{ initial: chosen, version: null, save, persist: () => true }}
			phone={
				<PhoneAuthContent
					sendOtp={sendOtp}
					verifyOtp={verifyOtp}
					onSignedIn={signedIn}
				/>
			}
		/>
	),
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Continue to verify phone" }),
		);
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Phone number" }),
			"+27821234567",
		);
		await userEvent.keyboard("{Enter}");
		const code = await canvas.findByRole("textbox", {
			name: "One-time password",
		});
		await userEvent.type(code, "000000");
		verifyOtp.mockResolvedValueOnce({
			error: { message: "PRIVATE_FIXTURE_FAILURE" },
		});
		await userEvent.keyboard("{Enter}");
		await waitFor(() =>
			expect(canvas.getByText(GENERIC_ERROR_MESSAGE)).toBeVisible(),
		);
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("Example Orchard: R50.00");
		await userEvent.click(
			canvas.getByRole("button", { name: "Verify and sign in" }),
		);
		await waitFor(() => expect(signedIn).toHaveBeenCalledTimes(1));
		await expect(save).not.toHaveBeenCalled();
	},
};
export const RetainedGuestIsUnsaved: Story = {
	render: () => (
		<Workspace
			options={{ initial: chosen, version: 3, initiallyUnsaved: true, save }}
		/>
	),
	play: async ({ canvas }) => {
		await expect(
			canvas.getByText("Draft — not funded", { exact: true }),
		).toBeVisible();
		await expect(
			canvas.queryByText("Saved plan — not funded", { exact: true }),
		).not.toBeInTheDocument();
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() =>
			expect(save).toHaveBeenLastCalledWith(
				expect.objectContaining({ expectedVersion: 3 }),
			),
		);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Plan saved — not funded",
		);
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Orchard (%)" }),
		).toHaveValue("50.00");
	},
};
export const GuidedMixValidation: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		const school = await canvas.findByRole("button", {
			name: "Example School: 30.00%, R30.00",
		});
		// Native hit-testing of curved SVG sectors is covered by the browser smoke.
		await fireEvent.mouseOver(school);
		await waitFor(() =>
			expect(
				canvas.getByRole("button", { name: "Example School: 30.00%, R30.00" }),
			).toHaveAttribute("aria-pressed", "true"),
		);
		canvas
			.getByRole("button", { name: "Example School: 30.00%, R30.00" })
			.focus();
		await userEvent.keyboard("{Enter}");
		await expect(save).not.toHaveBeenCalled();
		const field = (name: string) =>
			canvas.getByRole("textbox", { name: `Share for Example ${name} (%)` });
		async function share(name: string, value: string) {
			await userEvent.clear(field(name));
			await userEvent.type(field(name), value);
		}
		await share("School", "20");
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("R57.14");
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Shelter" }),
		).toHaveTextContent("R22.86");
		await userEvent.clear(field("School"));
		await expect(canvas.getByText("Check your shares")).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("—");
		// Even a previously visited Review step cannot bypass validation.
		await userEvent.click(canvas.getByRole("button", { name: "Review" }));
		await nextStep(canvas);
		await expect(
			canvas.getByRole("heading", { name: "Make the mix yours" }),
		).toBeVisible();
		await share("School", "invalid");
		await nextStep(canvas);
		await expect(save).not.toHaveBeenCalled();
		await share("School", "0");
		await share("Shelter", "100");
		await userEvent.click(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		);
		await expect(canvas.getByText("0.00% · R0.00")).toBeVisible();
		await nextStep(canvas);
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Shelter" }),
		).toHaveTextContent("Example Shelter: R100.00");
		await expect(save).not.toHaveBeenCalled();
	},
};
export const GuidedSearchAndBack: Story = {
	render: () => (
		<Workspace options={{ initial: emptyDraft, version: null, save }} />
	),
	play: async ({ canvas }) => {
		const amount = canvas.getByRole("textbox", {
			name: "Monthly total (rand)",
		});
		await userEvent.clear(amount);
		await userEvent.type(amount, "150");
		await nextStep(canvas);
		await waitFor(() =>
			expect(
				canvas.getByRole("heading", { name: "Who would you like to support?" }),
			).toHaveFocus(),
		);
		const search = canvas.getByRole("textbox", {
			name: "Search organisations",
		});
		await userEvent.type(search, "Garden");
		await userEvent.click(canvas.getByRole("button", { name: "Search" }));
		await expect(
			canvas.queryByRole("button", { name: "Add Example Orchard" }),
		).not.toBeInTheDocument();
		await userEvent.click(
			canvas.getByRole("button", { name: "Add Example Garden" }),
		);
		await userEvent.clear(search);
		await userEvent.click(canvas.getByRole("button", { name: "Search" }));
		await userEvent.click(
			canvas.getByRole("button", { name: "Add Example Orchard" }),
		);
		await nextStep(canvas);
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Garden (%)" }),
		).toHaveValue("50.00");
		await userEvent.click(canvas.getByRole("button", { name: "Amount" }));
		await expect(
			canvas.getByRole("textbox", { name: "Monthly total (rand)" }),
		).toHaveValue("150");
		await reviewFromAmount(canvas);
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Garden" }),
		).toHaveTextContent("Example Garden: R75.00");
	},
};
export const SliderKeyboardAndPrecision: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		const slider = () =>
			canvas.getByRole("slider", { name: "Adjust share for Example Orchard" });
		const input = canvas.getByRole("textbox", {
			name: "Share for Example Orchard (%)",
		});
		await expect(slider()).toHaveAttribute("aria-valuenow", "50");
		slider().focus();
		await userEvent.keyboard("{ArrowLeft}");
		await expect(input).toHaveValue("49.99");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example School (%)" }),
		).toHaveValue("30.01");
		await userEvent.keyboard("{PageDown}");
		await expect(input).toHaveValue("48.99");
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("R48.99");
		await userEvent.clear(input);
		await userEvent.type(input, "25.75");
		await expect(slider()).toHaveAttribute("aria-valuenow", "25.75");
		slider().focus();
		await userEvent.keyboard("{Home}");
		await expect(input).toHaveValue("0.00");
		await userEvent.keyboard("{End}");
		await expect(input).toHaveValue("100.00");
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("R100.00");
		await userEvent.clear(input);
		await userEvent.type(input, "invalid");
		await expect(
			canvas.queryByRole("slider", {
				name: "Adjust share for Example Orchard",
			}),
		).not.toBeInTheDocument();
		await expect(
			canvas.getByText("Enter a percentage from 0 to 100 to use the slider."),
		).toBeVisible();
		await userEvent.clear(input);
		await userEvent.type(input, "12.34");
		await expect(slider()).toHaveAttribute("aria-valuenow", "12.34");
		await expect(save).not.toHaveBeenCalled();
	},
};
export const SliderWithoutTyping: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		canvas
			.getByRole("slider", { name: "Adjust share for Example Orchard" })
			.focus();
		await userEvent.keyboard("{Shift>}{ArrowRight>10/}{/Shift}");
		// The same focus/gesture must retain the 30:20 ratio through 100%.
		await userEvent.keyboard("{End}{Shift>}{ArrowLeft>40/}{/Shift}");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Orchard (%)" }),
		).toHaveValue("60.00");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example School (%)" }),
		).toHaveValue("24.00");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Shelter (%)" }),
		).toHaveValue("16.00");
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("R60.00");
		await nextStep(canvas);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() =>
			expect(save).toHaveBeenLastCalledWith(
				expect.objectContaining({
					monthlyAmountMinor: 10000,
					shares: [
						{ organisationId: entries[0].organisationId, units: 6000 },
						{ organisationId: entries[1].organisationId, units: 2400 },
						{ organisationId: entries[2].organisationId, units: 1600 },
					],
				}),
			),
		);
	},
};
export const NumericAutomaticBalance: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		const field = canvas.getByRole("textbox", {
			name: "Share for Example Orchard (%)",
		});
		await userEvent.clear(field);
		await userEvent.type(field, "60");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example School (%)" }),
		).toHaveValue("24.00");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Shelter (%)" }),
		).toHaveValue("16.00");
		await nextStep(canvas);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() =>
			expect(save).toHaveBeenLastCalledWith({
				monthlyAmountMinor: 10000,
				expectedVersion: 1,
				shares: entries.slice(0, 3).map((e, i) => ({
					organisationId: e.organisationId,
					units: [6000, 2400, 1600][i],
				})),
			}),
		);
	},
};
export const ZeroOtherShares: Story = {
	render: () => (
		<Workspace
			options={{
				initial: {
					...chosen,
					selections: chosen.selections.map((s, i) => ({
						...s,
						percentage: i === 0 ? "100.00" : "0.00",
					})),
				},
				version: 1,
				save,
			}}
		/>
	),
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		const field = canvas.getByRole("textbox", {
			name: "Share for Example Orchard (%)",
		});
		await userEvent.clear(field);
		await userEvent.type(field, "60");
		for (const name of ["School", "Shelter"])
			await expect(
				canvas.getByRole("textbox", { name: `Share for Example ${name} (%)` }),
			).toHaveValue("20.00");
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("R60.00");
		await nextStep(canvas);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(save).toHaveBeenCalledTimes(1);
	},
};
export const SingleOrganisation: Story = {
	render: () => (
		<Workspace
			options={{
				initial: {
					...chosen,
					selections: [{ ...chosen.selections[0], percentage: "100.00" }],
				},
				version: 1,
				save,
			}}
		/>
	),
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		await expect(
			canvas.getByRole("slider", { name: "Adjust share for Example Orchard" }),
		).toBeDisabled();
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Orchard (%)" }),
		).toHaveAttribute("readonly");
		await expect(
			canvas.getByRole("button", { name: "Remove Example Orchard" }),
		).toBeEnabled();
	},
};
export const LegacySingleRepair: Story = {
	render: () => (
		<Workspace
			options={{
				initial: { ...chosen, selections: [chosen.selections[0]] },
				version: null,
				save,
			}}
		/>
	),
	play: async ({ canvas }) => {
		await nextStep(canvas);
		await nextStep(canvas);
		const field = canvas.getByRole("textbox", {
			name: "Share for Example Orchard (%)",
		});
		await expect(field).not.toHaveAttribute("readonly");
		await userEvent.clear(field);
		await userEvent.type(field, "60");
		await expect(field).toHaveValue("100.00");
		await expect(field).toHaveAttribute("readonly");
		await nextStep(canvas);
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() =>
			expect(save).toHaveBeenLastCalledWith({
				monthlyAmountMinor: 10000,
				expectedVersion: null,
				shares: [{ organisationId: entries[0].organisationId, units: 10000 }],
			}),
		);
	},
};
// Old/incomplete drafts remain honest. Normal edits can no longer manufacture
// these invalid totals, but a retained legacy draft still must not look saved.
export const LegacyInvalidMix: Story = {
	render: () => <LegacyMix values={["50", "20", "20"]} />,
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("button", { name: "Unallocated: 10.00%" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("—");
	},
};
export const LegacyAllZeroMix: Story = {
	render: () => <LegacyMix values={["0", "0", "0"]} />,
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("button", { name: "Unallocated: 100.00%" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("—");
	},
};
export const LegacyOverAllocatedMix: Story = {
	render: () => <LegacyMix values={["100", "20", "0"]} />,
	play: async ({ canvas }) => {
		await expect(canvas.getByText("Check your shares")).toBeVisible();
		await expect(
			canvas.queryByRole("button", { name: /^Example Orchard: 100/ }),
		).not.toBeInTheDocument();
	},
};
export const DesignGuest: Story = {
	render: () => (
		<Workspace
			options={{ initial: chosen, version: null, save, persist: () => true }}
			phone={<p>Controlled verification fixture — no SMS is sent.</p>}
		/>
	),
};
export const DesignSaved: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
};
export const DesignEmpty: Story = {
	render: () => (
		<Workspace
			options={{
				initial: emptyDraft,
				version: null,
				save,
				persist: () => true,
			}}
		/>
	),
};
export const DesignLongContent: Story = {
	render: () => (
		<Workspace
			options={{
				initial: {
					...chosen,
					selections: chosen.selections.map((s) => ({
						...s,
						name:
							s.name +
							" — Community food, education and family support in the northern district",
					})),
				},
				version: 1,
				save,
			}}
		/>
	),
};
export const DesignManyRecipients: Story = {
	render: () => (
		<Workspace
			options={{
				initial: draftSchema.parse({
					amount: "100.00",
					selections: Array.from({ length: 16 }, (_, i) => ({
						organisationId: `synthetic-many-${i}`,
						name: `Example community organisation ${i + 1}`,
						isSynthetic: true,
						percentage: "6.25",
					})),
				}),
				version: 1,
				save,
			}}
		/>
	),
};
export const MixPreviewFollowsControl: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		const slider = canvas.getByRole("slider", {
			name: "Adjust share for Example Shelter",
		});
		slider.focus();
		await userEvent.keyboard("{PageUp}");
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Shelter (%)" }),
		).toHaveValue("21.00");
		await expect(canvas.getByText("21.00% · R21.00")).toBeVisible();
		await nextStep(canvas);
		await expect(
			canvas.getByRole("heading", {
				name: "Your month of giving, at a glance",
			}),
		).toBeVisible();
	},
};
// addon-vitest applies this viewport before rendering, so the mobile bar (not
// the hidden desktop SVG) is exercised by interaction and accessibility checks.
export const MobileBarEditing: Story = {
	globals: { viewport: { value: "mobile1" } },
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit mix" }));
		const bar = canvas.getByRole("group", { name: "Monthly allocation bar" });
		await expect(bar).toBeVisible();
		await expect(bar.getBoundingClientRect().height).toBe(8);
		const school = canvas.getByRole("button", {
			name: "Example School: 30.00%, R30.00",
		});
		school.focus();
		await userEvent.keyboard(" ");
		await expect(school).toHaveAttribute("aria-pressed", "true");
		await expect(canvas.getByText("30.00% · R30.00")).toBeVisible();
		const field = canvas.getByRole("textbox", {
			name: "Share for Example Orchard (%)",
		});
		await userEvent.clear(field);
		await expect(bar.querySelectorAll("button")).toHaveLength(0);
		await expect(
			canvas.getByText("Check your shares. Exact amounts are unavailable."),
		).toBeVisible();
		await userEvent.type(field, "60");
		await expect(canvas.getByText("60% · R60.00")).toBeVisible();
		const orchard = canvas.getByRole("button", {
			name: "Example Orchard: 60%, R60.00",
		});
		await expect(
			orchard.getBoundingClientRect().width / bar.clientWidth,
		).toBeCloseTo(0.6, 2);
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example School (%)" }),
		).toHaveValue("24.00");
		const slider = canvas.getByRole("slider", {
			name: "Adjust share for Example Orchard",
		});
		slider.focus();
		await userEvent.keyboard("{End}{Shift>}{ArrowLeft>40/}{/Shift}");
		await expect(
			canvas
				.getByRole("button", { name: "Example Orchard: 60.00%, R60.00" })
				.getBoundingClientRect().width / bar.clientWidth,
		).toBeCloseTo(0.6, 2);
		await userEvent.clear(field);
		await userEvent.type(field, "0.01");
		await userEvent.click(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		);
		await expect(canvas.getByText("0.01% · R0.01")).toBeVisible();
		await expect(
			canvas
				.getByRole("button", { name: "Example Orchard: 0.01%, R0.01" })
				.getBoundingClientRect().width,
		).toBeLessThan(1);
		await userEvent.clear(field);
		await userEvent.type(field, "0");
		await userEvent.click(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		);
		await expect(canvas.getByText("0% · R0.00")).toBeVisible();
		await expect(bar.querySelectorAll("button")).toHaveLength(2);
		await nextStep(canvas);
		await expect(
			canvas.getByRole("group", { name: "Monthly allocation bar" }),
		).toBeVisible();
		await expect(save).not.toHaveBeenCalled();
	},
};
export const MobileBarPartial: Story = {
	...LegacyInvalidMix,
	globals: { viewport: { value: "mobile1" } },
};
export const MobileBarAllZero: Story = {
	...LegacyAllZeroMix,
	globals: { viewport: { value: "mobile1" } },
};
export const MobileBarOverAllocated: Story = {
	globals: { viewport: { value: "mobile1" } },
	render: () => <LegacyMix values={["100", "20", "0"]} />,
	play: async ({ canvas }) => {
		await expect(
			canvas
				.getByRole("group", { name: "Monthly allocation bar" })
				.querySelectorAll("button"),
		).toHaveLength(0);
		await expect(
			canvas.getByText("Check your shares. Exact amounts are unavailable."),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Inspect Example Orchard" }),
		).toHaveTextContent("—");
	},
};
export const Loading: Story = {};
export const QueryFailureAndRetry: Story = {
	render: () => <QueryRecovery />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
		await expect(
			await canvas.findByText("Giving plan query reset."),
		).toBeVisible();
	},
};
// Render/a11y tested normally. A separate real browser smoke drives this through
// PhoneAuthContent's success callback and an ACTUAL document reload (not a remount).
export const AuthReload: Story = { render: () => <ReloadFixture /> };

function LegacyMix({ values }: { values: string[] }) {
	return (
		<GivingPlanLayout>
			<PlanAllocation
				draft={{
					...chosen,
					selections: chosen.selections.map((s, i) => ({
						...s,
						percentage: values[i],
					})),
				}}
			/>
		</GivingPlanLayout>
	);
}
function Workspace({
	options,
	phone,
}: {
	options: EditorOptions;
	phone?: ReactNode;
}) {
	const editor = usePlanEditor(options);
	const [search, setSearch] = useState("");
	return (
		<GivingPlanLayout>
			<PlanForm
				editor={editor}
				guest={Boolean(options.persist)}
				phone={editor.showAuth && phone}
			>
				<section
					aria-label="Choose ready organisations"
					className="flex flex-col gap-4"
				>
					<CatalogueSearch onSearch={setSearch} />
					<editor.form.Subscribe selector={(s) => s}>
						{(state) => (
							<AvailableOrganisations
								entries={entries.filter((e) =>
									`${e.name} ${e.description}`
										.toLowerCase()
										.includes(search.toLowerCase()),
								)}
								disabled={state.isSubmitting}
								selectedIds={state.values.selections.map(
									(s) => s.organisationId,
								)}
								onAdd={editor.add}
							/>
						)}
					</editor.form.Subscribe>
				</section>
			</PlanForm>
		</GivingPlanLayout>
	);
}
const RELOAD_AUTH_KEY = "soc.story.giving-plan.verified";
function ReloadFixture() {
	const [verified] = useState(
		() => window.sessionStorage.getItem(RELOAD_AUTH_KEY) === "yes",
	);
	const initial = useInitialPlan(verified ? null : undefined);
	if (!initial) return <PlanLoading />;
	return (
		<>
			<Workspace
				options={{
					initial: initial.draft,
					version: null,
					save: async (args) => {
						window.sessionStorage.removeItem(GUEST_DRAFT_KEY);
						return { version: (args.expectedVersion ?? 0) + 1 };
					},
					persist: verified
						? undefined
						: (draft) => persistGuestDraft(window.sessionStorage, draft),
				}}
				phone={
					<PhoneAuthContent
						sendOtp={async () => ({ data: { message: "code sent" } })}
						verifyOtp={async () => ({
							data: { status: true, token: "synthetic-controlled-proof" },
						})}
						onSignedIn={() => {
							// Story-only boolean, not a real session/token; production never reads it.
							window.sessionStorage.setItem(RELOAD_AUTH_KEY, "yes");
							window.location.reload();
						}}
					/>
				}
			/>
			<Button
				variant="outline"
				onClick={() => {
					window.sessionStorage.removeItem(RELOAD_AUTH_KEY);
					window.sessionStorage.removeItem(GUEST_DRAFT_KEY);
					window.location.reload();
				}}
			>
				Reset synthetic reload fixture
			</Button>
		</>
	);
}
function QueryRecovery() {
	const [client] = useState(() => {
		const value = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		value.setQueryData(convexQuery(api.givingPlans.mine, {}).queryKey, {
			status: "verified",
			plan: null,
		});
		return value;
	});
	const [recovered, setRecovered] = useState(false);
	if (recovered) return <p>Giving plan query reset.</p>;
	return (
		<QueryClientProvider client={client}>
			<PlanError
				error={new Error("PRIVATE_QUERY_DETAIL")}
				reset={() => {
					if (
						client.getQueryData(
							convexQuery(api.givingPlans.mine, {}).queryKey,
						) !== undefined
					)
						throw new Error("Query was not reset");
					setRecovered(true);
				}}
			/>
		</QueryClientProvider>
	);
}
