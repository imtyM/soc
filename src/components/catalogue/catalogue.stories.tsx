import { convexQuery } from "@convex-dev/react-query";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { expect, fireEvent, fn, userEvent } from "storybook/test";
import { GENERIC_ERROR_MESSAGE } from "~/lib/public-error";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CatalogueLoading } from ".";
import { CatalogueSearch } from "./catalogue-browser";
import { CatalogueEntries, PageNavigation } from "./catalogue-entries";
import { CatalogueError } from "./catalogue-error";
import {
	CatalogueManagerContent,
	type ManagedEntry,
} from "./catalogue-manager";
import { OrganisationForm } from "./organisation-form";
import type { OrganisationFormProps } from "./use-organisation-form";

// Pure synthetic presentation fixtures. No Convex client, auth or provider calls.
const example: ManagedEntry = {
	_id: "fixture-organisation" as Id<"organisations">,
	name: "Example Orchard",
	description: "Synthetic food growing organisation.",
	isReady: true,
	isSynthetic: true,
	version: 1,
};
const create = fn<OrganisationFormProps["create"]>();
const update = fn<OrganisationFormProps["update"]>();
const close = fn();
const meta = {
	title: "Giving/Catalogue",
	component: CatalogueEntries,
	parameters: { layout: "padded" },
	args: { entries: [example], searching: false },
	beforeEach: () => {
		create.mockReset().mockResolvedValue(null);
		update.mockReset().mockResolvedValue(null);
		close.mockClear();
	},
} satisfies Meta<typeof CatalogueEntries>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BrowseAndSearch: Story = {
	render: () => <ControlledBrowse />,
	play: async ({ canvas }) => {
		await expect(
			canvas.getByText("Synthetic example · not a real recipient"),
		).toBeVisible();
		const input = canvas.getByRole("textbox", { name: "Search organisations" });
		await userEvent.type(input, "no match");
		await userEvent.keyboard("{Enter}");
		await expect(
			canvas.getByRole("heading", { name: "No matching organisations" }),
		).toBeVisible();
		await userEvent.clear(input);
		await userEvent.type(input, "growing");
		await userEvent.keyboard("{Enter}");
		await expect(
			canvas.getByRole("heading", { name: example.name }),
		).toBeVisible();
		await userEvent.clear(input);
		await userEvent.click(canvas.getByRole("button", { name: "Search" }));
		await expect(
			canvas.getByRole("heading", { name: example.name }),
		).toBeVisible();
	},
};
export const Empty: Story = { args: { entries: [] } };
export const NoResults: Story = { args: { entries: [], searching: true } };
export const Loading: Story = { render: () => <CatalogueLoading /> };
export const Pagination: Story = {
	render: () => <ControlledPages />,
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole("button", { name: "Previous page" }),
		).toBeDisabled();
		await userEvent.click(canvas.getByRole("button", { name: "Next page" }));
		await expect(
			canvas.getByRole("heading", { name: "Second synthetic example" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("button", { name: "Next page" }),
		).toBeDisabled();
		await userEvent.click(
			canvas.getByRole("button", { name: "Previous page" }),
		);
		await expect(
			canvas.getByRole("heading", { name: example.name }),
		).toBeVisible();
	},
};
export const CreateValidateAndUnlist: Story = {
	render: () => <ControlledManager />,
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Add organisation" }),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Create organisation" }),
		);
		await expect(create).not.toHaveBeenCalled();
		await expect(
			canvas.getByRole("textbox", { name: "Organisation name" }),
		).toHaveAttribute("aria-invalid", "true");
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Organisation name" }),
			"Example Orchard",
		);
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Public description" }),
			example.description,
		);
		await expect(
			canvas.getByRole("checkbox", { name: "Synthetic example" }),
		).toBeChecked();
		await userEvent.click(
			canvas.getByRole("checkbox", { name: "Listed as ready" }),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Create organisation" }),
		);
		await expect(
			await canvas.findByRole("heading", { name: example.name }),
		).toBeVisible();
		await expect(create).toHaveBeenCalledWith({
			name: example.name,
			description: example.description,
			isReady: true,
			isSynthetic: true,
		});
		await userEvent.click(
			canvas.getByRole("button", { name: "Edit Example Orchard" }),
		);
		await userEvent.click(
			canvas.getByRole("checkbox", { name: "Listed as ready" }),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
		await expect(
			await canvas.findByRole("heading", {
				name: "No ready organisations yet",
			}),
		).toBeVisible();
		await expect(canvas.getByText("Not listed")).toBeVisible();
		await expect(update).toHaveBeenCalledWith({
			...exampleFields(),
			id: example._id,
			expectedVersion: 1,
			isReady: false,
		});
	},
};
export const PendingFailureAndRetry: Story = {
	render: () => (
		<OrganisationForm
			entry={example}
			create={create}
			update={update}
			onClose={close}
		/>
	),
	play: async ({ canvas }) => {
		let rejectPending: (reason: unknown) => void = () => {
			throw Error("Missing pending fixture");
		};
		update.mockImplementationOnce(
			() =>
				new Promise((_resolve, reject) => {
					rejectPending = reject;
				}),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
		const pending = canvas.getByRole("button", { name: "Saving…" });
		await expect(pending).toBeDisabled();
		await expect(
			canvas.getByRole("textbox", { name: "Organisation name" }),
		).toBeDisabled();
		await expect(
			canvas.getByRole("button", { name: "Close editor" }),
		).toBeDisabled();
		const form = pending.closest("form");
		if (!form) throw Error("Missing form");
		await fireEvent.submit(form);
		await expect(update).toHaveBeenCalledTimes(1);
		rejectPending(
			new ConvexError({
				code: "CATALOGUE_FORBIDDEN",
				message: "Operator access is required.",
			}),
		);
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			"Operator access is required.",
		);
		await expect(close).not.toHaveBeenCalled();
		await expect(
			canvas.getByRole("textbox", { name: "Organisation name" }),
		).toHaveValue(example.name);
		await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
		await expect(close).toHaveBeenCalledOnce();
	},
};
export const StaleEdit: Story = {
	render: () => (
		<OrganisationForm
			entry={example}
			create={create}
			update={update}
			onClose={close}
		/>
	),
	beforeEach: () => {
		update.mockRejectedValueOnce(
			new ConvexError({
				code: "CATALOGUE_CHANGED",
				message:
					"This organisation changed. Close the editor and reopen it before saving.",
			}),
		);
	},
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			"Close the editor and reopen",
		);
		await expect(close).not.toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("button", { name: "Close editor" }));
		await expect(close).toHaveBeenCalledOnce();
	},
};
export const UnknownFailureIsGeneric: Story = {
	render: () => (
		<OrganisationForm
			entry={example}
			create={create}
			update={update}
			onClose={close}
		/>
	),
	beforeEach: () => {
		update.mockRejectedValueOnce(new Error("PRIVATE_FIXTURE_DETAIL"));
	},
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
		await expect(await canvas.findByRole("alert")).toHaveTextContent(
			GENERIC_ERROR_MESSAGE,
		);
		await expect(
			canvas.queryByText(/PRIVATE_FIXTURE_DETAIL/),
		).not.toBeInTheDocument();
	},
};
const retryClient = new QueryClient();
const retried = fn();
const listKey = convexQuery(api.catalogue.list, {
	search: "",
	paginationOpts: { cursor: null, numItems: 20 },
}).queryKey;
export const QueryFailureAndRetry: Story = {
	render: () => (
		<QueryClientProvider client={retryClient}>
			<CatalogueError
				error={new Error("PRIVATE_QUERY_FIXTURE")}
				reset={retried}
			/>
		</QueryClientProvider>
	),
	beforeEach: () => {
		retried.mockClear();
		retryClient.clear();
		retryClient.setQueryData(listKey, "stale fixture");
		retryClient.setQueryData(["unrelated"], "retain");
	},
	play: async ({ canvas }) => {
		await expect(
			canvas.queryByText(/PRIVATE_QUERY_FIXTURE/),
		).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
		await expect(retried).toHaveBeenCalledOnce();
		await expect(retryClient.getQueryData(listKey)).toBeUndefined();
		await expect(retryClient.getQueryData(["unrelated"])).toBe("retain");
	},
};
function ControlledBrowse() {
	const [search, setSearch] = useState("");
	return (
		<section
			aria-label="Browse synthetic examples"
			className="flex flex-col gap-4"
		>
			<CatalogueSearch onSearch={setSearch} />
			<CatalogueEntries
				searching={Boolean(search)}
				entries={
					example.name
						.concat(example.description)
						.toLowerCase()
						.includes(search.toLowerCase())
						? [example]
						: []
				}
			/>
		</section>
	);
}
function ControlledPages() {
	const [second, setSecond] = useState(false);
	return (
		<>
			<CatalogueEntries
				entries={[
					second ? { ...example, name: "Second synthetic example" } : example,
				]}
				searching={false}
			/>
			<PageNavigation
				hasPrevious={second}
				hasNext={!second}
				onNext={() => setSecond(true)}
				onPrevious={() => setSecond(false)}
			/>
		</>
	);
}
function exampleFields() {
	return {
		name: example.name,
		description: example.description,
		isReady: true,
		isSynthetic: true,
	};
}
function ControlledManager() {
	const [entries, setEntries] = useState<ManagedEntry[]>([]);
	return (
		<div className="flex flex-col gap-8">
			<CatalogueEntries
				entries={entries.filter((entry) => entry.isReady)}
				searching={false}
			/>
			<PageNavigation
				hasPrevious={false}
				hasNext={false}
				onNext={fn()}
				onPrevious={fn()}
			/>
			<CatalogueManagerContent
				navigation={
					<PageNavigation
						label="Catalogue maintenance pages"
						hasPrevious={false}
						hasNext={false}
						onNext={fn()}
						onPrevious={fn()}
					/>
				}
				entries={entries}
				create={async (args) => {
					await create(args);
					setEntries([{ ...args, _id: example._id, version: 1 }]);
				}}
				update={async (args) => {
					await update(args);
					setEntries((previous) =>
						previous.map((entry) =>
							entry._id === args.id
								? {
										...entry,
										name: args.name,
										description: args.description,
										isReady: args.isReady,
										isSynthetic: args.isSynthetic,
										version: entry.version + 1,
									}
								: entry,
						),
					);
				}}
			/>
		</div>
	);
}
