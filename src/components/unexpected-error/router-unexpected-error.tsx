import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";
import { UnexpectedError } from ".";

export function RouterUnexpectedError({ error, reset }: ErrorComponentProps) {
	useReportUnexpectedError(error);

	return (
		<UnexpectedError
			onTryAgain={reset}
			onReloadPage={() => window.location.reload()}
		/>
	);
}

function useReportUnexpectedError(error: unknown) {
	useEffect(() => {
		if (import.meta.env.DEV) {
			const errorKind =
				error instanceof Error ? "Error object" : "unknown thrown value";
			console.error(`Unexpected router error boundary received: ${errorKind}.`);
		}
	}, [error]);
}
