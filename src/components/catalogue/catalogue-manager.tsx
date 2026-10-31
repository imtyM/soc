import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { PageNavigation } from "./catalogue-entries";
import { OrganisationForm } from "./organisation-form";
import { useCataloguePages } from "./use-catalogue-pages";

export type ManagedEntry = Pick<
	Doc<"organisations">,
	"_id" | "name" | "description" | "isReady" | "isSynthetic" | "version"
>;
export function CatalogueManager() {
	const pages = useCataloguePages();
	const { data } = useSuspenseQuery(
		convexQuery(api.catalogue.managementList, {
			paginationOpts: pages.options,
		}),
	);
	const create = useConvexMutation(api.catalogue.create);
	const update = useConvexMutation(api.catalogue.update);
	return (
		<CatalogueManagerContent
			entries={data.page}
			create={create}
			update={update}
			navigation={
				<PageNavigation
					label="Catalogue maintenance pages"
					hasPrevious={pages.hasPrevious}
					hasNext={!data.isDone}
					onPrevious={pages.previous}
					onNext={() => pages.next(data.continueCursor)}
				/>
			}
		/>
	);
}
export function CatalogueManagerContent({
	entries,
	create,
	update,
	navigation,
}: {
	entries: ManagedEntry[];
	create: Parameters<typeof OrganisationForm>[0]["create"];
	update: Parameters<typeof OrganisationForm>[0]["update"];
	navigation?: React.ReactNode;
}) {
	const [editing, setEditing] = useState<ManagedEntry | "new" | null>(null);
	return (
		<section aria-label="Catalogue maintenance" className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Catalogue maintenance</h2>
			<p className="text-sm text-muted-foreground">
				Operator access is checked on every request. A listing flag does not
				establish recipient approval or payment readiness. Do not enter private
				banking or onboarding information.
			</p>
			<Button disabled={editing !== null} onClick={() => setEditing("new")}>
				Add organisation
			</Button>
			{editing !== null ? (
				<OrganisationForm
					key={editing === "new" ? "new" : editing._id}
					entry={editing === "new" ? null : editing}
					create={create}
					update={update}
					onClose={() => setEditing(null)}
				/>
			) : null}
			{entries.length === 0 ? (
				<p>No catalogue entries to maintain.</p>
			) : (
				<ul className="flex flex-col gap-3">
					{entries.map((entry) => (
						<li
							key={entry._id}
							className="flex flex-wrap items-center justify-between gap-3"
						>
							<div className="flex flex-wrap items-center gap-2">
								<span>{entry.name}</span>
								<Badge variant={entry.isReady ? "default" : "outline"}>
									{entry.isReady ? "Listed" : "Not listed"}
								</Badge>
								{entry.isSynthetic ? (
									<Badge variant="secondary">Synthetic example</Badge>
								) : null}
							</div>
							<Button
								variant="outline"
								disabled={editing !== null}
								onClick={() => setEditing(entry)}
								aria-label={`Edit ${entry.name}`}
							>
								Edit
							</Button>
						</li>
					))}
				</ul>
			)}
			{navigation}
		</section>
	);
}
