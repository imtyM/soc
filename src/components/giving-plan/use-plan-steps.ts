import { useEffect, useRef, useState } from "react";
import {
	MINIMUM_MONTHLY_MINOR,
	parseMinor,
} from "../../../convex/schema/giving_plan_math";
import { intent } from "./draft";
import type { usePlanEditor } from "./use-plan-editor";

export type PlanStep = 0 | 1 | 2 | 3;

export function usePlanSteps(editor: ReturnType<typeof usePlanEditor>) {
	const [step, setStep] = useState<PlanStep>(() =>
		intent(editor.form.state.values) ? 3 : 0,
	);
	const [furthestStep, setFurthestStep] = useState(step);
	const [feedback, setFeedback] = useState<string | null>(null);
	const headingRef = useRef<HTMLHeadingElement>(null);
	const previousStep = useRef(step);
	useEffect(() => {
		if (previousStep.current !== step) headingRef.current?.focus();
		previousStep.current = step;
	}, [step]);
	async function go(target: PlanStep) {
		if (editor.form.state.isSubmitting) return;
		setFeedback(null);
		if (target > step) {
			const draft = editor.form.state.values;
			const amount = parseMinor(draft.amount);
			if (amount === null || amount < MINIMUM_MONTHLY_MINOR) {
				editor.form.setFieldMeta("amount", (meta) => ({
					...meta,
					isTouched: true,
				}));
				await editor.form.validateField("amount", "change");
				setStep(0);
				setFeedback("Enter a monthly total of at least R50 to continue.");
				return;
			}
			if (target > 1 && !draft.selections.length) {
				setStep(1);
				setFeedback("Choose at least one organisation to continue.");
				return;
			}
			if (target === 3 && !intent(draft)) {
				await editor.form.validateAllFields("change");
				setStep(2);
				setFeedback(
					"Make your recipient shares total 100% before reviewing your plan.",
				);
				return;
			}
		}
		setStep(target);
		setFurthestStep((previous) => (target > previous ? target : previous));
	}
	return { step, furthestStep, feedback, headingRef, go };
}
