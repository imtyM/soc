import { useQueryClient } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { RouterUnexpectedError } from "~/components/unexpected-error/router-unexpected-error";

export function CatalogueError(props: ErrorComponentProps) {
	const client = useQueryClient();
	return (
		<RouterUnexpectedError
			{...props}
			reset={() => {
				void client
					.resetQueries({
						predicate: (query) =>
							query.queryKey[0] === "convexQuery" &&
							(query.queryKey[1] === "catalogue:list" ||
								query.queryKey[1] === "catalogue:managementList" ||
								query.queryKey[1] === "accounts:currentAccess"),
					})
					.then(props.reset);
			}}
		/>
	);
}
