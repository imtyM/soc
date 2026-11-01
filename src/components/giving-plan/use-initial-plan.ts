import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import type { api } from "../../../convex/_generated/api";
import { emptyDraft, fromSaved, type PlanDraft, readGuestDraft } from "./draft";

export type SavedPlan = Extract<
	FunctionReturnType<typeof api.givingPlans.mine>,
	{ status: "verified" }
>["plan"];
export function useInitialPlan(saved: SavedPlan | undefined) {
	const started = useRef(false);
	const [initial, setInitial] = useState<{
		draft: PlanDraft;
		fromGuest: boolean;
	} | null>(null);
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		let guest: PlanDraft | null = null;
		try {
			guest = readGuestDraft(window.sessionStorage);
		} catch {
			/* Storage can be blocked; owned values are never written here. */
		}
		// Keep the pre-auth draft until confirmed save. A provider transition may
		// mount this before the existing PhoneAuth callback performs its hard reload.
		setInitial({
			draft: guest ?? (saved ? fromSaved(saved) : emptyDraft),
			fromGuest: guest !== null,
		});
	}, [saved]);
	return initial;
}
