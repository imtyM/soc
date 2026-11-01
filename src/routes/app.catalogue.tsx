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
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
			<header className="flex flex-col items-start gap-3">
				<h1 className="text-2xl font-semibold">Giving catalogue</h1>
				<p className="text-muted-foreground">
					Browse organisations inside the app, before signing in. Synthetic
					examples are not real recipients. This catalogue does not collect
					donations.
				</p>
				<Link to="/app/giving-plan" className={buttonVariants()}>
					Build your giving plan
				</Link>
				<Link to="/" className={buttonVariants({ variant: "outline" })}>
					Account
				</Link>
			</header>
			<Catalogue />
		</main>
	);
}
