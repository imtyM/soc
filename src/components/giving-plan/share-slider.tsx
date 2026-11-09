import { Field } from "~/components/ui/field";
import { Slider, SliderThumb } from "~/components/ui/slider";
import {
	decimalMinor,
	parsePercent,
} from "../../../convex/schema/giving_plan_math";

export function ShareSlider({
	name,
	value,
	disabled,
	onChange,
	onInspect,
}: {
	name: string;
	value: string;
	disabled: boolean;
	onChange: (value: string) => void;
	onInspect: () => void;
}) {
	const units = parsePercent(value);
	return (
		<Field className="col-span-2" data-disabled={disabled}>
			{units === null ? (
				<p className="text-xs text-muted-foreground">
					Enter a percentage from 0 to 100 to use the slider.
				</p>
			) : (
				<Slider
					value={units / 100}
					min={0}
					max={100}
					step={0.01}
					largeStep={1}
					disabled={disabled}
					onFocus={onInspect}
					onValueChange={(next) => {
						const percentage = typeof next === "number" ? next : next[0];
						if (!Number.isFinite(percentage)) return;
						onInspect();
						// Quantise pointer/keyboard coordinates to integer basis points before editing the draft.
						onChange(decimalMinor(Math.round(percentage * 100)));
					}}
				>
					<SliderThumb
						aria-label={`Adjust share for ${name}`}
						aria-valuetext={`${decimalMinor(units)} percent`}
					/>
				</Slider>
			)}
		</Field>
	);
}
