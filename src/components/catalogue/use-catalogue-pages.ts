import { useState } from "react";

export function useCataloguePages() {
	const [cursors, setCursors] = useState<string[]>([]);
	return {
		options: {
			numItems: 20,
			cursor: cursors.at(-1) ?? null,
			maximumRowsRead: 100,
		},
		hasPrevious: cursors.length > 0,
		next: (cursor: string) => setCursors((previous) => [...previous, cursor]),
		previous: () => setCursors((previous) => previous.slice(0, -1)),
		reset: () => setCursors([]),
	};
}
