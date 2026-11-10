import { cn } from "~/lib/utils";
import type { AuthFeedbackValue } from "./use-phone-auth";

export function AuthFeedback({
	feedback,
}: {
	feedback: AuthFeedbackValue | null;
}) {
	if (!feedback) return null;
	return (
		<output
			aria-live="polite"
			data-kind={feedback.kind}
			className={cn(
				"break-words text-sm leading-relaxed text-muted-foreground",
				feedback.kind === "error" && "text-destructive",
			)}
		>
			{feedback.text}
		</output>
	);
}
