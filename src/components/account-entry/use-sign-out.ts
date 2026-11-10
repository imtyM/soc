import { useRef, useState } from "react";
import { getPublicErrorMessage } from "~/lib/public-error";

export type SignOutActions = {
	signOut: () => Promise<{ error?: unknown }>;
	onSignedOut: () => void;
};

export function useSignOut({ signOut, onSignedOut }: SignOutActions) {
	const pending = useRef(false);
	const [signingOut, setSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);

	async function handleSignOut() {
		if (pending.current) return;
		pending.current = true;
		setSignOutError(null);
		setSigningOut(true);
		try {
			const result = await signOut();
			if (result.error) {
				setSignOutError(getPublicErrorMessage(result.error));
				setSigningOut(false);
				pending.current = false;
				return;
			}
			onSignedOut();
		} catch (error) {
			setSignOutError(getPublicErrorMessage(error));
			setSigningOut(false);
			pending.current = false;
		}
	}

	return { signingOut, signOutError, handleSignOut };
}
