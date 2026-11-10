import { useQueryClient } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { RouterUnexpectedError } from "~/components/unexpected-error/router-unexpected-error";

export function PlanError(props: ErrorComponentProps) {
	const client = useQueryClient();
	return (
		<RouterUnexpectedError
			{...props}
			reset={() => {
				void client
					.resetQueries({
						predicate: (q) =>
							q.queryKey[0] === "convexQuery" &&
							(q.queryKey[1] === "givingPlans:mine" ||
								q.queryKey[1] === "catalogue:list"),
					})
					.then(props.reset);
			}}
		/>
	);
}
