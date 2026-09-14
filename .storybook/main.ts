import type { StorybookConfig } from "@storybook/tanstack-react";

const config: StorybookConfig = {
	stories: [
		"../src/**/*.mdx",
		"../src/**/*.stories.@(ts|tsx)",
	],
	addons: ["@storybook/addon-docs", "@storybook/addon-mcp", "@storybook/addon-a11y"],
	framework: {
		name: "@storybook/tanstack-react",
		options: {
			builder: {
				viteConfigPath: ".storybook/vite.config.ts",
			},
		},
	},
};

export default config;
