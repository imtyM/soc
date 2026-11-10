import type { ReactNode } from "react";
import { Pie, PieChart, Sector } from "recharts";
import { Button } from "~/components/ui/button";
import { ChartContainer } from "~/components/ui/chart";
import { cn } from "~/lib/utils";
import { decimalMinor, money } from "../../../convex/schema/giving_plan_math";
import { AllocationBar } from "./allocation-bar";
import type { PlanDraft } from "./draft";
import { useAllocationChart } from "./use-allocation-chart";

export function PlanAllocation({
	draft,
	children,
}: {
	draft: PlanDraft;
	children?: (
		chart: Pick<
			ReturnType<typeof useAllocationChart>,
			"recipients" | "setActiveId"
		>,
	) => ReactNode;
}) {
	const chart = useAllocationChart(draft);
	return (
		<section
			aria-label="Allocation preview"
			className={cn(
				"grid min-w-0 gap-6 md:grid-cols-2",
				children && "flex flex-col md:grid",
			)}
		>
			<div
				data-slot="allocation-preview"
				className={cn(
					"flex min-w-0 flex-col gap-4",
					children &&
						"sticky top-0 z-10 gap-3 border-b border-border bg-card py-2 md:static md:z-auto md:gap-4 md:border-0 md:py-0",
				)}
			>
				<AllocationBar chart={chart} />
				{/* Keep the desktop chart measurable, but out of mobile layout/focus. */}
				<div
					ref={chart.chartRef}
					className="invisible absolute top-0 left-0 size-64 md:visible md:relative md:inset-auto md:mx-auto"
				>
					{chart.hole && chart.drawable && (
						<ChartContainer
							config={{ units: { label: "Planned share" } }}
							className="aspect-square size-full"
						>
							<PieChart accessibilityLayer aria-label="Monthly allocation ring">
								<Pie
									data={chart.data}
									dataKey="units"
									nameKey="name"
									innerRadius={chart.hole}
									isAnimationActive={false}
									shape={(props) => {
										// Recharts may still render a removed sector for one selector update.
										const payload: unknown = props.payload;
										const segment =
											typeof payload === "object" &&
											payload !== null &&
											"id" in payload &&
											typeof payload.id === "string"
												? chart.byId.get(payload.id)
												: undefined;
										if (!segment) return <g />;
										return (
											// biome-ignore lint/a11y/useSemanticElements: SVG cannot contain HTML buttons; sectors have keyboard, focus and native text-button equivalents.
											<g
												className="allocation-sector cursor-pointer outline-none"
												role="button"
												tabIndex={0}
												aria-label={`${segment.name}: ${segment.percentage}%${segment.amount === null ? "" : `, ${money(segment.amount)}`}`}
												aria-pressed={chart.active?.id === segment.id}
												onMouseEnter={() => chart.setActiveId(segment.id)}
												onFocus={() => chart.setActiveId(segment.id)}
												onClick={() => chart.setActiveId(segment.id)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														chart.setActiveId(segment.id);
													}
												}}
											>
												<Sector
													{...props}
													fill={segment.fill}
													className="stroke-card"
													style={{ strokeWidth: "var(--allocation-stroke)" }}
												/>
											</g>
										);
									}}
								/>
							</PieChart>
						</ChartContainer>
					)}
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
						<p className="text-xs text-muted-foreground">
							{chart.drawable ? "Monthly total" : "Check your shares"}
						</p>
						<p className="w-32 break-all text-2xl font-semibold tracking-tight tabular-nums">
							{chart.amount === null ? "—" : money(chart.amount)}
						</p>
						<p className="text-xs text-muted-foreground">
							{decimalMinor(chart.total).replace(/\.00$/, "")}%
							<span> allocated</span>
						</p>
					</div>
				</div>
				<div
					className={cn(
						"flex min-w-0 flex-col gap-4",
						children && "gap-1 md:gap-4",
					)}
				>
					{chart.active && (
						<div className="flex min-h-12 flex-col items-start gap-1 text-left md:items-center md:text-center">
							<p className="max-w-full break-words text-sm font-medium line-clamp-2 md:line-clamp-none">
								{chart.active.name}
							</p>
							<p className="break-words text-sm tabular-nums">
								{chart.active.percentage}% ·{" "}
								{chart.active.amount === null
									? "Exact amount after a valid 100% mix"
									: money(chart.active.amount)}
							</p>
						</div>
					)}
					{!chart.drawable && (
						<p className="text-sm text-destructive">
							<span className="hidden md:inline">
								Shares must total 100%, with each percentage between 0 and 100.
								Exact allocations are unavailable until the mix is valid.
							</span>
							<span className="md:hidden">
								Check your shares. Exact amounts are unavailable.
							</span>
						</p>
					)}
					<p
						className={cn(
							"text-center text-xs text-muted-foreground",
							children && "hidden md:block",
						)}
					>
						<span className="hidden md:inline">
							Hover, focus or tap to inspect the mix.
						</span>
						{!children && (
							<span className="md:hidden">
								Tap a segment to inspect the mix.
							</span>
						)}
					</p>
				</div>
			</div>
			{children ? (
				children(chart)
			) : (
				<ul className="flex min-w-0 flex-col gap-1">
					{chart.recipients.map((s) => (
						<li key={s.id}>
							<Button
								type="button"
								variant="ghost"
								className="h-auto w-full justify-start whitespace-normal py-2 text-left"
								aria-label={`Inspect ${s.name}`}
								aria-pressed={chart.active?.id === s.id}
								onClick={() => chart.setActiveId(s.id)}
								onFocus={() => chart.setActiveId(s.id)}
							>
								<span
									className="size-3 shrink-0 rounded-sm border border-foreground"
									style={{ backgroundColor: s.fill }}
									aria-hidden="true"
								/>
								<span className="min-w-0 flex-1 break-words">
									{s.name}: {s.amount === null ? "—" : money(s.amount)}
									{s.isSynthetic && (
										<span className="block text-xs">
											Synthetic example · not a real recipient
										</span>
									)}
								</span>
								<span className="shrink-0 tabular-nums">{s.percentage}%</span>
							</Button>
						</li>
					))}
				</ul>
			)}
			<p className="text-xs leading-relaxed text-muted-foreground md:col-span-2">
				Monthly allocation preview only — no contribution has been collected or
				paid.
			</p>
		</section>
	);
}
