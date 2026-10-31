import { useConvexAuth } from "@convex-dev/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { PhoneAuth } from "~/components/auth/phone-auth";
import { AuthenticatedHome } from "~/components/authenticated-home";
import { Button, buttonVariants } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { getPublicErrorMessage } from "~/lib/public-error";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { signingOut, signOutError, handleSignOut } = useSignOut();

	return (
		<main className="min-h-screen px-6 py-16">
			<nav aria-label="App" className="mx-auto mb-6 max-w-2xl">
				<Link
					to="/app/catalogue"
					className={buttonVariants({ variant: "outline" })}
				>
					Browse giving catalogue
				</Link>
			</nav>
			<Card className="mx-auto max-w-2xl">
				<CardHeader>
					<CardTitle>
						{signingOut
							? "Signing out"
							: isAuthenticated
								? "You’re signed in"
								: "Phone sign in"}
					</CardTitle>
					<CardDescription>
						{signingOut
							? "Your authenticated workspace is closing safely."
							: isAuthenticated
								? "Your Better Auth session has been validated by Convex."
								: "Sign in with an SMS code sent to your South African phone number."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{signingOut ? (
						<output className="text-sm text-muted-foreground">
							Signing out…
						</output>
					) : isLoading ? (
						<p className="text-sm text-muted-foreground">
							Validating your session…
						</p>
					) : isAuthenticated ? (
						<Suspense
							fallback={
								<p className="text-sm text-muted-foreground">
									Loading your workspace…
								</p>
							}
						>
							<AuthenticatedHome />
						</Suspense>
					) : (
						<PhoneAuth />
					)}
				</CardContent>
				{isAuthenticated && !signingOut ? (
					<CardFooter className="flex-col items-start gap-3">
						{signOutError ? (
							<p role="alert" className="text-sm text-destructive">
								{signOutError}
							</p>
						) : null}
						<Button variant="outline" onClick={handleSignOut}>
							Sign out
						</Button>
					</CardFooter>
				) : null}
			</Card>
		</main>
	);
}

function useSignOut() {
	const [signingOut, setSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);

	async function handleSignOut() {
		setSignOutError(null);
		setSigningOut(true);

		try {
			const result = await authClient.signOut();
			if (result.error) {
				setSignOutError(getPublicErrorMessage(result.error));
				setSigningOut(false);
				return;
			}

			window.location.reload();
		} catch (error) {
			setSignOutError(getPublicErrorMessage(error));
			setSigningOut(false);
		}
	}

	return { signingOut, signOutError, handleSignOut };
}
