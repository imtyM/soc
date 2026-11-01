/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses render props for field inference. */
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { FieldGroup, FieldLegend, FieldSet } from "~/components/ui/field";
import { apportion, money } from "../../../convex/schema/giving_plan_math";
import { intent, type PlanDraft } from "./draft";
import type { usePlanEditor } from "./use-plan-editor";

type Editor = ReturnType<typeof usePlanEditor>;
export function PlanForm({
	editor,
	guest,
}: {
	editor: Editor;
	guest: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Monthly giving plan</CardTitle>
				<CardDescription>
					Choose a total of at least R50 and a percentage mix. Saving a plan
					does not start payments.
				</CardDescription>
				<editor.form.Subscribe selector={(s) => s.isDirty}>
					{(dirty) => (
						<Badge variant="secondary">
							{!editor.saved
								? "Draft — not funded"
								: dirty
									? "Unsaved changes — not funded"
									: "Saved plan — not funded"}
						</Badge>
					)}
				</editor.form.Subscribe>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						// Guard before TanStack starts another validation/submission lifecycle.
						if (!editor.form.state.isSubmitting) {
							void editor.form.handleSubmit();
						}
					}}
				>
					<editor.form.AppForm>
						<editor.form.Subscribe selector={(s) => s.isSubmitting}>
							{(pending) => (
								<FieldSet disabled={pending}>
									<FieldLegend>Your choices</FieldLegend>
									<FieldGroup>
										<editor.form.AppField
											name="amount"
											children={(field) => (
												<field.FormInput
													label="Monthly total (rand)"
													description="Use whole cents, for example 100.00."
												/>
											)}
										/>
										<editor.form.AppField
											name="selections"
											mode="array"
											children={(field) => (
												<SelectedMix
													editor={editor}
													selections={field.state.value}
												/>
											)}
										/>
										<editor.form.Subscribe selector={(s) => s.values}>
											{(draft) => <PlanPreview draft={draft} />}
										</editor.form.Subscribe>
										<editor.form.FormErrors />
										{editor.feedback && (
											<output aria-live="polite">{editor.feedback}</output>
										)}
										<editor.form.SubmitButton
											label={
												guest
													? "Continue to phone verification"
													: "Save giving plan"
											}
											pendingLabel="Saving…"
										/>
										{!guest && (
											<Button
												type="button"
												variant="outline"
												onClick={() => window.location.reload()}
											>
												Reload saved plan (discard edits)
											</Button>
										)}
									</FieldGroup>
								</FieldSet>
							)}
						</editor.form.Subscribe>
					</editor.form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
function SelectedMix({
	editor,
	selections,
}: {
	editor: Editor;
	selections: PlanDraft["selections"];
}) {
	if (!selections.length)
		return <p>No organisations selected. Add ready organisations below.</p>;
	return (
		<FieldSet>
			<FieldLegend>Recipient mix</FieldLegend>
			<FieldGroup>
				{selections.map((selection, i) => (
					<div key={selection.organisationId} className="flex flex-col gap-2">
						{selection.isSynthetic && (
							<Badge variant="outline">
								Synthetic example · not a real recipient
							</Badge>
						)}
						<editor.form.AppField
							name={`selections[${i}].percentage`}
							children={(field) => (
								<field.FormInput label={`Share for ${selection.name} (%)`} />
							)}
						/>
						<Button
							type="button"
							variant="outline"
							onClick={() => editor.remove(selection)}
						>
							Remove {selection.name}
						</Button>
					</div>
				))}
			</FieldGroup>
		</FieldSet>
	);
}
function PlanPreview({ draft }: { draft: PlanDraft }) {
	const parsed = intent(draft);
	if (!parsed)
		return (
			<p>
				Review: enter a valid total and make shares total 100% to see exact
				allocations.
			</p>
		);
	const allocations = apportion(
		parsed.monthlyAmountMinor,
		parsed.shares.map((s) => s.units),
		parsed.shares.map((s) => s.organisationId),
	);
	return (
		<section aria-label="Allocation preview" className="flex flex-col gap-2">
			<h2 className="text-lg font-semibold">
				Monthly allocation preview · {money(parsed.monthlyAmountMinor)}
			</h2>
			<ul>
				{draft.selections.map((s, i) => (
					<li key={s.organisationId}>
						{s.name}: {money(allocations?.[i] ?? 0)}
					</li>
				))}
			</ul>
			<p className="text-sm text-muted-foreground">
				Preview only — no contribution has been collected or paid.
			</p>
		</section>
	);
}
