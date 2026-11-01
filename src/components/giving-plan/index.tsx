import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useConvexAuth } from "convex/react";
import { Suspense } from "react";
import { PhoneAuth } from "~/components/auth/phone-auth";
import { api } from "../../../convex/_generated/api";
import { GUEST_DRAFT_KEY, type PlanDraft, persistGuestDraft } from "./draft";
import { PlanForm } from "./plan-form";
import { ReadyChoices } from "./ready-choices";
import { type SavedPlan, useInitialPlan } from "./use-initial-plan";
import { usePlanEditor } from "./use-plan-editor";
export function GivingPlan() {
	const auth = useConvexAuth();
	if (auth.isLoading) return <PlanLoading />;
	return (
		<Suspense fallback={<PlanLoading />}>
			{auth.isAuthenticated ? (
				<OwnedPlan />
			) : (
				<InitialPlan key="guest" saved={undefined} />
			)}
		</Suspense>
	);
}
function OwnedPlan() {
	const { data } = useSuspenseQuery(convexQuery(api.givingPlans.mine, {}));
	return data.status === "verified" ? (
		<InitialPlan key="owned" saved={data.plan} />
	) : (
		<InitialPlan key="verification-required" saved={undefined} />
	);
}
function InitialPlan({ saved }: { saved: SavedPlan | undefined }) {
	const initial = useInitialPlan(saved);
	if (!initial) return <PlanLoading />;
	return (
		<PlanWorkspace
			initial={initial.draft}
			initiallyUnsaved={initial.fromGuest}
			version={saved?.version ?? null}
			guest={saved === undefined}
		/>
	);
}
function PlanWorkspace({
	initial,
	initiallyUnsaved,
	version,
	guest,
}: {
	initial: PlanDraft;
	initiallyUnsaved: boolean;
	version: number | null;
	guest: boolean;
}) {
	const save = useConvexMutation(api.givingPlans.save);
	const editor = usePlanEditor({
		initial,
		initiallyUnsaved,
		version,
		save: async (args) => {
			const result = await save(args);
			try {
				window.sessionStorage.removeItem(GUEST_DRAFT_KEY);
			} catch {
				/* No owned values are ever persisted. */
			}
			return result;
		},
		persist: guest
			? (draft) => {
					try {
						return persistGuestDraft(window.sessionStorage, draft);
					} catch {
						return false;
					}
				}
			: undefined,
	});
	return (
		<div className="flex flex-col gap-8">
			<PlanForm editor={editor} guest={guest} />
			<editor.form.Subscribe selector={(s) => s.isSubmitting}>
				{(pending) => <ReadyChoices disabled={pending} onAdd={editor.add} />}
			</editor.form.Subscribe>
			{guest && editor.showAuth && (
				<section
					aria-label="Verify phone to save"
					className="flex flex-col gap-4"
				>
					<h2 className="text-lg font-semibold">
						Verify your phone to save this plan
					</h2>
					<p>
						Your draft stays in this tab through verification and the sign-in
						reload. Saving after verification still does not start payments.
					</p>
					<PhoneAuth />
				</section>
			)}
		</div>
	);
}
export function PlanLoading() {
	return <output>Loading giving plan…</output>;
}
