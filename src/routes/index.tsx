import { convexQuery, useConvexAuth } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { PhoneAuth } from "~/components/auth/phone-auth";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const { isAuthenticated, isLoading } = useConvexAuth();

	return (
		<main className="min-h-screen px-6 py-16">
			<Card className="mx-auto max-w-xl">
				<CardHeader>
					<CardTitle>
						{isAuthenticated ? "You’re signed in" : "Phone sign in"}
					</CardTitle>
					<CardDescription>
						{isAuthenticated
							? "Your Better Auth session has been validated by Convex."
							: "Generate an OTP, then retrieve it from the Convex function logs."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className="text-sm text-muted-foreground">
							Validating your session…
						</p>
					) : isAuthenticated ? (
						<Suspense
							fallback={
								<p className="text-sm text-muted-foreground">
									Loading your profile…
								</p>
							}
						>
							<CurrentUser />
						</Suspense>
					) : (
						<PhoneAuth />
					)}
				</CardContent>
				{isAuthenticated ? (
					<CardFooter>
						<Button
							variant="outline"
							onClick={() => {
								void authClient.signOut({
									fetchOptions: {
										onSuccess: () => window.location.reload(),
									},
								});
							}}
						>
							Sign out
						</Button>
					</CardFooter>
				) : null}
			</Card>
		</main>
	);
}

function CurrentUser() {
	const { data: user } = useSuspenseQuery(
		convexQuery(api.auth.getCurrentUser, {}),
	);

	return (
		<div className="flex flex-col gap-1">
			<p className="font-medium">{user?.name ?? "Authenticated user"}</p>
			{user?.phoneNumber ? (
				<p className="text-sm text-muted-foreground">{user.phoneNumber}</p>
			) : null}
		</div>
	);
}
