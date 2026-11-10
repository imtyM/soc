import { createFileRoute } from "@tanstack/react-router";
import { AccountEntry } from "~/components/account-entry";

export const Route = createFileRoute("/")({
	component: AccountEntry,
});
