import { expect } from "storybook/test";

// Test-only helpers: resolve CSS colours with the browser's sRGB canvas pipeline.
// These examples use flat surfaces, no images/gradients or ancestor group opacity.
function background(element: HTMLElement) {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 1;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context)
		throw new Error("A canvas context is required for contrast checks.");

	const ancestors: HTMLElement[] = [];
	for (
		let node: HTMLElement | null = element;
		node;
		node = node.parentElement
	) {
		ancestors.unshift(node);
	}
	for (const node of ancestors) {
		context.fillStyle = getComputedStyle(node).backgroundColor;
		context.fillRect(0, 0, 1, 1);
	}
	return context;
}

function luminance(pixel: Uint8ClampedArray) {
	const channels = Array.from(pixel.slice(0, 3), (channel) => {
		const value = channel / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(element: HTMLElement, colour: string) {
	const context = background(element);
	const base = context.getImageData(0, 0, 1, 1).data;
	expect(base[3], "The tested surface must be opaque").toBe(255);
	expect(
		CSS.supports("color", colour),
		"The browser must resolve the tested colour",
	).toBe(true);
	context.fillStyle = colour;
	context.fillRect(0, 0, 1, 1);
	const foreground = context.getImageData(0, 0, 1, 1).data;
	const a = luminance(base);
	const b = luminance(foreground);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function expectTextContrast(
	element: HTMLElement,
	colour = getComputedStyle(element).color,
) {
	expect(
		contrast(element, colour),
		`Text contrast: ${element.textContent || element.getAttribute("aria-describedby") || element.tagName}`,
	).toBeGreaterThanOrEqual(4.5);
}

export function expectControlBoundary(element: HTMLElement) {
	const colour = getComputedStyle(element).borderTopColor;
	expect(
		contrast(element, colour),
		"Control border against its fill",
	).toBeGreaterThanOrEqual(3);
	if (!element.parentElement)
		throw new Error("The control needs a surrounding surface.");
	expect(
		contrast(element.parentElement, colour),
		"Control border against its surroundings",
	).toBeGreaterThanOrEqual(3);
}

export function expectFocusRing(element: HTMLElement) {
	expect(
		element.matches(":focus-visible"),
		"Keyboard focus is visibly indicated",
	).toBe(true);
	expect(getComputedStyle(element).boxShadow).not.toBe("none");
	if (!element.parentElement)
		throw new Error("The focus ring needs a surrounding surface.");
	expect(
		contrast(
			element.parentElement,
			getComputedStyle(element).getPropertyValue("--tw-ring-color"),
		),
		"Keyboard focus ring against its surroundings",
	).toBeGreaterThanOrEqual(3);
}
