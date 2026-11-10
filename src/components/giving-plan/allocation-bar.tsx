import { money } from "../../../convex/schema/giving_plan_math";
import type { useAllocationChart } from "./use-allocation-chart";

type Chart = ReturnType<typeof useAllocationChart>;

/** Mobile geometry uses the same exact, unnormalised data as the donut.
 * Tiny/zero shares also have full-width native recipient controls below. */
export function AllocationBar({ chart }: { chart: Chart }) {
	return (
		<div className="flex min-w-0 flex-col gap-2 md:hidden">
			<p className="break-words text-sm font-medium tabular-nums">
				Monthly total · {chart.amount === null ? "—" : money(chart.amount)}
			</p>
			<fieldset className="flex h-2 w-full min-w-0 overflow-hidden rounded-md border border-control-border bg-secondary">
				<legend className="sr-only">Monthly allocation bar</legend>
				{chart.data
					.filter((segment) => segment.units > 0)
					.map((segment) => (
						<button
							key={segment.id}
							type="button"
							aria-label={`${segment.name}: ${segment.percentage}%${segment.amount === null ? "" : `, ${money(segment.amount)}`}`}
							aria-pressed={chart.active?.id === segment.id}
							className="min-w-0 basis-0 cursor-pointer outline-none aria-pressed:ring-1 aria-pressed:ring-foreground aria-pressed:ring-inset focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-inset"
							style={{ flexGrow: segment.units, backgroundColor: segment.fill }}
							onMouseEnter={() => chart.setActiveId(segment.id)}
							onFocus={() => chart.setActiveId(segment.id)}
							onClick={() => chart.setActiveId(segment.id)}
						/>
					))}
			</fieldset>
		</div>
	);
}
