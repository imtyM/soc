import { createFileRoute, Link } from "@tanstack/react-router";
import { GivingPlan, PlanLoading } from "~/components/giving-plan";
import { GivingPlanLayout } from "~/components/giving-plan/page-layout";
import { PlanError } from "~/components/giving-plan/plan-error";
import { buttonVariants } from "~/components/ui/button";

export const Route = createFileRoute("/app/giving-plan")({
	component: GivingPlanPage,
	pendingComponent: PlanLoading,
	errorComponent: PlanError,
});
function GivingPlanPage() {
	return (
		<GivingPlanLayout
			navigation={
				<>
					<Link
						to="/app/catalogue"
						className={buttonVariants({ variant: "ghost", size: "sm" })}
					>
						Browse catalogue
					</Link>
					<Link
						to="/"
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						Account
					</Link>
				</>
			}
		>
			<GivingPlan />
		</GivingPlanLayout>
	);
}
