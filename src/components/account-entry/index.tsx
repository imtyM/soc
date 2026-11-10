import { useConvexAuth } from "@convex-dev/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, Suspense } from "react";
import { PhoneAuth } from "~/components/auth/phone-auth";
import { AuthenticatedHome } from "~/components/authenticated-home";
import { Button, buttonVariants } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { useSignOut } from "./use-sign-out";

export function AccountEntry() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const signOut = useSignOut({
		signOut: () => authClient.signOut(),
		onSignedOut: () => window.location.reload(),
	});
	return (
		<AccountEntryContent
			phase={
				signOut.signingOut
					? "signing-out"
					: isLoading
						? "loading"
						: isAuthenticated
							? "signed-in"
							: "signed-out"
			}
			phoneAuth={<PhoneAuth />}
			workspace={
				<AuthenticatedHome
					accountActions={<SignOutButton onClick={signOut.handleSignOut} />}
				/>
			}
			signOutError={signOut.signOutError}
		/>
	);
}

// A shallow presentation boundary for controlled states; no simulated session.
export function AccountEntryContent({
	phase,
	phoneAuth,
	workspace,
	signOutError,
}: {
	phase: "loading" | "signed-out" | "signed-in" | "signing-out";
	phoneAuth?: ReactNode;
	workspace?: ReactNode;
	signOutError?: string | null;
}) {
	return (
		<main
			className={cn(
				"mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12",
				phase !== "signed-in" && "max-w-md",
			)}
		>
			<nav aria-label="App">
				<Link
					to="/app/catalogue"
					className={buttonVariants({ variant: "ghost" })}
				>
					Browse giving catalogue
				</Link>
			</nav>
			{phase === "signed-in" ? (
				<>
					<h1 className="sr-only">Your account</h1>
					{signOutError && (
						<p role="alert" className="text-sm text-destructive">
							{signOutError}
						</p>
					)}
					<Suspense
						fallback={<AccountStatus>Loading your account…</AccountStatus>}
					>
						{workspace}
					</Suspense>
				</>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>
							<h1 className="text-2xl font-semibold tracking-tight">
								{phase === "signing-out" ? "Signing out" : "Sign in"}
							</h1>
						</CardTitle>
						{phase === "signed-out" && (
							<CardDescription>
								Use your phone to save and manage your giving plan.
							</CardDescription>
						)}
					</CardHeader>
					<CardContent>
						{phase === "signed-out" ? (
							phoneAuth
						) : (
							<AccountStatus>
								{phase === "signing-out"
									? "Closing your account session safely…"
									: "Checking your session…"}
							</AccountStatus>
						)}
					</CardContent>
				</Card>
			)}
		</main>
	);
}

export function SignOutButton({ onClick }: { onClick: () => void }) {
	return (
		<Button type="button" variant="ghost" onClick={onClick}>
			Sign out
		</Button>
	);
}

function AccountStatus({ children }: { children: ReactNode }) {
	return (
		<output className="text-sm text-muted-foreground" aria-live="polite">
			{children}
		</output>
	);
}
