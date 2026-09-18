import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "~/components/ui/empty";

type UnexpectedErrorProps = {
	onTryAgain: () => void;
	onReloadPage: () => void;
};

export function UnexpectedError({
	onTryAgain,
	onReloadPage,
}: UnexpectedErrorProps) {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyTitle role="heading" aria-level={1}>
					Something went wrong
				</EmptyTitle>
				<EmptyDescription>
					Try again, or reload the page if the problem continues.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="flex-row">
				<Button onClick={onTryAgain}>Try again</Button>
				<Button variant="outline" onClick={onReloadPage}>
					Reload page
				</Button>
			</EmptyContent>
		</Empty>
	);
}
