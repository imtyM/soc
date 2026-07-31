/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useEffect, useState } from "react";
import z from "zod";
import { useAppForm } from "..";
import { FormStateInspector } from "../components/form-state-inspector";

const meta = {
	title: "Form/Fields/FormCombobox",
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const frameworks = [
	{ label: "React", value: "react" },
	{ label: "Vue", value: "vue" },
	{ label: "Angular", value: "angular" },
	{ label: "Svelte", value: "svelte" },
	{ label: "Next.js", value: "nextjs" },
	{ label: "Nuxt.js", value: "nuxtjs" },
	{ label: "Remix", value: "remix" },
	{ label: "Astro", value: "astro" },
	{ label: "Solid", value: "solid" },
	{ label: "Qwik", value: "qwik" },
];

const providers = [
	{ label: "Discovery Health", value: "discovery-001" },
	{ label: "Momentum Health", value: "momentum-002" },
	{ label: "Bonitas", value: "bonitas-003" },
	{ label: "Fedhealth", value: "fedhealth-004" },
	{ label: "Bestmed", value: "bestmed-005" },
	{ label: "Medshield", value: "medshield-006" },
	{ label: "Profmed", value: "profmed-007" },
	{ label: "GEMS", value: "gems-008" },
	{ label: "Bankmed", value: "bankmed-009" },
	{ label: "Keyhealth", value: "keyhealth-010" },
];

const tags = [
	{ label: "Hospital", value: "hospital" },
	{ label: "Day-to-day", value: "day-to-day" },
	{ label: "Chronic", value: "chronic" },
	{ label: "Maternity", value: "maternity" },
	{ label: "Dental", value: "dental" },
	{ label: "Optical", value: "optical" },
	{ label: "Mental Health", value: "mental-health" },
	{ label: "Oncology", value: "oncology" },
];

export const Default: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				framework: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="framework"
						children={(field) => (
							<field.FormCombobox
								label="Framework"
								placeholder="Select framework..."
								searchPlaceholder="Search frameworks..."
								options={frameworks}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.framework,
							errors: state.fieldMeta.framework?.errors || [],
							isTouched: state.fieldMeta.framework?.isTouched || false,
							isValid: state.fieldMeta.framework?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const WithDescription: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				provider: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="provider"
						children={(field) => (
							<field.FormCombobox
								label="Medical Aid Provider"
								description="Search and select your provider"
								placeholder="Select provider..."
								searchPlaceholder="Search providers..."
								options={providers}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.provider,
							errors: state.fieldMeta.provider?.errors || [],
							isTouched: state.fieldMeta.provider?.isTouched || false,
							isValid: state.fieldMeta.provider?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const WithValidation: Story = {
	render: () => {
		const schema = z.object({
			network: z.string().min(1, "Please select a network"),
		});

		const form = useAppForm({
			defaultValues: {
				network: "",
			},
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="network"
						children={(field) => (
							<field.FormCombobox
								label="Network"
								description="Select a provider network (required)"
								placeholder="Select network..."
								searchPlaceholder="Search networks..."
								emptyText="No networks found"
								options={[
									{ label: "Discovery Network", value: "discovery-network" },
									{ label: "Momentum Network", value: "momentum-network" },
									{ label: "Bonitas Network", value: "bonitas-network" },
									{ label: "Fedhealth Network", value: "fedhealth-network" },
									{ label: "Custom Network", value: "custom-network" },
								]}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.network,
							errors: state.fieldMeta.network?.errors || [],
							isTouched: state.fieldMeta.network?.isTouched || false,
							isValid: state.fieldMeta.network?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const LargeDataset: Story = {
	render: () => {
		// Generate a large dataset
		const countries = Array.from({ length: 50 }, (_, i) => ({
			label: `Country ${i + 1}`,
			value: `country-${i + 1}`,
		}));

		const form = useAppForm({
			defaultValues: {
				country: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="country"
						children={(field) => (
							<field.FormCombobox
								label="Country"
								description="Combobox is ideal for large datasets with search"
								placeholder="Select country..."
								searchPlaceholder="Search 50 countries..."
								options={countries}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.country,
							errors: state.fieldMeta.country?.errors || [],
							isTouched: state.fieldMeta.country?.isTouched || false,
							isValid: state.fieldMeta.country?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

// ============================================
// Multi-select Stories
// ============================================

export const MultiSelect: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				tags: [] as string[],
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="tags"
						children={(field) => (
							<field.FormCombobox
								multiple
								label="Benefit Tags"
								description="Select multiple tags"
								placeholder="Select tags..."
								searchPlaceholder="Search tags..."
								options={tags}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.tags,
							count: state.values.tags.length,
							errors: state.fieldMeta.tags?.errors || [],
							isTouched: state.fieldMeta.tags?.isTouched || false,
							isValid: state.fieldMeta.tags?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const MultiSelectWithValidation: Story = {
	render: () => {
		const schema = z.object({
			frameworks: z
				.array(z.string())
				.min(2, "Select at least 2 frameworks")
				.max(4, "Maximum 4 frameworks allowed"),
		});

		const form = useAppForm({
			defaultValues: {
				frameworks: [] as string[],
			},
			validators: {
				onBlur: schema,
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="frameworks"
						children={(field) => (
							<field.FormCombobox
								multiple
								label="Favorite Frameworks"
								description="Select 2-4 frameworks"
								placeholder="Select frameworks..."
								searchPlaceholder="Search frameworks..."
								options={frameworks}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.frameworks,
							count: state.values.frameworks.length,
							errors: state.fieldMeta.frameworks?.errors || [],
							isTouched: state.fieldMeta.frameworks?.isTouched || false,
							isValid: state.fieldMeta.frameworks?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const MultiSelectPreselected: Story = {
	render: () => {
		const form = useAppForm({
			defaultValues: {
				selectedProviders: ["discovery-001", "momentum-002"],
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="selectedProviders"
						children={(field) => (
							<field.FormCombobox
								multiple
								label="Selected Providers"
								description="Pre-selected values example"
								placeholder="Select providers..."
								searchPlaceholder="Search providers..."
								options={providers}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.selectedProviders,
							count: state.values.selectedProviders.length,
							errors: state.fieldMeta.selectedProviders?.errors || [],
							isTouched: state.fieldMeta.selectedProviders?.isTouched || false,
							isValid: state.fieldMeta.selectedProviders?.isValid ?? true,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

// ============================================
// Async Search Stories
// ============================================

// Simulated async data source
const allUsers = [
	{ label: "Alice Johnson", value: "user-1" },
	{ label: "Bob Smith", value: "user-2" },
	{ label: "Charlie Brown", value: "user-3" },
	{ label: "Diana Prince", value: "user-4" },
	{ label: "Edward Norton", value: "user-5" },
	{ label: "Fiona Apple", value: "user-6" },
	{ label: "George Lucas", value: "user-7" },
	{ label: "Hannah Montana", value: "user-8" },
	{ label: "Ivan Drago", value: "user-9" },
	{ label: "Julia Roberts", value: "user-10" },
];

export const AsyncSearch: Story = {
	render: () => {
		const [searchQuery, setSearchQuery] = useState("");
		const [isLoading, setIsLoading] = useState(false);
		const [filteredUsers, setFilteredUsers] = useState(allUsers);

		// Simulate async search
		useEffect(() => {
			if (!searchQuery) {
				setFilteredUsers(allUsers);
				return;
			}

			setIsLoading(true);
			const timer = setTimeout(() => {
				const results = allUsers.filter((user) =>
					user.label.toLowerCase().includes(searchQuery.toLowerCase()),
				);
				setFilteredUsers(results);
				setIsLoading(false);
			}, 500); // Simulate network delay

			return () => clearTimeout(timer);
		}, [searchQuery]);

		const form = useAppForm({
			defaultValues: {
				userId: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="userId"
						children={(field) => (
							<field.FormCombobox
								label="User"
								description="Async search with 500ms simulated delay"
								placeholder="Search users..."
								searchPlaceholder="Type to search..."
								emptyText="No users found"
								options={filteredUsers}
								onSearch={setSearchQuery}
								isLoading={isLoading}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.userId,
							searchQuery,
							resultsCount: filteredUsers.length,
							isLoading,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const AsyncSearchEmpty: Story = {
	render: () => {
		const [searchQuery, setSearchQuery] = useState("");
		const [isLoading, setIsLoading] = useState(false);
		const [filteredUsers, setFilteredUsers] = useState<typeof allUsers>([]);

		// Simulate async search - starts empty, shows results on search
		useEffect(() => {
			if (!searchQuery) {
				setFilteredUsers([]);
				return;
			}

			setIsLoading(true);
			const timer = setTimeout(() => {
				const results = allUsers.filter((user) =>
					user.label.toLowerCase().includes(searchQuery.toLowerCase()),
				);
				setFilteredUsers(results);
				setIsLoading(false);
			}, 500);

			return () => clearTimeout(timer);
		}, [searchQuery]);

		const form = useAppForm({
			defaultValues: {
				userId: "",
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="userId"
						children={(field) => (
							<field.FormCombobox
								label="User"
								description="Empty state - type to search"
								placeholder="Search users..."
								searchPlaceholder="Type to search..."
								emptyText="Type to search for users..."
								options={filteredUsers}
								onSearch={setSearchQuery}
								isLoading={isLoading}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.userId,
							searchQuery,
							resultsCount: filteredUsers.length,
							isLoading,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};

export const AsyncSearchWithMultiSelect: Story = {
	render: () => {
		const [searchQuery, setSearchQuery] = useState("");
		const [isLoading, setIsLoading] = useState(false);
		const [filteredUsers, setFilteredUsers] = useState(allUsers);

		useEffect(() => {
			if (!searchQuery) {
				setFilteredUsers(allUsers);
				return;
			}

			setIsLoading(true);
			const timer = setTimeout(() => {
				const results = allUsers.filter((user) =>
					user.label.toLowerCase().includes(searchQuery.toLowerCase()),
				);
				setFilteredUsers(results);
				setIsLoading(false);
			}, 500);

			return () => clearTimeout(timer);
		}, [searchQuery]);

		const form = useAppForm({
			defaultValues: {
				userIds: [] as string[],
			},
		});

		return (
			<div className="w-96 space-y-4">
				<form.AppForm>
					<form.AppField
						name="userIds"
						children={(field) => (
							<field.FormCombobox
								multiple
								label="Team Members"
								description="Async multi-select - search and select multiple"
								placeholder="Search team members..."
								searchPlaceholder="Type to search..."
								emptyText="No users found"
								options={filteredUsers}
								onSearch={setSearchQuery}
								isLoading={isLoading}
							/>
						)}
					/>
					<FormStateInspector
						title="Field State"
						selector={(state) => ({
							value: state.values.userIds,
							count: state.values.userIds.length,
							searchQuery,
							resultsCount: filteredUsers.length,
							isLoading,
						})}
					/>
				</form.AppForm>
			</div>
		);
	},
};
