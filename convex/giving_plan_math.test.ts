import { describe, expect, test } from "vitest";
import {
	apportion,
	decimalMinor,
	money,
	parseMinor,
	parsePercent,
	planProblem,
} from "./schema/giving_plan_math";

describe("giving-plan exact arithmetic", () => {
	test("decimal parsing rejects non-finite, fractional cents, unsafe and non-decimal input", () => {
		for (const value of [
			"NaN",
			"Infinity",
			"1e5",
			"-50",
			"50.001",
			"90071992547409.92",
			"",
		])
			expect(parseMinor(value)).toBeNull();
		expect(parseMinor(" 50.00 ")).toBe(5000);
		expect(parseMinor("90071992547409.91")).toBe(Number.MAX_SAFE_INTEGER);
		expect(parsePercent("33.33")).toBe(3333);
		for (const value of ["100.01", "33.333", "-1", "NaN"])
			expect(parsePercent(value)).toBeNull();
	});
	test("largest remainders are deterministic and exact even at the maximum safe integer", () => {
		for (const total of [5000, 10000, 10001, Number.MAX_SAFE_INTEGER]) {
			const split = apportion(total, [1, 1, 1], ["c", "a", "b"]);
			expect(split?.reduce((sum, n) => sum + n, 0)).toBe(total);
			expect(split?.every(Number.isSafeInteger)).toBe(true);
		}
		expect(apportion(10000, [1, 1, 1], ["c", "a", "b"])).toEqual([
			3333, 3334, 3333,
		]);
		expect(apportion(10000, [5000, 3000, 2000], ["a", "b", "c"])).toEqual([
			5000, 3000, 2000,
		]);
		expect(
			apportion(
				10000,
				[5000 * 3, 3000 * 3, 2000 * 3, 10000],
				["a", "b", "c", "d"],
			),
		).toEqual([3750, 2250, 1500, 2500]);
		expect(apportion(10000, [3750, 2250, 1500], ["a", "b", "c"])).toEqual([
			5000, 3000, 2000,
		]);
		expect(apportion(10000, [0, 0], ["a", "b"])).toBeNull();
	});
	test("formatting never rounds an unsafe floating currency intermediary", () => {
		expect(decimalMinor(Number.MAX_SAFE_INTEGER)).toBe("90071992547409.91");
		expect(money(5000)).toBe("R50.00");
		expect(
			planProblem(4999, [{ organisationId: "a", units: 10000 }]),
		).toContain("at least R50");
		expect(planProblem(5000, [])).toContain("at least one");
		expect(
			planProblem(5000, [{ organisationId: "a", units: 10000 }]),
		).toBeNull();
	});
});
