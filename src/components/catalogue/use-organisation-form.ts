import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import z from "zod";
import { useAppForm } from "~/components/form";
import {
	GENERIC_ERROR_MESSAGE,
	getPublicErrorMessage,
} from "~/lib/public-error";
import type { api } from "../../../convex/_generated/api";
import { CATALOGUE_LIMITS } from "../../../convex/schema/catalogue_validators";
import type { ManagedEntry } from "./catalogue-manager";

export type OrganisationFormProps = {
	entry: ManagedEntry | null;
	create: (args: FunctionArgs<typeof api.catalogue.create>) => Promise<unknown>;
	update: (args: FunctionArgs<typeof api.catalogue.update>) => Promise<unknown>;
	onClose: () => void;
};
const schema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Enter an organisation name.")
		.max(CATALOGUE_LIMITS.name),
	description: z
		.string()
		.trim()
		.min(1, "Enter a public description.")
		.max(CATALOGUE_LIMITS.description),
	isReady: z.boolean(),
	isSynthetic: z.boolean(),
});
export function useOrganisationForm({
	entry,
	create,
	update,
	onClose,
}: OrganisationFormProps) {
	const [error, setError] = useState<string | null>(null);
	const defaultValues: z.infer<typeof schema> = entry
		? {
				name: entry.name,
				description: entry.description,
				isReady: entry.isReady,
				isSynthetic: entry.isSynthetic,
			}
		: { name: "", description: "", isReady: false, isSynthetic: true };
	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				if (entry)
					await update({
						...value,
						id: entry._id,
						expectedVersion: entry.version,
					});
				else await create(value);
				onClose();
			} catch (cause) {
				const message = getPublicErrorMessage(cause);
				if (message === GENERIC_ERROR_MESSAGE)
					console.error("Catalogue mutation failed unexpectedly.");
				setError(message);
			}
		},
	});
	return { form, error };
}
