<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Project architecture and conventions

## General rules

- Follow the patterns, conventions, and implementation styles already present
  in the codebase.
- Extend existing patterns instead of creating parallel approaches.
- Discuss a genuinely new pattern with the developer before introducing it.
- Ask for clarification when intended behavior or the established pattern is
  unclear.
- Keep business logic in focused Convex resource files such as `todos.ts`.
  Split a resource only when its concepts become too large to remain clear.

## Stack

- TanStack Start with React and TypeScript
- Convex for the backend and database
- TanStack Query for reactive Convex reads
- Tailwind CSS and shadcn/ui for styling and components
- TanStack Form with Zod schemas for forms
- Biome for formatting and linting

## React component architecture

- Keep components pure with minimal logic before their return statement (a
  "small forehead").
- Extract substantial component logic into a hook co-located with the
  component.
- Define subcomponents below the parent in the order the parent calls them.
- Create subcomponents when they make the parent markup easier to read.
- Let subcomponents handle their own conditional rendering when that keeps the
  parent declarative.
- Prefer simple or composable components over prop-based variations.
- Use the `react` and `component-isolation` skills for the repository's detailed
  component rules.

### Forms

- Always apply a Zod schema to forms.
- Type `defaultValues` from the schema:

```ts
const defaultValues: z.infer<typeof schema> = {
	// ...
};
```

- Form schemas must conform to the corresponding Convex schema types.
- For enum-like fields, import the shared `as const` value array from
  `convex/schema/*_validators.ts` and build the Zod enum from it. Never
  duplicate enum values in frontend code.

### Convex data fetching

- Use TanStack Query's `useSuspenseQuery` with `convexQuery` for Convex reads:

```ts
const { data } = useSuspenseQuery(convexQuery(api.resource.list, {}));
```

- Do not use route loaders for Convex data fetching.
- Do not use `useConvexQuery`.
- Provide loading UI through a route pending component or nearby Suspense
  boundary.
- Continue using the project's Convex mutation hook for mutations.

## shadcn/ui

- Use the `shadcn` skill whenever working with shadcn/ui or `components.json`.
- Install shadcn components with the project package runner and shadcn CLI.
- Never port or copy generated `src/components/ui/*` files from another
  project.
- Inspect the current project preset and installed components before adding
  anything.

## Linting and checking

Lint a focused path with:

```bash
npx biome lint [PATH]
```

Run the full typecheck and Biome checks with:

```bash
npm run check
```

## Convex

### Schema compatibility and development data

- After changing the Convex schema or functions, run:

```bash
npx convex dev --once --typecheck enable
```

- This regenerates Convex types, typechecks the Convex code, and pushes once to
  the configured development deployment. Treat the push as a compatibility
  check against data already stored there.
- During MVP development, schema changes may intentionally be backward
  incompatible. Do not automatically add migrations for disposable development
  data.
- Never clear, reset, delete, or otherwise destroy a Convex database or
  deployment without explicit developer authorization.
- If compatibility fails because stored documents no longer match the schema,
  stop and ask the developer to intervene. Do not delete data, weaken the
  intended schema, or create an automatic migration workaround.

### Types from the schema

Import resource types directly from Convex:

```ts
import type { Doc } from "../convex/_generated/dataModel";

type Resource = Doc<"resources">;
```

Use the correct relative import for the calling file.

### Resource validators as function arguments

- Treat the table validator as the source of truth for resource-shaped function
  arguments.
- Export a resource validator from its Convex module:

```ts
import schema from "./schema";

export const resourceValidator = schema.tables.resources.validator;
```

- Derive create and update arguments with `pick`, `omit`, `partial`, or
  `extend` instead of redefining table fields:

```ts
export const create = mutation({
	args: resourceValidator.pick("name", "status"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("resources", args);
	},
});
```

- Keep authorization-derived, generated, and server-controlled fields out of
  public arguments by selecting only client-editable fields.

### Shared validators and enum values

- Put validators shared by multiple resources in focused modules under
  `convex/schema/`, such as `common_validators.ts` or
  `<domain>_validators.ts`.
- Export the validator and inferred TypeScript type from the same module.
- For enum-like fields, export one `as const` array and build the Convex
  validator from it:

```ts
export const CATEGORIES = ["foo", "bar"] as const;

export const categoryValidator = v.union(
	...CATEGORIES.map((category) => v.literal(category)),
);

export type Category = Infer<typeof categoryValidator>;
```

- Reuse the exported values in schemas, functions, UI options, and form schemas.
- Reuse common structured validators instead of redefining object shapes.
