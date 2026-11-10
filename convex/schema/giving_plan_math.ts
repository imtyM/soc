/** Pure shared previews; the resource always repeats these checks server-side. */
export const SHARE_TOTAL = 10_000;
export const MINIMUM_MONTHLY_MINOR = 5_000;

export function parseMinor(value: string): number | null {
	const text = value.trim();
	if (text.length > 32 || !/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
	const [whole, fraction = ""] = text.split(".");
	const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
	return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}
export function parsePercent(value: string): number | null {
	const text = value.trim();
	if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text)) return null;
	const minor = parseMinor(text);
	return minor !== null && minor <= SHARE_TOTAL ? minor : null;
}
export function decimalMinor(minor: number) {
	return `${BigInt(minor) / 100n}.${String(BigInt(minor) % 100n).padStart(2, "0")}`;
}
export function money(minor: number) {
	return `R${(BigInt(minor) / 100n).toLocaleString("en-ZA")}.${String(BigInt(minor) % 100n).padStart(2, "0")}`;
}
export function planProblem(
	amount: number,
	shares: { organisationId: string; units: number }[],
) {
	if (!Number.isSafeInteger(amount) || amount < MINIMUM_MONTHLY_MINOR)
		return "Enter a monthly total of at least R50, using whole cents within the supported numeric range.";
	if (!shares.length) return "Choose at least one ready organisation.";
	if (new Set(shares.map((s) => s.organisationId)).size !== shares.length)
		return "Choose each organisation only once.";
	if (
		shares.some(
			(s) =>
				!Number.isSafeInteger(s.units) || s.units < 0 || s.units > SHARE_TOTAL,
		) ||
		shares.reduce((sum, s) => sum + s.units, 0) !== SHARE_TOTAL
	)
		return "Percentage shares must total 100%, using at most two decimal places.";
	return null;
}
/** Largest remainder. BigInt prevents overflow at safe-integer currency boundaries.
 * Equal remainders use stable organisation ID order, never random/insertion order. */
export function apportion(total: number, weights: number[], keys: string[]) {
	const denominator = weights.reduce((sum, w) => sum + BigInt(w), 0n);
	if (denominator <= 0n) return null;
	const parts = weights.map((weight, i) => {
		const scaled = BigInt(total) * BigInt(weight);
		return {
			i,
			minor: Number(scaled / denominator),
			remainder: scaled % denominator,
			key: keys[i],
		};
	});
	const remaining = total - parts.reduce((sum, p) => sum + p.minor, 0);
	const ranked = [...parts].sort((a, b) =>
		a.remainder === b.remainder
			? a.key < b.key
				? -1
				: a.key > b.key
					? 1
					: 0
			: a.remainder > b.remainder
				? -1
				: 1,
	);
	for (let i = 0; i < remaining; i++) ranked[i].minor++;
	return parts.map((p) => p.minor);
}
