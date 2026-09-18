import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";
import storybookViteConfig from "./.storybook/vite.config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
	storybookViteConfig,
	defineConfig({
		test: {
			projects: [
				{
					extends: true,
					plugins: [
						storybookTest({ configDir: path.join(dirname, ".storybook") }),
					],
					test: {
						name: "storybook",
						browser: {
							enabled: true,
							headless: true,
							provider: playwright({}),
							instances: [{ browser: "chromium" }],
						},
					},
				},
				{
					extends: true,
					test: {
						name: "convex",
						include: ["convex/**/*.test.ts"],
						environment: "edge-runtime",
						browser: { enabled: false },
					},
				},
				{
					extends: true,
					test: {
						name: "unit",
						include: ["src/**/*.test.{ts,tsx}"],
						environment: "node",
						browser: { enabled: false },
					},
				},
			],
		},
	}),
);
