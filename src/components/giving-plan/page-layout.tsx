import type { ReactNode } from "react";

export function GivingPlanLayout({
	children,
	navigation,
}: {
	children: ReactNode;
	navigation?: ReactNode;
}) {
	return (
		<main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:gap-8 sm:px-6 sm:py-12">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex max-w-xl flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">
						Sea of change
					</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Your giving plan
					</h1>
					<p className="hidden leading-relaxed text-muted-foreground sm:block">
						A little each month. A mix that matters to you. No payments start
						here.
					</p>
				</div>
				{navigation && (
					<nav
						aria-label="Giving plan navigation"
						className="flex flex-wrap gap-2"
					>
						{navigation}
					</nav>
				)}
			</header>
			{children}
		</main>
	);
}
