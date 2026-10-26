import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useId } from "react";
import { expect, userEvent } from "storybook/test";
import { cn } from "~/lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "./field";
import { Input } from "./input";
import {
	expectControlBoundary,
	expectFocusRing,
	expectTextContrast,
} from "./theme-contrast";

function ThemeShowcase({ mode }: { mode: "light" | "dark" }) {
	const id = useId();

	return (
		<main
			className={cn(
				mode === "dark" && "dark",
				"min-h-screen bg-background p-6 text-foreground",
			)}
		>
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
				<header className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold">Nord shared UI</h1>
					<p className="text-sm text-muted-foreground">
						{mode === "light" ? "Light" : "Dark"} theme · representative
						component states
					</p>
				</header>
				<Card>
					<CardHeader>
						<CardTitle>
							<h2>Component examples</h2>
						</CardTitle>
						<CardDescription>
							A visual test surface, not a product flow. Nothing is submitted or
							saved.
						</CardDescription>
						<CardAction>
							<Badge>Preview</Badge>
						</CardAction>
					</CardHeader>
					<CardContent>
						<ExampleFields id={id} />
					</CardContent>
					<CardFooter className="flex-wrap gap-2">
						<Button type="button">Continue</Button>
						<Button type="button" variant="secondary">
							Secondary
						</Button>
						<Button type="button" variant="destructive">
							Remove
						</Button>
						<Button type="button" variant="outline">
							Outline
						</Button>
						<Button type="button" variant="ghost">
							Ghost
						</Button>
						<Button type="button" variant="link">
							More details
						</Button>
						<Button type="button" disabled>
							Unavailable
						</Button>
					</CardFooter>
				</Card>
				<ExampleBadges fieldsId={id} />
			</div>
		</main>
	);
}

function ExampleFields({ id }: { id: string }) {
	return (
		<FieldGroup id={id}>
			<Field>
				<FieldLabel htmlFor={`${id}-editable`}>Display label</FieldLabel>
				<Input
					id={`${id}-editable`}
					defaultValue="Example label"
					aria-describedby={`${id}-description`}
				/>
				<FieldDescription id={`${id}-description`}>
					Editable example. Tab through the controls to inspect keyboard focus.
				</FieldDescription>
			</Field>
			<Field data-invalid>
				<FieldLabel htmlFor={`${id}-invalid`}>Example with error</FieldLabel>
				<Input
					id={`${id}-invalid`}
					aria-invalid
					aria-describedby={`${id}-error`}
					placeholder="Required example"
				/>
				<FieldError id={`${id}-error`}>Enter a value to continue.</FieldError>
			</Field>
			<Field data-disabled>
				<FieldLabel htmlFor={`${id}-disabled`}>Disabled example</FieldLabel>
				<Input id={`${id}-disabled`} defaultValue="Unavailable" disabled />
			</Field>
		</FieldGroup>
	);
}

function ExampleBadges({ fieldsId }: { fieldsId: string }) {
	return (
		<section
			aria-label="Badge variants"
			className="flex flex-wrap items-center gap-2"
		>
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Needs attention</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="ghost">Ghost</Badge>
			<Badge
				variant="link"
				render={<a href={`#${fieldsId}`}>Field examples</a>}
			/>
		</section>
	);
}

async function finishTransitions(element: HTMLElement) {
	await Promise.all(
		element.getAnimations().map((animation) => animation.finished),
	);
}

const meta = {
	title: "UI/Theme",
	component: ThemeShowcase,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
	play: async ({ canvas, canvasElement }) => {
		const editable = canvas.getByRole("textbox", { name: "Display label" });
		const invalid = canvas.getByRole("textbox", { name: "Example with error" });

		await expect(editable).toHaveAccessibleDescription(
			"Editable example. Tab through the controls to inspect keyboard focus.",
		);
		await expect(invalid).toHaveAttribute("aria-invalid", "true");
		await expect(invalid).toHaveAccessibleDescription(
			"Enter a value to continue.",
		);
		await expect(
			canvas.getByRole("textbox", { name: "Disabled example" }),
		).toBeDisabled();
		await expect(
			canvas.getByRole("button", { name: "Unavailable" }),
		).toBeDisabled();

		// Check browser-resolved colours on real surfaces, including alpha tints.
		for (const element of canvasElement.querySelectorAll<HTMLElement>(
			"h1, h2, p, label, button, input, [data-slot=badge], [data-slot=field-error], [data-slot=card-description]",
		)) {
			if (element.matches(":disabled") || element.closest("[data-disabled]"))
				continue;
			expectTextContrast(element);
		}
		expectTextContrast(
			invalid,
			getComputedStyle(invalid, "::placeholder").color,
		);
		expectControlBoundary(editable);
		expectControlBoundary(invalid);

		await userEvent.tab();
		await expect(editable).toHaveFocus();
		await finishTransitions(editable);
		expectFocusRing(editable);
		await userEvent.clear(editable);
		await userEvent.type(editable, "Edited example");
		await expect(editable).toHaveValue("Edited example");
		await userEvent.tab();
		await expect(invalid).toHaveFocus();
		await finishTransitions(invalid);
		expectFocusRing(invalid);
		await userEvent.tab(); // Disabled input is skipped.
		await expect(
			canvas.getByRole("button", { name: "Continue" }),
		).toHaveFocus();

		for (const name of [
			"Continue",
			"Secondary",
			"Remove",
			"Outline",
			"Ghost",
			"More details",
		]) {
			const button = canvas.getByRole("button", { name });
			await expect(button).toHaveFocus();
			await finishTransitions(button);
			expectFocusRing(button);
			await userEvent.hover(button);
			await finishTransitions(button);
			expectTextContrast(button);
			await userEvent.unhover(button);
			await finishTransitions(button);
			await userEvent.tab();
		}
		// Disabled button is skipped; the final tab reaches the real badge link.
		const link = canvas.getByRole("link", { name: "Field examples" });
		await expect(link).toHaveFocus();
		await finishTransitions(link);
		expectFocusRing(link);
		await userEvent.hover(link);
		await finishTransitions(link);
		expectTextContrast(link);
		await userEvent.unhover(link);
	},
} satisfies Meta<typeof ThemeShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = { args: { mode: "light" } };
export const Dark: Story = { args: { mode: "dark" } };
