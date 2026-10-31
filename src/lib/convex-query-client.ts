import { ConvexQueryClient } from "@convex-dev/react-query";

export function createConvexQueryClient(url: string) {
	// Public app reads must start without a token. Protected UI still waits for
	// useConvexAuth, and Convex functions independently validate session/permissions.
	return new ConvexQueryClient(url, { expectAuth: false });
}
