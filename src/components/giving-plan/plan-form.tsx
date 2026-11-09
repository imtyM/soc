/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses render props for field inference. */
import { ArrowLeftIcon, ArrowRightIcon, MinusIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
} from "~/components/ui/card";
import { FieldSet } from "~/components/ui/field";
import { Progress, ProgressLabel } from "~/components/ui/progress";
import { PlanAllocation } from "./plan-allocation";
import { SelectedMix } from "./selected-mix";
import type { usePlanEditor } from "./use-plan-editor";
import { type PlanStep, usePlanSteps } from "./use-plan-steps";

type Editor = ReturnType<typeof usePlanEditor>;
const steps = [
	{
		id: 0,
		label: "Amount",
		title: "What feels right each month?",
		description: "Start with one monthly total. You can change it any time.",
	},
	{
		id: 1,
		label: "Organisations",
		title: "Who would you like to support?",
		description:
			"Search ready organisations and add the ones that matter to you.",
	},
	{
		id: 2,
		label: "Mix",
		title: "Make the mix yours",
		description: "Adjust a share. The rest balance automatically.",
	},
	{
		id: 3,
		label: "Review",
		title: "Your month of giving, at a glance",
		description: "Check your plan. Saving it does not start payments.",
	},
] as const;
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
	const wizard = usePlanSteps(editor);
	const formId = useId();
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-6">
			<Progress value={wizard.step} max={3} aria-label="Giving plan steps">
				<ProgressLabel>
					Step {wizard.step + 1} of 4 · {steps[wizard.step].label}
				</ProgressLabel>
			</Progress>
			<editor.form.Subscribe selector={(s) => s.isSubmitting}>
				{(pending) => (
					<nav aria-label="Plan steps" className="flex justify-between gap-1">
						{steps.map((item) => (
							<Button
								key={item.id}
								type="button"
								size="sm"
								variant={item.id === wizard.step ? "secondary" : "ghost"}
								aria-current={item.id === wizard.step ? "step" : undefined}
								disabled={pending || item.id > wizard.furthestStep}
								onClick={() => void wizard.go(item.id)}
							>
								{item.id === 1 ? "Choose" : item.label}
							</Button>
						))}
					</nav>
				)}
			</editor.form.Subscribe>
			<Card>
				<CardHeader>
					<h2
						ref={wizard.headingRef}
						tabIndex={-1}
						className="text-xl font-semibold tracking-tight outline-none"
					>
						{steps[wizard.step].title}
					</h2>
					<CardDescription>{steps[wizard.step].description}</CardDescription>
					<editor.form.Subscribe
						selector={(s) => ({
							dirty: s.isDirty,
							count: s.values.selections.length,
						})}
					>
						{(state) => (
							<div className="mt-2 flex flex-wrap gap-2">
								<Badge variant="secondary">
									{!editor.saved
										? "Draft — not funded"
										: state.dirty
											? "Unsaved changes — not funded"
											: "Saved plan — not funded"}
								</Badge>
								{wizard.step === 1 && (
									<Badge variant="outline">{state.count} selected</Badge>
								)}
							</div>
						)}
					</editor.form.Subscribe>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					{wizard.step === 1 && children}
					<editor.form.AppForm>
						<form
							id={formId}
							onSubmit={(event) => {
								event.preventDefault();
								// Guard before starting another validation/submission lifecycle.
								if (editor.form.state.isSubmitting) return;
								if (wizard.step < 3)
									void wizard.go((wizard.step + 1) as PlanStep);
								else void editor.form.handleSubmit();
							}}
						>
							<editor.form.Subscribe selector={(s) => s.isSubmitting}>
								{(pending) => (
									<FieldSet disabled={pending}>
										<editor.form.AppField
											name="amount"
											children={(field) =>
												wizard.step === 0 ? (
													<div className="mx-auto w-full max-w-xs py-8">
														<field.FormInput
															label="Monthly total (rand)"
															inputMode="decimal"
															description="R50 minimum for your whole monthly plan."
														/>
													</div>
												) : null
											}
										/>
										<editor.form.AppField
											name="selections"
											mode="array"
											children={(field) =>
												wizard.step === 2 ? (
													<editor.form.Subscribe selector={(s) => s.values}>
														{(draft) => (
															<PlanAllocation draft={draft}>
																{(chart) => (
																	<SelectedMix
																		editor={editor}
																		selections={field.state.value}
																		amounts={chart.recipients.map(
																			(s) => s.amount,
																		)}
																		onInspect={chart.setActiveId}
																	/>
																)}
															</PlanAllocation>
														)}
													</editor.form.Subscribe>
												) : wizard.step === 1 &&
													field.state.value.length > 0 ? (
													<section
														aria-label="Selected organisations"
														className="flex flex-col gap-3"
													>
														<h3 className="text-sm font-medium">
															In your plan
														</h3>
														<ul className="flex flex-wrap gap-2">
															{field.state.value.map((s) => (
																<li key={s.organisationId}>
																	<Button
																		type="button"
																		variant="outline"
																		size="sm"
																		className="h-auto whitespace-normal text-left"
																		aria-label={`Remove ${s.name}`}
																		onClick={() => editor.remove(s)}
																	>
																		{s.name}
																		<MinusIcon data-icon="inline-end" />
																	</Button>
																</li>
															))}
														</ul>
													</section>
												) : wizard.step === 1 ? (
													<p className="text-sm text-muted-foreground">
														No organisations selected. Add ready organisations
														above.
													</p>
												) : null
											}
										/>
										{wizard.step === 3 && (
											<editor.form.Subscribe selector={(s) => s.values}>
												{(draft) => <PlanAllocation draft={draft} />}
											</editor.form.Subscribe>
										)}
									</FieldSet>
								)}
							</editor.form.Subscribe>
						</form>
						{wizard.step === 3 && <editor.form.FormErrors />}
					</editor.form.AppForm>
					{(wizard.feedback || editor.feedback) && (
						<output className="text-sm leading-relaxed" aria-live="polite">
							{editor.feedback ?? wizard.feedback}
						</output>
					)}
					{wizard.step === 3 && (
						<editor.form.Subscribe selector={(s) => s.isSubmitting}>
							{(pending) => (
								<div className="flex flex-wrap gap-2">
									{steps.slice(0, 3).map((item) => (
										<Button
											type="button"
											variant="outline"
											size="sm"
											key={item.id}
											disabled={pending}
											onClick={() => void wizard.go(item.id)}
										>
											Edit {item.label.toLowerCase()}
										</Button>
									))}
								</div>
							)}
						</editor.form.Subscribe>
					)}
				</CardContent>
				<CardFooter className="flex flex-col gap-4">
					<editor.form.Subscribe selector={(s) => s.isSubmitting}>
						{(pending) => (
							<div className="flex w-full items-center justify-between gap-4">
								<Button
									type="button"
									variant="ghost"
									disabled={pending || wizard.step === 0}
									onClick={() => void wizard.go((wizard.step - 1) as PlanStep)}
								>
									<ArrowLeftIcon data-icon="inline-start" />
									Back
								</Button>
								{wizard.step < 3 ? (
									<Button type="submit" form={formId}>
										Continue
										<ArrowRightIcon data-icon="inline-end" />
									</Button>
								) : (
									<editor.form.AppForm>
										<editor.form.SubmitButton
											form={formId}
											label={
												guest ? "Continue to verify phone" : "Save giving plan"
											}
											pendingLabel="Saving…"
										/>
									</editor.form.AppForm>
								)}
							</div>
						)}
					</editor.form.Subscribe>
					{wizard.step === 3 && (
						<p className="text-sm leading-relaxed text-muted-foreground">
							{guest
								? "Verify your phone to save. Your draft stays in this tab through sign-in."
								: "Only you can see and edit your plan."}{" "}
							Saving does not start payments.
						</p>
					)}
					{!guest && wizard.step === 3 && (
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
				</CardFooter>
			</Card>
			{wizard.step === 3 && phone}
		</div>
	);
}
