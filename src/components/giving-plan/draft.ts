import z from "zod";
import type { Id } from "../../../convex/_generated/dataModel";
import {
	decimalMinor,
	parseMinor,
	parsePercent,
	planProblem,
} from "../../../convex/schema/giving_plan_math";

export const draftSchema = z.object({
	amount: z.string().max(32),
	selections: z.array(
		z.object({
			organisationId: z.custom<Id<"organisations">>(
				(v) => typeof v === "string" && v.length > 0 && v.length <= 128,
			),
			name: z.string().max(120),
			isSynthetic: z.boolean(),
			percentage: z.string().max(12),
		}),
	),
});
export type PlanDraft = z.infer<typeof draftSchema>;
export type PlanSelection = PlanDraft["selections"][number];
export const emptyDraft: PlanDraft = { amount: "100.00", selections: [] };
export function intent(draft: PlanDraft) {
	const monthlyAmountMinor = parseMinor(draft.amount);
	const shares = draft.selections.map((s) => ({
		organisationId: s.organisationId,
		units: parsePercent(s.percentage),
	}));
	if (monthlyAmountMinor === null || shares.some((s) => s.units === null))
		return null;
	const parsed = shares.map((s) => ({
		organisationId: s.organisationId,
		units: s.units ?? 0,
	}));
	return planProblem(monthlyAmountMinor, parsed)
		? null
		: { monthlyAmountMinor, shares: parsed };
}
export const formSchema = draftSchema
	.extend({
		amount: draftSchema.shape.amount.refine((value) => {
			const n = parseMinor(value);
			return n !== null && n >= 5000;
		}, "Enter at least R50 using whole cents."),
		selections: z.array(
			draftSchema.shape.selections.element.extend({
				percentage: z
					.string()
					.refine(
						(value) => parsePercent(value) !== null,
						"Use a percentage from 0 to 100 with at most two decimal places.",
					),
			}),
		),
	})
	.superRefine((draft, ctx) => {
		if (!intent(draft))
			ctx.addIssue({
				code: "custom",
				path: ["selections"],
				message:
					"Use a monthly total of at least R50, select ready organisations, and make percentage shares total 100% (up to two decimal places).",
			});
	});
export const GUEST_DRAFT_KEY = "soc.giving-plan.guest.v1";
export function readGuestDraft(
	storage: Pick<Storage, "getItem">,
): PlanDraft | null {
	try {
		const raw = storage.getItem(GUEST_DRAFT_KEY);
		if (!raw) return null;
		const value: unknown = JSON.parse(raw);
		const result = draftSchema.safeParse(value);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}
export function persistGuestDraft(
	storage: Pick<Storage, "setItem">,
	draft: PlanDraft,
) {
	// Whitelist public draft fields; never serialize form/auth/account state.
	try {
		storage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draftSchema.parse(draft)));
		return true;
	} catch {
		return false;
	}
}
export function fromSaved(saved: {
	monthlyAmountMinor: number;
	shares: {
		organisationId: Id<"organisations">;
		name: string;
		isSynthetic: boolean;
		units: number;
	}[];
}): PlanDraft {
	return {
		amount: decimalMinor(saved.monthlyAmountMinor),
		selections: saved.shares.map((s) => ({
			organisationId: s.organisationId,
			name: s.name,
			isSynthetic: s.isSynthetic,
			percentage: decimalMinor(s.units),
		})),
	};
}
