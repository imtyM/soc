import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AccountAccess } from "~/components/account-access";
import { AccountIdentity } from "~/components/account-entry/account-identity";
import { TodoList } from "~/components/todos/todo-list";
import { api } from "../../../convex/_generated/api";

export function AuthenticatedHome({
	accountActions,
}: {
	accountActions: ReactNode;
}) {
	const { data: user } = useSuspenseQuery(
		convexQuery(api.auth.getCurrentUser, {}),
	);

	return (
		<AuthenticatedHomeContent
			identity={
				<AccountIdentity phoneNumber={user?.phoneNumber}>
					{accountActions}
				</AccountIdentity>
			}
		>
			<AccountAccess />
			<TodoList />
		</AuthenticatedHomeContent>
	);
}

export function AuthenticatedHomeContent({
	children,
	identity,
	name,
	phoneNumber,
}: {
	children: ReactNode;
	identity?: ReactNode;
	name?: string | null;
	phoneNumber?: string | null;
}) {
	return (
		<div className="flex flex-col gap-8">
			{identity ?? <CurrentUser name={name} phoneNumber={phoneNumber} />}
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
