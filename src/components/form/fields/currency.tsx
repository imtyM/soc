/* biome-ignore-all lint/correctness/noChildrenProp: TanStack Form uses a children render prop to preserve field type inference. */

import { FieldGroup } from "~/components/ui/field";
import { withFieldGroup } from "../app-form";

export interface CurrencyValue {
	amount: number;
	currency: string;
}

export interface CurrencyOption {
	label: string;
	value: string;
}

export interface CurrencyFieldProps {
	label: string;
	description?: string;
	amountPlaceholder?: string;
	currencyLabel?: string;
	currencyOptions?: ReadonlyArray<CurrencyOption>;
}

const currencyDefaultValues: CurrencyValue = {
	amount: 0,
	currency: "ZAR",
};

const defaultCurrencyOptions: ReadonlyArray<CurrencyOption> = [
	{ label: "South African rand", value: "ZAR" },
];

const currencyDefaultProps: CurrencyFieldProps = {
	label: "Amount",
	description: "",
	amountPlaceholder: "e.g. 1000",
	currencyLabel: "Currency",
	currencyOptions: defaultCurrencyOptions,
};

/**
 * A reusable, type-safe amount and currency field group.
 *
 * The `fields` prop points to a `CurrencyValue` object in the parent form.
 *
 * @example
 * ```tsx
 * <CurrencyField
 *   form={form}
 *   fields="premium"
 *   label="Monthly premium"
 *   currencyOptions={[
 *     { label: "South African rand", value: "ZAR" },
 *     { label: "US dollar", value: "USD" },
 *   ]}
 * />
 * ```
 */
export const CurrencyField = withFieldGroup<
	CurrencyValue,
	unknown,
	CurrencyFieldProps
>({
	defaultValues: currencyDefaultValues,
	props: currencyDefaultProps,
	render: function RenderCurrencyField({
		group,
		label,
		description = "",
		amountPlaceholder = "e.g. 1000",
		currencyLabel = "Currency",
		currencyOptions = defaultCurrencyOptions,
	}) {
		return (
			<FieldGroup className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
				<group.AppField
					name="amount"
					children={(field) => (
						<field.FormNumber
							label={label}
							description={description || undefined}
							placeholder={amountPlaceholder}
							min={0}
							step={0.01}
						/>
					)}
				/>
				<group.AppField
					name="currency"
					children={(field) => (
						<field.FormSelect label={currencyLabel} options={currencyOptions} />
					)}
				/>
			</FieldGroup>
		);
	},
});
