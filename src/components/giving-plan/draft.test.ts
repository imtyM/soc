import { describe, expect, test } from "vitest";
import {
	emptyDraft,
	fromSaved,
	GUEST_DRAFT_KEY,
	persistGuestDraft,
	readGuestDraft,
} from "./draft";

describe("guest-only draft storage", () => {
	test("round-trips only whitelisted non-sensitive draft fields", () => {
		const values = new Map<string, string>();
		const storage = {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => {
				values.set(key, value);
			},
		};
		const extra = {
			...emptyDraft,
			amount: "150.00",
			authUserId: "never-persist-owner",
			phoneNumber: "never-persist-phone",
			token: "never-persist-token",
		};
		expect(persistGuestDraft(storage, extra)).toBe(true);
		expect(JSON.parse(values.get(GUEST_DRAFT_KEY) ?? "")).toEqual({
			amount: "150.00",
			selections: [],
		});
		expect(readGuestDraft(storage)).toEqual({
			amount: "150.00",
			selections: [],
		});
	});
	test("corrupt/unavailable storage is safe and write failure is explicit", () => {
		expect(readGuestDraft({ getItem: () => "{bad-json" })).toBeNull();
		expect(
			readGuestDraft({
				getItem: () => JSON.stringify({ amount: 100, selections: [] }),
			}),
		).toBeNull();
		expect(
			readGuestDraft({
				getItem: () => {
					throw new Error("blocked");
				},
			}),
		).toBeNull();
		expect(
			persistGuestDraft(
				{
					setItem: () => {
						throw new Error("quota");
					},
				},
				emptyDraft,
			),
		).toBe(false);
	});
	test("owned snapshots are converted only for the in-memory editor, not automatically persisted", () => {
		const owned = fromSaved({ monthlyAmountMinor: 5000, shares: [] });
		expect(owned).toEqual({ amount: "50.00", selections: [] });
	});
});
