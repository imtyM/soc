import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { useState } from "react";
import { z } from "zod";
import { useAppForm } from "~/components/form";
import {
	GENERIC_ERROR_MESSAGE,
	getPublicErrorMessage,
} from "~/lib/public-error";
import type { api } from "../../../convex/_generated/api";
import { ACCOUNT_ROLES } from "../../../convex/schema/account_validators";

type Lookup = FunctionReturnType<typeof api.accounts.lookup>;
export type RoleFormProps = {
	account: Extract<Lookup, { status: "found" }>["account"];
	changeRole: (
		args: FunctionArgs<typeof api.accounts.changeRole>,
	) => Promise<unknown>;
};
const schema = z.object({ role: z.enum(ACCOUNT_ROLES) });
export const roleOptions = ACCOUNT_ROLES.map((role) => ({
	label: role,
	value: role,
}));

export function useRoleForm({ account, changeRole }: RoleFormProps) {
	const [error, setError] = useState<string | null>(null);
	const defaultValues: z.infer<typeof schema> = { role: account.role };
	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				await changeRole({
					phoneNumber: account.phoneNumber,
					expectedAuthUserId: account.authUserId,
					role: value.role,
				});
			} catch (cause) {
				const message = getPublicErrorMessage(cause);
				if (message === GENERIC_ERROR_MESSAGE)
					console.error("Account role mutation failed unexpectedly.");
				setError(message);
			}
		},
	});
	return { form, error };
}
