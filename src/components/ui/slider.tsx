import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "~/lib/utils";

function Slider({
	className,
	children,
	min = 0,
	max = 100,
	...props
}: SliderPrimitive.Root.Props) {
	return (
		<SliderPrimitive.Root
			className={cn("data-horizontal:w-full data-vertical:h-full", className)}
			data-slot="slider"
			min={min}
			max={max}
			thumbAlignment="edge"
			{...props}
		>
			<SliderPrimitive.Control className="relative flex min-h-11 w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="relative grow overflow-hidden rounded-full bg-secondary ring-1 ring-control-border select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
					/>
				</SliderPrimitive.Track>
				{children}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

function SliderThumb({ className, ...props }: SliderPrimitive.Thumb.Props) {
	return (
		<SliderPrimitive.Thumb
			data-slot="slider-thumb"
			className={cn(
				"block size-6 shrink-0 rounded-full bg-background shadow-sm ring-1 ring-control-border transition-shadow select-none hover:ring-3 hover:ring-ring focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Slider, SliderThumb };
