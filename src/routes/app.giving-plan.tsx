import { createFileRoute, Link } from "@tanstack/react-router";
import { GivingPlan, PlanLoading } from "~/components/giving-plan";
import { PlanError } from "~/components/giving-plan/plan-error";
import { buttonVariants } from "~/components/ui/button";

export const Route = createFileRoute("/app/giving-plan")({
	component: GivingPlanPage,
	pendingComponent: PlanLoading,
	errorComponent: PlanError,
});
function GivingPlanPage() {
	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
			<header className="flex flex-col gap-3">
				<h1 className="text-3xl font-semibold">Your giving plan</h1>
				<p className="text-muted-foreground">
					Prepare your monthly amount and recipient mix. This is an unfunded
					plan, not a recurring payment.
				</p>
				<nav
					aria-label="Giving plan navigation"
					className="flex flex-wrap gap-3"
				>
					<Link
						to="/app/catalogue"
						className={buttonVariants({ variant: "outline" })}
					>
						Browse catalogue
					</Link>
					<Link to="/" className={buttonVariants({ variant: "outline" })}>
						Account
					</Link>
				</nav>
			</header>
			<GivingPlan />
		</main>
	);
}
