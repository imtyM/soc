import { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
} from "@tanstack/react-router";
import { attachRouterServerSsrUtils } from "@tanstack/react-router/ssr/server";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { expect, test } from "vitest";

test("SSR query cache events work with the actual attached router lifecycle", async () => {
	const queryClient = new QueryClient();
	const router = createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({ initialEntries: ["/"] }),
		isServer: true,
	});
	setupRouterSsrQueryIntegration({ router, queryClient });
	attachRouterServerSsrUtils({ router, manifest: undefined });
	try {
		await router.load();
		// Previously the real cache-add event called the removed serverSsr.isDehydrated API.
		await expect(
			queryClient.fetchQuery({
				queryKey: ["public-ssr-fixture"],
				queryFn: async () => ({ name: "Synthetic example" }),
			}),
		).resolves.toEqual({ name: "Synthetic example" });
		expect(await router.options.dehydrate?.()).toMatchObject({
			query: {
				initial: [
					{
						queryKey: ["public-ssr-fixture"],
						state: { data: { name: "Synthetic example" } },
					},
				],
			},
		});
	} finally {
		router.serverSsr?.cleanup();
		queryClient.clear();
	}
});
