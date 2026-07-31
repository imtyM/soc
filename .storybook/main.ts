import type { StorybookConfig } from "@storybook/tanstack-react";

const config: StorybookConfig = {
	stories: [
		"../src/components/form/**/*.mdx",
		"../src/components/form/**/*.stories.@(ts|tsx)",
	],
	addons: ["@storybook/addon-docs"],
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
