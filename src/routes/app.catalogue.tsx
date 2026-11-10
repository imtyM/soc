import { createFileRoute, Link } from "@tanstack/react-router";
import { Catalogue, CatalogueLoading } from "~/components/catalogue";
import { CatalogueError } from "~/components/catalogue/catalogue-error";
import { buttonVariants } from "~/components/ui/button";

export const Route = createFileRoute("/app/catalogue")({
	component: CataloguePage,
	pendingComponent: CatalogueLoading,
	errorComponent: CatalogueError,
});
function CataloguePage() {
	return (
		<main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
			<header className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
				<div className="flex max-w-xl flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">
						Sea of change
					</p>
					<h1 className="text-3xl font-semibold tracking-tight">
						Giving catalogue
					</h1>
					<p className="text-muted-foreground">
						Find ready organisations to include in your monthly plan. You can
						browse before signing in. No donations are collected here.
					</p>
				</div>
				<nav aria-label="Catalogue navigation" className="flex flex-wrap gap-2">
					<Link to="/app/giving-plan" className={buttonVariants()}>
						Build your giving plan
					</Link>
					<Link to="/" className={buttonVariants({ variant: "outline" })}>
						Account
					</Link>
				</nav>
			</header>
			<div className="max-w-3xl">
				<Catalogue />
			</div>
		</main>
	);
}
