import {
	apportion,
	decimalMinor,
	parsePercent,
	SHARE_TOTAL,
} from "../../../convex/schema/giving_plan_math";
import type { PlanSelection } from "./draft";

/** Balance one deliberate edit, never normalise a draft on load. Baseline weights
 * survive transient invalid typing and a continuous gesture passing through 100%. */
export function balanceShares(
	current: readonly PlanSelection[],
	baseline: readonly PlanSelection[],
	id: string,
	value: string,
): PlanSelection[] | null {
	const target = parsePercent(value);
	const ids = current.map((s) => s.organisationId);
	if (
		target === null ||
		!ids.some((key) => key === id) ||
		new Set(ids).size !== ids.length ||
		baseline.length !== current.length ||
		baseline.some((s, i) => s.organisationId !== ids[i])
	)
		return null;
	if (current.length === 1) return [{ ...current[0], percentage: "100.00" }];
	const others = baseline.filter((s) => s.organisationId !== id);
	const parsed = others.map((s) => parsePercent(s.percentage));
	if (parsed.some((w) => w === null)) return null;
	const weights = parsed.map((w) => w ?? 0);
	const remainder = SHARE_TOTAL - target;
	const split =
		remainder === 0
			? weights.map(() => 0)
			: apportion(
					remainder,
					weights.some((w) => w > 0) ? weights : weights.map(() => 1),
					others.map((s) => s.organisationId),
				);
	if (!split) return null;
	const shares = new Map(others.map((s, i) => [s.organisationId, split[i]]));
	return current.map((s) => ({
		...s,
		percentage:
			s.organisationId === id
				? value
				: decimalMinor(shares.get(s.organisationId) ?? 0),
	}));
}
