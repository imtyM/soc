import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TodoList } from "~/components/todos/todo-list";
import { api } from "../../../convex/_generated/api";

export function AuthenticatedHome() {
	const { data: user } = useSuspenseQuery(
		convexQuery(api.auth.getCurrentUser, {}),
	);

	return (
		<AuthenticatedHomeContent name={user?.name} phoneNumber={user?.phoneNumber}>
			<TodoList />
		</AuthenticatedHomeContent>
	);
}

export function AuthenticatedHomeContent({
	children,
	name,
	phoneNumber,
}: {
	children: ReactNode;
	name?: string | null;
	phoneNumber?: string | null;
}) {
	return (
		<div className="flex flex-col gap-8">
			<CurrentUser name={name} phoneNumber={phoneNumber} />
			{children}
		</div>
	);
}

function CurrentUser({
	name,
	phoneNumber,
}: {
	name?: string | null;
	phoneNumber?: string | null;
}) {
	return (
		<div className="flex flex-col gap-1">
			<p className="font-medium">{name ?? "Authenticated user"}</p>
			{phoneNumber ? (
				<p className="text-sm text-muted-foreground">{phoneNumber}</p>
			) : null}
		</div>
	);
}
