import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { api } from "../../../convex/_generated/api";
import { CatalogueBrowser } from "./catalogue-browser";
import { CatalogueManager } from "./catalogue-manager";

export function Catalogue() {
	return (
		<div className="flex flex-col gap-10">
			<CatalogueBrowser />
			<Suspense fallback={<CatalogueLoading />}>
				<Maintenance />
			</Suspense>
		</div>
	);
}
function Maintenance() {
	const { data } = useSuspenseQuery(
		convexQuery(api.accounts.currentAccess, {}),
	);
	return data?.role === "operator" || data?.role === "admin" ? (
		<CatalogueManager />
	) : null;
}
export function CatalogueLoading() {
	return (
		<output className="text-sm text-muted-foreground">
			Loading catalogue…
		</output>
	);
}
