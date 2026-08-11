<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Linear work and agent execution

Linear is the source of truth for actionable work in this repository. The
project is currently in the `Sea of change` team and the `Setup project` Linear
project.

Before planning or implementing an issue:

- Read the `Sea of change` team description, the team-level `AGENTS.md`
  document it references, and the complete selected issue, including its
  project, resources, and linked context.
- Confirm that the issue has exactly one execution-mode label. If the label is
  missing, ambiguous, or conflicts with the issue, stop and ask the developer.
- Do not make code or repository documentation changes without a Linear issue,
  including small fixes and chores, unless the developer explicitly authorizes
  an exception for that specific change.

Every actionable issue must have exactly one of these mutually exclusive
execution-mode labels:

- `agent-implementer-ready`: The issue is fully specified and bounded. Material
  decisions are settled, and an unattended implementation agent may make only
  ordinary mechanical choices while implementing, verifying, committing,
  pushing, and opening a pull request. A blocking ambiguity requires
  clarification or reclassification.
- `agent-owner-ready`: The outcome, constraints, authority, and acceptance
  criteria are clear, but the implementation approach may require autonomous
  context gathering and bounded engineering judgment. The agent may make
  reversible in-scope technical decisions, records material rationale, and
  implements, verifies, commits, pushes, and opens a pull request. Material
  ambiguity requires reclassification to `agent-and-user`; it must not be left
  as a blocking pull-request question.
- `agent-and-user`: The issue must be handled in an interactive local session.
  Interview the developer, implement incrementally, and pause at material
  decisions.
- `user-only`: The issue requires a human-only action. An agent may research,
  prepare instructions, or verify afterward, but must not execute the task
  independently.

Autonomous issue pickup follows these rules:

- Unattended implementation runners may select only unblocked
  `agent-implementer-ready` issues.
- Autonomous owner agents may select only unblocked `agent-owner-ready` issues.
- Neither autonomous mode may select `agent-and-user` or `user-only` issues.
- Do not start an issue with no execution label, multiple execution labels,
  unresolved blockers, or content that contradicts its label.
- Both autonomous modes must read all required Linear, repository, skill, and
  scoped instruction context before acting.

For all code-capable work (`agent-implementer-ready`, `agent-owner-ready`, and
`agent-and-user`):

- Before editing files, create or switch to the issue's exact Linear-generated
  `gitBranchName`.
- Never invent, normalize, shorten, or substitute the branch name.
- Never commit implementation work directly to the default branch.
- Verify the work in proportion to its risk, commit it, push the Linear branch,
  and open a pull request. Do not merge the pull request unless the developer
  explicitly asks.

If required Linear context is unavailable or contradicts repository guidance,
stop and ask the developer before proceeding.

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

## Local development ports

- Run the SOC application on port 4317. Never start it on port 3000 or allow
  Vite to choose a fallback port.
- If port 4317 is occupied, report the conflict. Do not terminate an unrelated
  process without explicit developer authorization.
- Keep Storybook on port 6006.

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
