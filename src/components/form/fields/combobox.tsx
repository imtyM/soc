/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */
import { ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { useFieldContext } from "../contexts";

export interface ComboboxOption {
	label: string;
	value: string;
}

export interface ComboboxOptionGroup {
	label: string;
	options: ComboboxOption[];
}

interface BaseFormComboboxProps {
	label: string;
	description?: string;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	hideError?: boolean;
	onSearch?: (query: string) => void;
	isLoading?: boolean;
	loadingText?: string;
	/** When true, allows typing a value not in the list. Shows a "Create" option. */
	creatable?: boolean;
	/** Label for the create option. Defaults to "Create". */
	createLabel?: string;
}

type FlatOptionsProps = BaseFormComboboxProps & {
	options: ComboboxOption[];
	groups?: never;
};

type GroupedOptionsProps = BaseFormComboboxProps & {
	options?: never;
	groups: ComboboxOptionGroup[];
};

type SingleSelectFlatProps = FlatOptionsProps & { multiple?: false };
type SingleSelectGroupedProps = GroupedOptionsProps & { multiple?: false };
type MultiSelectFlatProps = FlatOptionsProps & { multiple: true };
type MultiSelectGroupedProps = GroupedOptionsProps & { multiple: true };

export type FormComboboxProps =
	| SingleSelectFlatProps
	| SingleSelectGroupedProps
	| MultiSelectFlatProps
	| MultiSelectGroupedProps;

/**
 * FormCombobox - A searchable combobox field component for TanStack Form.
 *
 * This component follows the shadcn/ui pattern for form fields, providing
 * a consistent and accessible combobox experience with search functionality.
 * Ideal for large datasets and foreign key relationships where search is needed.
 *
 * @example Single select (default)
 * ```tsx
 * <form.AppField
 *   name="providerId"
 *   children={(field) => (
 *     <field.FormCombobox
 *       label="Provider"
 *       placeholder="Select provider..."
 *       options={providers.map(p => ({ label: p.name, value: p.id }))}
 *     />
 *   )}
 * />
 * ```
 *
 * @example Multi-select
 * ```tsx
 * <form.AppField
 *   name="tags"
 *   children={(field) => (
 *     <field.FormCombobox
 *       multiple
 *       label="Tags"
 *       placeholder="Select tags..."
 *       options={tags.map(t => ({ label: t.name, value: t.id }))}
 *     />
 *   )}
 * />
 * ```
 *
 * @example Async search
 * ```tsx
 * <form.AppField
 *   name="userId"
 *   children={(field) => (
 *     <field.FormCombobox
 *       label="User"
 *       placeholder="Search users..."
 *       options={filteredUsers}
 *       onSearch={setSearchQuery}
 *       isLoading={isSearching}
 *     />
 *   )}
 * />
 * ```
 */
export function FormCombobox({
	label,
	description,
	placeholder = "Select...",
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	options,
	groups,
	hideError = false,
	multiple = false,
	onSearch,
	isLoading = false,
	loadingText = "Loading...",
	creatable = false,
	createLabel = "Create",
}: FormComboboxProps) {
	const field = useFieldContext<string | string[]>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");

	// Flatten groups to get all options for selection logic
	const allOptions: ComboboxOption[] = groups
		? groups.flatMap((g) => g.options)
		: options || [];

	// For creatable mode: check if search value matches an existing option
	const searchMatchesOption = allOptions.some(
		(opt) => opt.label.toLowerCase() === searchValue.toLowerCase(),
	);
	const showCreateOption =
		creatable && searchValue.trim() && !searchMatchesOption;

	// Debounced search effect (300ms)
	useEffect(() => {
		if (!onSearch) return;
		const timer = setTimeout(() => {
			onSearch(searchValue);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchValue, onSearch]);

	// Reset search when popover closes
	useEffect(() => {
		if (!open) {
			setSearchValue("");
		}
	}, [open]);

	// Helper functions for value management
	const getValue = (): string[] => {
		if (Array.isArray(field.state.value)) {
			return field.state.value;
		}
		return field.state.value ? [field.state.value] : [];
	};

	const isSelected = (value: string): boolean => {
		return getValue().includes(value);
	};

	const handleSelect = (optionValue: string) => {
		if (multiple) {
			const currentValues = getValue();
			const newValues = isSelected(optionValue)
				? currentValues.filter((v) => v !== optionValue)
				: [...currentValues, optionValue];
			field.handleChange(newValues);
		} else {
			field.handleChange(optionValue);
			setOpen(false);
		}
	};

	const handleRemove = (optionValue: string, event: SyntheticEvent) => {
		event.stopPropagation();
		if (multiple) {
			const currentValues = getValue();
			const newValues = currentValues.filter((v) => v !== optionValue);
			field.handleChange(newValues);
		}
	};

	const selectedOptions = allOptions.filter((opt) => isSelected(opt.value));

	// Render the trigger content
	const renderTriggerContent = () => {
		if (multiple) {
			if (selectedOptions.length === 0) {
				return <span className="text-muted-foreground">{placeholder}</span>;
			}
			return (
				<div className="flex flex-wrap gap-1 py-0.5">
					{selectedOptions.map((opt) => (
						<Badge key={opt.value} variant="secondary" className="gap-1 pr-1">
							{opt.label}
							{/* biome-ignore lint/a11y/useSemanticElements: Cannot use button inside button (trigger) */}
							<span
								role="button"
								tabIndex={0}
								className="rounded-full hover:bg-muted-foreground/20 cursor-pointer"
								onClick={(e) => handleRemove(opt.value, e)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleRemove(opt.value, e);
									}
								}}
								aria-label={`Remove ${opt.label}`}
							>
								<XIcon data-icon="inline-end" />
							</span>
						</Badge>
					))}
				</div>
			);
		}

		// Single select
		if (selectedOptions.length > 0) {
			return selectedOptions[0].label;
		}

		// Creatable: show raw string value when it doesn't match any option
		if (
			creatable &&
			field.state.value &&
			typeof field.state.value === "string"
		) {
			return field.state.value;
		}

		return <span className="text-muted-foreground">{placeholder}</span>;
	};

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							type="button"
							id={field.name}
							variant="outline"
							role="combobox"
							aria-expanded={open}
							aria-invalid={isInvalid}
							onBlur={field.handleBlur}
							className={cn(
								"w-full justify-between",
								multiple && selectedOptions.length > 0 && "h-auto min-h-9",
							)}
						/>
					}
				>
					{renderTriggerContent()}
					<ChevronsUpDownIcon
						data-icon="inline-end"
						className="shrink-0 opacity-50"
					/>
				</PopoverTrigger>
				<PopoverContent className="w-(--anchor-width) p-0" align="start">
					<Command shouldFilter={!onSearch}>
						<CommandInput
							placeholder={searchPlaceholder}
							value={searchValue}
							onValueChange={setSearchValue}
						/>
						<CommandList className="max-sm:max-h-[50vh]">
							{isLoading ? (
								<CommandEmpty>{loadingText}</CommandEmpty>
							) : (
								<>
									{!showCreateOption && (
										<CommandEmpty>{emptyText}</CommandEmpty>
									)}
									{groups ? (
										groups.map((group) => (
											<CommandGroup key={group.label} heading={group.label}>
												{group.options.map((option) => (
													<CommandItem
														key={option.value}
														value={option.value}
														keywords={[option.label, group.label]}
														onSelect={() => handleSelect(option.value)}
														data-checked={isSelected(option.value)}
													>
														{option.label}
													</CommandItem>
												))}
											</CommandGroup>
										))
									) : (
										<CommandGroup>
											{allOptions.map((option) => (
												<CommandItem
													key={option.value}
													value={option.value}
													keywords={[option.label]}
													onSelect={() => handleSelect(option.value)}
													data-checked={isSelected(option.value)}
												>
													{option.label}
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{showCreateOption && (
										<CommandGroup>
											<CommandItem
												value={searchValue.trim()}
												keywords={[searchValue.trim()]}
												onSelect={() => handleSelect(searchValue.trim())}
												forceMount
											>
												<PlusIcon data-icon="inline-start" />
												{createLabel} &ldquo;{searchValue.trim()}&rdquo;
											</CommandItem>
										</CommandGroup>
									)}
								</>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && !hideError && (
				<FieldError errors={field.state.meta.errors} />
			)}
		</Field>
	);
}
