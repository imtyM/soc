import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";
import type { Doc } from "../../../convex/_generated/dataModel";

export type CatalogueEntry = Pick<
	Doc<"organisations">,
	"_id" | "name" | "description" | "isSynthetic"
>;
export function CatalogueEntries({
	entries,
	searching,
}: {
	entries: CatalogueEntry[];
	searching: boolean;
}) {
	if (entries.length === 0)
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle role="heading" aria-level={3}>
						{searching
							? "No matching organisations"
							: "No ready organisations yet"}
					</EmptyTitle>
					<EmptyDescription>
						{searching
							? "Try another search, or clear it to browse."
							: "Organisations will appear here once approved and ready. Examples are not real recipients."}
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	return (
		<ul className="flex flex-col gap-4">
			{entries.map((entry) => (
				<li key={entry._id}>
					<Card>
						<CardHeader>
							<CardTitle role="heading" aria-level={3}>
								{entry.name}
							</CardTitle>
							{entry.isSynthetic ? (
								<Badge variant="secondary">
									Synthetic example · not a real recipient
								</Badge>
							) : null}
						</CardHeader>
						<CardContent>
							<p className="whitespace-pre-wrap break-words text-sm">
								{entry.description}
							</p>
						</CardContent>
					</Card>
				</li>
			))}
		</ul>
	);
}
export function PageNavigation({
	label = "Catalogue pages",
	hasPrevious,
	hasNext,
	onPrevious,
	onNext,
}: {
	label?: string;
	hasPrevious: boolean;
	hasNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
}) {
	return (
		<nav aria-label={label} className="flex gap-3">
			<Button variant="outline" disabled={!hasPrevious} onClick={onPrevious}>
				Previous page
			</Button>
			<Button variant="outline" disabled={!hasNext} onClick={onNext}>
				Next page
			</Button>
		</nav>
	);
}
