import { describe, expect, test } from "vitest";
import { parsePercent } from "../../../convex/schema/giving_plan_math";
import { balanceShares } from "./balance-shares";
import { draftSchema, type PlanSelection } from "./draft";

function selections(values: string[], ids = values.map((_, i) => String(i))) {
	return draftSchema.parse({
		amount: "100.01",
		selections: values.map((percentage, i) => ({
			organisationId: ids[i],
			name: `Example ${i}`,
			isSynthetic: true,
			percentage,
		})),
	}).selections;
}
const percentages = (value: PlanSelection[] | null) =>
	value?.map((s) => s.percentage);
describe("deliberate proportional share edits", () => {
	test("keeps the requested target and others' relative weights", () => {
		const old = selections(["50", "30", "20"]);
		const next = balanceShares(old, old, "0", "60");
		expect(percentages(next)).toEqual(["60", "24.00", "16.00"]);
		expect(old).toEqual(selections(["50", "30", "20"]));
		expect(next?.map(({ percentage: _p, ...metadata }) => metadata)).toEqual(
			old.map(({ percentage: _p, ...metadata }) => metadata),
		);
	});
	test("keeps pre-edit weights across 100%, zero, rounding and invalid typing", () => {
		const baseline = selections(["50", "30", "20"]);
		const at100 = balanceShares(baseline, baseline, "0", "100");
		expect(percentages(at100)).toEqual(["100", "0.00", "0.00"]);
		expect(
			percentages(balanceShares(at100 ?? [], baseline, "0", "60")),
		).toEqual(["60", "24.00", "16.00"]);
		const blank = selections(["", "0", "0"]);
		expect(percentages(balanceShares(blank, baseline, "0", "0"))).toEqual([
			"0",
			"60.00",
			"40.00",
		]);
		let current = baseline;
		for (const value of ["99.99", "0.01", "88.88", "100", "60"]) {
			current = balanceShares(current, baseline, "0", value) ?? [];
		}
		expect(percentages(current)).toEqual(["60", "24.00", "16.00"]);
	});
	test("uses an equal remainder only when all OTHER baseline weights are zero", () => {
		const old = selections(["100", "0", "0", "0"], ["target", "c", "a", "b"]);
		expect(percentages(balanceShares(old, old, "target", "0"))).toEqual([
			"0",
			"33.33",
			"33.34",
			"33.33",
		]);
		expect(percentages(balanceShares(old, old, "target", "100"))).toEqual([
			"100",
			"0.00",
			"0.00",
			"0.00",
		]);
	});
	test("stable ID ties do not depend on display order", () => {
		const old = selections(["50", "25", "25"], ["target", "z", "a"]);
		expect(percentages(balanceShares(old, old, "target", "99.99"))).toEqual([
			"99.99",
			"0.00",
			"0.01",
		]);
		const reversed = [...old].reverse();
		expect(
			balanceShares(reversed, reversed, "target", "99.99")?.find(
				(s) => s.organisationId === "a",
			)?.percentage,
		).toBe("0.01");
	});
	test("a single organisation always receives 100%, including an explicit legacy repair", () => {
		for (const value of ["0", "60", "100"]) {
			const old = selections(["50"]);
			expect(percentages(balanceShares(old, old, "0", value))).toEqual([
				"100.00",
			]);
		}
	});
	test("all supported targets sum to exactly 100% and retain zero-weight peers", () => {
		const baseline = selections(["50", "30", "20", "0"]);
		for (let target = 0; target <= 10000; target++) {
			const value = (target / 100).toFixed(2);
			const next = balanceShares(baseline, baseline, "0", value);
			expect(
				next?.reduce(
					(sum, s) => sum + (parsePercent(s.percentage) ?? -10000),
					0,
				),
			).toBe(10000);
			expect(next?.[0].percentage).toBe(value);
			expect(next?.[3].percentage).toBe("0.00");
		}
	});
	test.each([
		"",
		"invalid",
		"-1",
		"100.01",
		"1.001",
		"1e2",
		"NaN",
	])("does not invent intent from %j", (value) => {
		const old = selections(["50", "30", "20"]);
		expect(balanceShares(old, old, "0", value)).toBeNull();
	});
	test("rejects invalid peers, duplicate IDs, missing IDs and changed membership", () => {
		const old = selections(["50", "30", "20"]);
		expect(
			balanceShares(old, selections(["50", "", "20"]), "0", "60"),
		).toBeNull();
		expect(balanceShares(old, old, "absent", "60")).toBeNull();
		expect(balanceShares([], [], "0", "60")).toBeNull();
		expect(balanceShares(old, old.slice(0, 2), "0", "60")).toBeNull();
		const duplicates = selections(["50", "50"], ["0", "0"]);
		expect(balanceShares(duplicates, duplicates, "0", "60")).toBeNull();
		expect(balanceShares(old, [...old].reverse(), "0", "60")).toBeNull();
	});
});
