import type { ReactNode } from "react";

export function AccountIdentity({
	phoneNumber,
	children,
}: {
	phoneNumber?: string | null;
	children: ReactNode;
}) {
	return (
		<section
			aria-label="Signed-in account"
			className="flex flex-wrap items-center justify-between gap-3"
		>
			<div className="flex min-w-0 flex-col gap-1">
				<p className="text-xs text-muted-foreground">Signed in</p>
				<p className="break-words text-sm font-medium tabular-nums">
					{phoneNumber || "Your account"}
				</p>
			</div>
			{children}
		</section>
	);
}
