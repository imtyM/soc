import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { CatalogueSearch } from "~/components/catalogue/catalogue-browser";
import { PageNavigation } from "~/components/catalogue/catalogue-entries";
import { useCataloguePages } from "~/components/catalogue/use-catalogue-pages";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { api } from "../../../convex/_generated/api";
import type { PlanSelection } from "./draft";

type Choice = Omit<PlanSelection, "percentage"> & { description: string };
type ChoiceActions = {
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
			<h2 className="text-lg font-semibold">Add ready organisations</h2>
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
}: ChoiceActions & { entries: Choice[] }) {
	if (!entries.length)
		return (
			<p>
				No matching ready organisations. You can keep editing your draft or
				browse again later.
			</p>
		);
	return (
		<ul className="flex flex-col gap-4">
			{entries.map((e) => (
				<li key={e.organisationId}>
					<Card>
						<CardHeader>
							<CardTitle>{e.name}</CardTitle>
							<CardDescription>{e.description}</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							{e.isSynthetic && (
								<Badge variant="outline">
									Synthetic example · not a real recipient
								</Badge>
							)}
							<Button
								type="button"
								variant="outline"
								disabled={disabled}
								onClick={() =>
									onAdd({
										organisationId: e.organisationId,
										name: e.name,
										isSynthetic: e.isSynthetic,
									})
								}
							>
								Add {e.name}
							</Button>
						</CardContent>
					</Card>
				</li>
			))}
		</ul>
	);
}
