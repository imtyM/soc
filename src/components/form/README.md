# Form package

A type-safe form composition layer built on TanStack Form and the project’s
installed shadcn/ui primitives.

## Quick start

```tsx
import { useAppForm } from "~/components/form";
import z from "zod";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const defaultValues: z.input<typeof schema> = {
  email: "",
  password: "",
};

function SignInForm() {
  const form = useAppForm({
    defaultValues,
    validators: { onBlur: schema },
    onSubmit: ({ value }) => console.log(value),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppField
        name="email"
        children={(field) => (
          <field.FormInput label="Email" type="email" autoComplete="email" />
        )}
      />
      <form.AppField
        name="password"
        children={(field) => (
          <field.FormInput
            label="Password"
            type="password"
            autoComplete="current-password"
          />
        )}
      />
      <form.AppForm>
        <form.FormErrors />
        <form.SubmitButton label="Sign in" />
      </form.AppForm>
    </form>
  );
}
```

Use `AppField`, rather than the base `Field`, when rendering a registered field
component. Wrap form-level components in `AppForm`.

## Registered components

| Component | Value | Purpose |
| --- | --- | --- |
| `FormInput` | `string` | Text, email, password, date, and similar inputs |
| `FormTextarea` | `string` | Multi-line text |
| `FormNumber` | `number` | Numeric input with optional prefix and suffix |
| `FormSelect` | `string` | Predefined options |
| `FormCombobox` | `string` or `string[]` | Searchable, grouped, multi-select, and creatable options |
| `FormCheckbox` | `boolean` | Checkbox input |
| `FormRadioGroup` | `string` | Default or card-style radio choices |
| `FormSwitch` | `boolean` | Toggle input |
| `SubmitButton` | form state | Submit button with submitting state |
| `FormErrors` | form state | Consolidated validation errors |

`FormStateInspector` is an unregistered Storybook utility and must be rendered
inside `form.AppForm`.

## Currency field group

`CurrencyField` is a reusable group for an `{ amount, currency }` object. Its
`fields` path is checked against the parent form value.

```tsx
import { CurrencyField, useAppForm } from "~/components/form";

const form = useAppForm({
  defaultValues: {
    premium: {
      amount: 0,
      currency: "ZAR",
    },
  },
});

<CurrencyField
  form={form}
  fields="premium"
  label="Monthly premium"
  currencyOptions={[
    { label: "South African rand", value: "ZAR" },
    { label: "US dollar", value: "USD" },
  ]}
/>
```

## Adding a field

1. Add the shadcn primitive with `npx shadcn@latest add <component>`. Do not
   copy shadcn component source from another project.
2. Create the field component in `fields/` and use `useFieldContext` from
   `../contexts`.
3. Register it in `app-form.ts`.
4. Add a co-located Storybook story and update `form.mdx`.

For a reusable group of related fields, use the exported `withFieldGroup`.
Use `withForm` for reusable form sections that share one form instance.

## Documentation and scripts

The full guide and live examples are in `form.mdx` and the co-located
`*.stories.tsx` files.

```sh
npm run storybook
npm run build-storybook
```
