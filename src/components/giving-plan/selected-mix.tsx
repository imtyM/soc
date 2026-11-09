/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses render props for field inference. */
import { MinusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import { FieldGroup, FieldLegend, FieldSet } from "~/components/ui/field";
import { money } from "../../../convex/schema/giving_plan_math";
import type { PlanDraft } from "./draft";
import { ShareSlider } from "./share-slider";
import type { usePlanEditor } from "./use-plan-editor";

type Editor = ReturnType<typeof usePlanEditor>;
export function SelectedMix({
	editor,
	selections,
	amounts,
	onInspect,
}: {
	editor: Editor;
	selections: PlanDraft["selections"];
	amounts: readonly (number | null)[];
	onInspect: (id: string) => void;
}) {
	return (
		<FieldSet>
			<FieldLegend className="sr-only">Recipient mix</FieldLegend>
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
					<p className="pb-4 text-xs text-muted-foreground">
						Drag or type a share. The others balance automatically to keep 100%.
						{selections.length === 1 && " One organisation receives 100%."}
					</p>
					{selections.map((selection, i) => (
						<editor.form.AppField
							key={selection.organisationId}
							name={`selections[${i}].percentage`}
							children={(field) => (
								<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0">
									<div className="flex min-w-0 flex-col gap-1">
										<Button
											type="button"
											variant="ghost"
											className="h-auto justify-start whitespace-normal px-0 text-left"
											aria-label={`Inspect ${selection.name}`}
											onClick={() => onInspect(selection.organisationId)}
										>
											{selection.name}:{" "}
											{typeof amounts[i] === "number" ? money(amounts[i]) : "—"}
										</Button>
										{selection.isSynthetic && (
											<p className="text-xs text-muted-foreground">
												Synthetic example · not a real recipient
											</p>
										)}
									</div>
									<div className="flex items-center gap-2">
										<div className="w-20">
											<field.FormInput
												label={`Share for ${selection.name} (%)`}
												labelVisuallyHidden
												inputMode="decimal"
												readOnly={
													selections.length === 1 &&
													selection.percentage === "100.00"
												}
												onValueChange={(value) =>
													editor.editShare(selection.organisationId, value)
												}
												onBlur={editor.finishShareEdit}
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
									<editor.form.Subscribe selector={(s) => s.isSubmitting}>
										{(pending) => (
											<ShareSlider
												name={selection.name}
												value={field.state.value}
												onChange={(value) =>
													editor.editShare(selection.organisationId, value)
												}
												onFinish={editor.finishShareEdit}
												disabled={
													pending ||
													(selections.length === 1 &&
														selection.percentage === "100.00")
												}
												onInspect={() => onInspect(selection.organisationId)}
											/>
										)}
									</editor.form.Subscribe>
								</div>
							)}
						/>
					))}
				</FieldGroup>
			)}
		</FieldSet>
	);
}
