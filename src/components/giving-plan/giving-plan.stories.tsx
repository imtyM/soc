import { convexQuery } from "@convex-dev/react-query";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexError } from "convex/values";
import { type ReactNode, useState } from "react";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { PhoneAuthContent } from "~/components/auth/phone-auth";
import { Button } from "~/components/ui/button";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PlanLoading } from ".";
import {
	emptyDraft,
	GUEST_DRAFT_KEY,
	type PlanDraft,
	persistGuestDraft,
} from "./draft";
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
	description: "Synthetic organisation — not a real recipient.",
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
	parameters: { layout: "padded" },
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

export const BuildAdjustAndSave: Story = {
	render: () => (
		<Workspace options={{ initial: emptyDraft, version: null, save }} />
	),
	play: async ({ canvas }) => {
		for (const e of entries.slice(0, 3))
			await userEvent.click(
				canvas.getByRole("button", { name: `Add ${e.name}` }),
			);
		for (let i = 0; i < 3; i++) {
			const input = canvas.getByRole("textbox", {
				name: `Share for ${entries[i].name} (%)`,
			});
			await userEvent.clear(input);
			await userEvent.type(input, ["50", "30", "20"][i]);
		}
		const preview = canvas.getByRole("region", { name: "Allocation preview" });
		await expect(preview).toHaveTextContent("Example Orchard: R50.00");
		await expect(preview).toHaveTextContent("Example School: R30.00");
		await expect(preview).toHaveTextContent("Example Shelter: R20.00");
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(save).toHaveBeenCalledTimes(1);
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Plan saved — not funded",
		);
		const amount = canvas.getByRole("textbox", {
			name: "Monthly total (rand)",
		});
		await userEvent.clear(amount);
		await userEvent.type(amount, "150.00");
		await expect(
			canvas.getByRole("region", { name: "Allocation preview" }),
		).toHaveTextContent("Example Orchard: R75.00");
		await expect(
			canvas.getByText("Unsaved changes — not funded"),
		).toBeVisible();
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await expect(save).toHaveBeenLastCalledWith(
			expect.objectContaining({
				monthlyAmountMinor: 15000,
				expectedVersion: 1,
			}),
		);
	},
};
export const ProportionalEdits: Story = {
	render: () => <Workspace options={{ initial: chosen, version: 1, save }} />,
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Add Example Garden" }),
		);
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
		const amount = canvas.getByRole("textbox", {
			name: "Monthly total (rand)",
		});
		await userEvent.clear(amount);
		await userEvent.type(amount, "100.01");
		await expect(
			canvas.getByRole("region", { name: "Allocation preview" }),
		).toHaveTextContent("Example Orchard: R50.01");
		for (const [name, percentage] of [
			["Orchard", "0"],
			["School", "0"],
			["Shelter", "100"],
		]) {
			await userEvent.clear(
				canvas.getByRole("textbox", { name: `Share for Example ${name} (%)` }),
			);
			await userEvent.type(
				canvas.getByRole("textbox", { name: `Share for Example ${name} (%)` }),
				percentage,
			);
		}
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
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() =>
			expect(
				canvas.getByRole("button", { name: "Add Example Orchard" }),
			).toBeEnabled(),
		);
		await expect(save).not.toHaveBeenCalled();
		await userEvent.click(
			canvas.getByRole("button", { name: "Add Example Orchard" }),
		);
		const amount = canvas.getByRole("textbox", {
			name: "Monthly total (rand)",
		});
		await userEvent.clear(amount);
		await userEvent.type(amount, "49.99");
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() => expect(amount).toHaveAttribute("aria-invalid", "true"));
		await expect(save).not.toHaveBeenCalled();
		await userEvent.clear(amount);
		await userEvent.type(amount, "50");
		await userEvent.click(
			canvas.getByRole("button", { name: "Save giving plan" }),
		);
		await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			"Plan saved — not funded",
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Remove Example Orchard" }),
		);
		await expect(
			canvas.getByText(
				"No organisations selected. Add ready organisations below.",
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
			canvas.getByRole("textbox", { name: "Monthly total (rand)" }),
		).toBeDisabled();
		const form = canvas
			.getByRole("button", { name: "Saving…" })
			.closest("form");
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
		await expect(
			canvas.getByRole("textbox", { name: "Monthly total (rand)" }),
		).toHaveValue("100.00");
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
			canvas.getByRole("button", { name: "Continue to phone verification" }),
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
			canvas.getByRole("button", { name: "Continue to phone verification" }),
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
			canvas.getByRole("textbox", { name: "Share for Example Orchard (%)" }),
		).toHaveValue("50.00");
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
		await expect(
			canvas.getByRole("textbox", { name: "Share for Example Orchard (%)" }),
		).toHaveValue("50.00");
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

function Workspace({
	options,
	phone,
}: {
	options: EditorOptions;
	phone?: ReactNode;
}) {
	const editor = usePlanEditor(options);
	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-6">
			<PlanForm editor={editor} guest={Boolean(options.persist)} />
			<editor.form.Subscribe selector={(s) => s.isSubmitting}>
				{(pending) => (
					<AvailableOrganisations
						entries={entries}
						disabled={pending}
						onAdd={editor.add}
					/>
				)}
			</editor.form.Subscribe>
			{editor.showAuth && phone}
		</main>
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
