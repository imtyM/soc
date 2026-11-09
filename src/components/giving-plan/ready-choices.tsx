import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { CatalogueSearch } from "~/components/catalogue/catalogue-browser";
import { PageNavigation } from "~/components/catalogue/catalogue-entries";
import { useCataloguePages } from "~/components/catalogue/use-catalogue-pages";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import { api } from "../../../convex/_generated/api";
import type { PlanSelection } from "./draft";

type Choice = Omit<PlanSelection, "percentage"> & { description: string };
type ChoiceActions = {
	selectedIds?: readonly string[];
	disabled: boolean;
	onAdd: (entry: Omit<PlanSelection, "percentage">) => void;
};
export function ReadyChoices(actions: ChoiceActions) {
	const [search, setSearch] = useState("");
	const pages = useCataloguePages();
	return (
		<section
			aria-label="Choose ready organisations"
			className="flex flex-col gap-4"
		>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold">Add ready organisations</h2>
				<p className="text-sm text-muted-foreground">
					Find an organisation and add it to your mix.
				</p>
			</div>
			<fieldset disabled={actions.disabled}>
				<CatalogueSearch
					onSearch={(value) => {
						setSearch(value);
						pages.reset();
					}}
				/>
			</fieldset>
			<Suspense fallback={<output>Loading ready organisations…</output>}>
				<ReadyResults {...actions} search={search} pages={pages} />
			</Suspense>
		</section>
	);
}
function ReadyResults({
	search,
	pages,
	...actions
}: ChoiceActions & {
	search: string;
	pages: ReturnType<typeof useCataloguePages>;
}) {
	const { data } = useSuspenseQuery(
		convexQuery(api.catalogue.list, { search, paginationOpts: pages.options }),
	);
	return (
		<>
			<AvailableOrganisations
				{...actions}
				entries={data.page.map((e) => ({ ...e, organisationId: e._id }))}
			/>
			<PageNavigation
				label="Organisation choices pages"
				hasPrevious={pages.hasPrevious}
				hasNext={!data.isDone}
				onPrevious={pages.previous}
				onNext={() => pages.next(data.continueCursor)}
			/>
		</>
	);
}
export function AvailableOrganisations({
	entries,
	disabled,
	onAdd,
	selectedIds = [],
}: ChoiceActions & { entries: Choice[] }) {
	if (!entries.length)
		return (
			<Empty className="border p-6">
				<EmptyHeader>
					<EmptyTitle>No organisations to show</EmptyTitle>
					<EmptyDescription>
						No matching ready organisations. You can keep editing your draft or
						browse again later.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	return (
		<ul className="flex flex-col divide-y divide-border">
			{entries.map((e) => {
				const selected = selectedIds.includes(e.organisationId);
				return (
					<li
						key={e.organisationId}
						className="flex items-start justify-between gap-4 py-4"
					>
						<div className="flex min-w-0 flex-col gap-1">
							<h3 className="break-words text-sm font-medium">{e.name}</h3>
							<p className="break-words text-sm leading-relaxed text-muted-foreground">
								{e.description}
							</p>
							{e.isSynthetic && (
								<p className="text-xs text-muted-foreground">
									Synthetic example · not a real recipient
								</p>
							)}
						</div>
						<Button
							type="button"
							size="sm"
							variant={selected ? "ghost" : "outline"}
							disabled={disabled || selected}
							aria-label={`${selected ? "Added" : "Add"} ${e.name}`}
							onClick={() =>
								onAdd({
									organisationId: e.organisationId,
									name: e.name,
									isSynthetic: e.isSynthetic,
								})
							}
						>
							{selected ? (
								<CheckIcon data-icon="inline-start" />
							) : (
								<PlusIcon data-icon="inline-start" />
							)}
							{selected ? "Added" : "Add"}
						</Button>
					</li>
				);
			})}
		</ul>
	);
}
