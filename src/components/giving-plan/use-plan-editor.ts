import { useState } from "react";
import { useAppForm } from "~/components/form";
import {
	GENERIC_ERROR_MESSAGE,
	getPublicErrorMessage,
} from "~/lib/public-error";
import {
	apportion,
	decimalMinor,
	parsePercent,
	SHARE_TOTAL,
} from "../../../convex/schema/giving_plan_math";
import {
	formSchema,
	intent,
	type PlanDraft,
	type PlanSelection,
} from "./draft";

export type EditorOptions = {
	initial: PlanDraft;
	version: number | null;
	save: (
		args: NonNullable<ReturnType<typeof intent>> & {
			expectedVersion: number | null;
		},
	) => Promise<{ version: number }>;
	persist?: (draft: PlanDraft) => boolean;
	initiallyUnsaved?: boolean;
};
export function usePlanEditor({
	initial,
	version: initialVersion,
	save,
	persist,
	initiallyUnsaved = false,
}: EditorOptions) {
	const [defaults, setDefaults] = useState(initial);
	const [saved, setSaved] = useState(
		!initiallyUnsaved && initialVersion !== null,
	);
	const [version, setVersion] = useState(initialVersion);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [showAuth, setShowAuth] = useState(false);
	const form = useAppForm({
		defaultValues: defaults,
		validators: { onChange: formSchema },
		listeners: {
			onChange: ({ formApi }) => {
				setFeedback(null);
				if (persist && !persist(formApi.state.values))
					setFeedback(
						"Tab storage is unavailable. Your choices cannot survive sign-in yet. Enable storage and retry before continuing.",
					);
			},
		},
		onSubmit: async ({ value }) => {
			setFeedback(null);
			const parsed = intent(value);
			if (!parsed) return;
			if (persist) {
				if (!persist(value)) {
					setFeedback(
						"Tab storage is unavailable. Enable storage and retry before continuing to sign-in.",
					);
					return;
				}
				setShowAuth(true);
				return;
			}
			try {
				const result = await save({ ...parsed, expectedVersion: version });
				setVersion(result.version);
				setSaved(true);
				// Align React's options with reset's new baseline, not the original snapshot.
				setDefaults(value);
				form.reset(value);
				setFeedback(
					"Plan saved — not funded. No payment has been authorised or collected.",
				);
			} catch (cause) {
				const message = getPublicErrorMessage(cause);
				if (message === GENERIC_ERROR_MESSAGE)
					console.error("Giving plan save failed unexpectedly.");
				setFeedback(message);
			}
		},
	});
	function replace(selections: PlanDraft["selections"]) {
		form.setFieldValue("selections", selections);
		setFeedback(null);
		if (persist && !persist({ ...form.state.values, selections }))
			setFeedback(
				"Tab storage is unavailable. Enable storage and retry before sign-in.",
			);
	}
	function changeSelection(
		entry: Omit<PlanSelection, "percentage">,
		remove = false,
	) {
		if (form.state.isSubmitting) return;
		const old = form.state.values.selections;
		const present = old.some((s) => s.organisationId === entry.organisationId);
		if (present !== remove) return;
		const units = old.map((s) => parsePercent(s.percentage));
		if (
			old.length &&
			(units.some((u) => u === null) ||
				units.reduce<number>((n, u) => n + (u ?? 0), 0) !== SHARE_TOTAL)
		) {
			setFeedback(
				"Make the existing shares total 100% before adding or removing organisations.",
			);
			return;
		}
		const next = remove
			? old.filter((s) => s.organisationId !== entry.organisationId)
			: [...old, { ...entry, percentage: "0" }];
		if (!next.length) {
			replace([]);
			return;
		}
		const weights = remove
			? next.map((s) => parsePercent(s.percentage) ?? 0)
			: [...units.map((u) => (u ?? 0) * old.length), SHARE_TOTAL];
		const split = apportion(
			SHARE_TOTAL,
			weights,
			next.map((s) => s.organisationId),
		);
		if (!split) {
			setFeedback(
				"Give a remaining organisation a positive share before removing this one.",
			);
			return;
		}
		replace(next.map((s, i) => ({ ...s, percentage: decimalMinor(split[i]) })));
	}
	return {
		form,
		feedback,
		saved,
		showAuth,
		version,
		add: (entry: Omit<PlanSelection, "percentage">) => changeSelection(entry),
		remove: (entry: PlanSelection) => changeSelection(entry, true),
	};
}
