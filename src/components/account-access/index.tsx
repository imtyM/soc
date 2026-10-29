import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { type ReactNode, Suspense, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { api } from "../../../convex/_generated/api";
import type { AccountRole } from "../../../convex/schema/account_validators";
import { PhoneLookupForm } from "./phone-lookup-form";
import { RoleForm } from "./role-form";

export function AccountAccess() {
	const { data } = useSuspenseQuery(
		convexQuery(api.accounts.currentAccess, {}),
	);
	return (
		<AccountAccessContent accountRole={data?.role ?? null}>
			<AdminRoleManager />
		</AccountAccessContent>
	);
}

export function AccountAccessContent({
	accountRole,
	children,
}: {
	accountRole: AccountRole | null;
	children?: ReactNode;
}) {
	return (
		<section aria-label="Account access" className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Account access</h2>
			{accountRole ? (
				<p>
					Your role: <Badge variant="secondary">{accountRole}</Badge>
				</p>
			) : (
				<output>Your session has ended. Sign in again to continue.</output>
			)}
			{accountRole === "admin" ? children : null}
		</section>
	);
}

function AdminRoleManager() {
	const [phone, setPhone] = useState<string | null>(null);
	return (
		<div className="flex max-w-md flex-col gap-4">
			<p className="text-sm text-muted-foreground">
				Find an existing account by its exact verified phone number to manage
				access. Only administrators can change roles.
			</p>
			<PhoneLookupForm onLookup={setPhone} />
			{phone ? (
				<Suspense fallback={<output>Looking up account…</output>}>
					<RoleLookup key={phone} phoneNumber={phone} />
				</Suspense>
			) : null}
		</div>
	);
}

function RoleLookup({ phoneNumber }: { phoneNumber: string }) {
	const { data } = useSuspenseQuery(
		convexQuery(api.accounts.lookup, { phoneNumber }),
	);
	const changeRole = useMutation(api.accounts.changeRole);
	if (data.status !== "found") {
		return <output>{lookupMessages[data.status]}</output>;
	}
	return (
		<RoleForm
			key={data.account.authUserId + data.account.role}
			account={data.account}
			changeRole={changeRole}
		/>
	);
}

const lookupMessages = {
	"signed-out": "Your session has ended. Sign in again to continue.",
	forbidden: "Administrator access is no longer available.",
	invalid: "Enter the full international phone number, beginning with +.",
	"not-found": "No account with that exact verified phone number was found.",
};
