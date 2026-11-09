import { useEffect, useRef, useState } from "react";
import {
	apportion,
	decimalMinor,
	parseMinor,
	parsePercent,
	SHARE_TOTAL,
} from "../../../convex/schema/giving_plan_math";
import { intent, type PlanDraft } from "./draft";

export function useAllocationChart(draft: PlanDraft) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [hole, setHole] = useState<string | null>(null);
	const chartRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (chartRef.current)
			setHole(
				getComputedStyle(chartRef.current)
					.getPropertyValue("--allocation-hole")
					.trim(),
			);
	}, []);
	const parsed = intent(draft);
	const allocations = parsed
		? apportion(
				parsed.monthlyAmountMinor,
				parsed.shares.map((s) => s.units),
				parsed.shares.map((s) => s.organisationId),
			)
		: null;
	const units = draft.selections.map((s) => parsePercent(s.percentage));
	const total = units.reduce<number>((sum, n) => sum + (n ?? 0), 0);
	const drawable = units.every((n) => n !== null) && total <= SHARE_TOTAL;
	const recipients = draft.selections.map((s, i) => ({
		id: s.organisationId,
		name: s.name,
		units: units[i] ?? 0,
		percentage: s.percentage,
		amount: allocations?.[i] ?? null,
		isSynthetic: s.isSynthetic,
		fill: `var(--chart-${(i % 5) + 1})`,
	}));
	const data = drawable
		? [
				...recipients,
				...(total < SHARE_TOTAL
					? [
							{
								id: "unallocated",
								name: "Unallocated",
								units: SHARE_TOTAL - total,
								percentage: decimalMinor(SHARE_TOTAL - total),
								amount: null,
								isSynthetic: false,
								fill: "var(--secondary)",
							},
						]
					: []),
			]
		: [];
	const byId = new Map(data.map((segment) => [segment.id, segment]));
	const active =
		(activeId === null ? undefined : byId.get(activeId)) ?? data[0];
	return {
		chartRef,
		hole,
		byId,
		recipients,
		data,
		active,
		setActiveId,
		total,
		drawable,
		amount: parseMinor(draft.amount),
	};
}
