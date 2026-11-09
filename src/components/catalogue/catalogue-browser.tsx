/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import z from "zod";
import { useAppForm } from "~/components/form";
import { FieldGroup } from "~/components/ui/field";
import { api } from "../../../convex/_generated/api";
import { CATALOGUE_LIMITS } from "../../../convex/schema/catalogue_validators";
import { CatalogueEntries, PageNavigation } from "./catalogue-entries";
import { useCataloguePages } from "./use-catalogue-pages";

export function CatalogueBrowser() {
	const [search, setSearch] = useState("");
	const pages = useCataloguePages();
	return (
		<section aria-label="Browse organisations" className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Ready organisations</h2>
			<CatalogueSearch
				onSearch={(value) => {
					setSearch(value);
					pages.reset();
				}}
			/>
			<Suspense fallback={<output>Loading organisations…</output>}>
				<BrowseResults search={search} pages={pages} />
			</Suspense>
		</section>
	);
}
export function CatalogueSearch({
	onSearch,
}: {
	onSearch: (value: string) => void;
}) {
	const form = useAppForm({
		defaultValues: searchDefaults,
		validators: { onSubmit: searchSchema },
		onSubmit: ({ value }) => onSearch(value.query.trim()),
	});
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup className="flex-row items-end gap-3">
					<div className="min-w-0 flex-1">
						<form.AppField
							name="query"
							children={(field) => (
								<field.FormInput
									label="Search organisations"
									placeholder="Search names and descriptions"
								/>
							)}
						/>
					</div>
					<form.SubmitButton label="Search" variant="outline" />
				</FieldGroup>
				<form.FormErrors />
			</form.AppForm>
		</form>
	);
}
function BrowseResults({
	search,
	pages,
}: {
	search: string;
	pages: ReturnType<typeof useCataloguePages>;
}) {
	const { data } = useSuspenseQuery(
		convexQuery(api.catalogue.list, { search, paginationOpts: pages.options }),
	);
	return (
		<>
			<CatalogueEntries entries={data.page} searching={search.length > 0} />
			<PageNavigation
				hasPrevious={pages.hasPrevious}
				hasNext={!data.isDone}
				onPrevious={pages.previous}
				onNext={() => pages.next(data.continueCursor)}
			/>
		</>
	);
}
const searchSchema = z.object({
	query: z
		.string()
		.trim()
		.max(CATALOGUE_LIMITS.search, "Use at most 120 characters."),
});
const searchDefaults: z.infer<typeof searchSchema> = { query: "" };
