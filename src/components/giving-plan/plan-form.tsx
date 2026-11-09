/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses render props for field inference. */
import { MinusIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import { FieldGroup, FieldLegend, FieldSet } from "~/components/ui/field";
import { Separator } from "~/components/ui/separator";
import { apportion, money } from "../../../convex/schema/giving_plan_math";
import { intent, type PlanDraft } from "./draft";
import type { usePlanEditor } from "./use-plan-editor";

type Editor = ReturnType<typeof usePlanEditor>;
export function PlanForm({
	editor,
	guest,
	children,
	phone,
}: {
	editor: Editor;
	guest: boolean;
	children?: ReactNode;
	phone?: ReactNode;
}) {
	const formId = useId();
	return (
		<div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
			<div className="min-w-0 lg:col-span-2">
				<Card>
					<CardHeader>
						<CardTitle>Make giving part of your month</CardTitle>
						<CardDescription>
							One monthly total. A mix that’s yours to choose.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							id={formId}
							onSubmit={(event) => {
								event.preventDefault();
								// Guard before TanStack starts another validation/submission lifecycle.
								if (!editor.form.state.isSubmitting)
									void editor.form.handleSubmit();
							}}
						>
							<editor.form.AppForm>
								<editor.form.Subscribe selector={(s) => s.isSubmitting}>
									{(pending) => (
										<FieldSet disabled={pending}>
											<FieldLegend className="sr-only">
												Your choices
											</FieldLegend>
											<FieldGroup>
												<div className="max-w-xs">
													<editor.form.AppField
														name="amount"
														children={(field) => (
															<field.FormInput
																label="Monthly total (rand)"
																inputMode="decimal"
																description="R50 minimum for your whole monthly plan."
															/>
														)}
													/>
												</div>
												<Separator />
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
											</FieldGroup>
										</FieldSet>
									)}
								</editor.form.Subscribe>
							</editor.form.AppForm>
						</form>
					</CardContent>
				</Card>
			</div>
			<aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:col-start-3 lg:row-span-2 lg:row-start-1">
				<Card>
					<CardHeader>
						<CardTitle>Your monthly plan</CardTitle>
						<editor.form.Subscribe selector={(s) => s.isDirty}>
							{(dirty) => (
								<Badge variant="secondary" className="mt-2 w-fit">
									{!editor.saved
										? "Draft — not funded"
										: dirty
											? "Unsaved changes — not funded"
											: "Saved plan — not funded"}
								</Badge>
							)}
						</editor.form.Subscribe>
					</CardHeader>
					<CardContent className="flex flex-col gap-5">
						<editor.form.Subscribe selector={(s) => s.values}>
							{(draft) => <PlanPreview draft={draft} />}
						</editor.form.Subscribe>
						<Separator />
						<editor.form.AppForm>
							<FieldGroup className="gap-3">
								<editor.form.FormErrors />
								{editor.feedback && (
									<output
										className="text-sm leading-relaxed"
										aria-live="polite"
									>
										{editor.feedback}
									</output>
								)}
								<editor.form.SubmitButton
									form={formId}
									size="lg"
									label={
										guest ? "Continue to verify phone" : "Save giving plan"
									}
									pendingLabel="Saving…"
								/>
								<p className="text-sm leading-relaxed text-muted-foreground">
									{guest
										? "Verify your phone to save. Your draft stays in this tab through sign-in."
										: "Only you can see and edit your plan."}{" "}
									Saving does not start payments.
								</p>
								{!guest && (
									<editor.form.Subscribe selector={(s) => s.isSubmitting}>
										{(pending) => (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={pending}
												onClick={() => window.location.reload()}
												aria-label="Reload saved plan (discard edits)"
											>
												Discard edits & reload
											</Button>
										)}
									</editor.form.Subscribe>
								)}
							</FieldGroup>
						</editor.form.AppForm>
					</CardContent>
				</Card>
				{phone}
			</aside>
			<div className="min-w-0 lg:col-span-2">{children}</div>
		</div>
	);
}
function SelectedMix({
	editor,
	selections,
}: {
	editor: Editor;
	selections: PlanDraft["selections"];
}) {
	return (
		<FieldSet>
			<FieldLegend>Recipient mix</FieldLegend>
			<p className="-mt-4 text-sm leading-relaxed text-muted-foreground">
				Choose who to support, then adjust their shares to total 100%. Adding or
				removing an organisation keeps your existing proportions.
			</p>
			{!selections.length ? (
				<Empty className="border p-6">
					<EmptyHeader>
						<EmptyTitle>Your mix starts here</EmptyTitle>
						<EmptyDescription>
							No organisations selected. Add ready organisations below.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<FieldGroup className="gap-0">
					{selections.map((selection, i) => (
						<div
							key={selection.organisationId}
							className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
						>
							<div className="flex min-w-0 flex-col gap-1">
								<p className="break-words text-sm font-medium">
									{selection.name}
								</p>
								{selection.isSynthetic && (
									<p className="text-xs text-muted-foreground">
										Synthetic example · not a real recipient
									</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								<div className="w-20">
									<editor.form.AppField
										name={`selections[${i}].percentage`}
										children={(field) => (
											<field.FormInput
												label={`Share for ${selection.name} (%)`}
												labelVisuallyHidden
												inputMode="decimal"
											/>
										)}
									/>
								</div>
								<span
									aria-hidden="true"
									className="text-sm text-muted-foreground"
								>
									%
								</span>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`Remove ${selection.name}`}
									onClick={() => editor.remove(selection)}
								>
									<MinusIcon />
								</Button>
							</div>
						</div>
					))}
				</FieldGroup>
			)}
		</FieldSet>
	);
}
function PlanPreview({ draft }: { draft: PlanDraft }) {
	const parsed = intent(draft);
	if (!parsed)
		return (
			<section aria-label="Allocation preview" className="flex flex-col gap-3">
				<p className="text-sm text-muted-foreground">
					Monthly allocation preview
				</p>
				<p className="text-sm leading-relaxed">
					Review: enter a valid total and make shares total 100% to see exact
					allocations.
				</p>
			</section>
		);
	const allocations = apportion(
		parsed.monthlyAmountMinor,
		parsed.shares.map((s) => s.units),
		parsed.shares.map((s) => s.organisationId),
	);
	return (
		<section aria-label="Allocation preview" className="flex flex-col gap-5">
			<div className="flex flex-col gap-1">
				<h2 className="text-sm text-muted-foreground">
					Monthly allocation preview
				</h2>
				<p className="text-3xl font-semibold tracking-tight tabular-nums">
					{money(parsed.monthlyAmountMinor)}
					<span className="ml-1 text-sm font-normal text-muted-foreground">
						/ month
					</span>
				</p>
			</div>
			<ul className="flex flex-col gap-3">
				{draft.selections.map((s, i) => (
					<li
						key={s.organisationId}
						className="flex items-baseline justify-between gap-4 text-sm"
					>
						<span className="min-w-0 break-words">{s.name}: </span>
						<span className="shrink-0 font-medium tabular-nums">
							{money(allocations?.[i] ?? 0)}
						</span>
					</li>
				))}
			</ul>
			<p className="text-xs leading-relaxed text-muted-foreground">
				Preview only — no contribution has been collected or paid.
			</p>
		</section>
	);
}
