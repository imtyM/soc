# Component organization

- A simple component can remain a single `<name>.tsx` file.
- Move a growing component into a folder with an `index.tsx` entry point.
- Extract substantial logic into a co-located hook.
- Break complex markup into small components ordered by call order.
- Prefer composable child components where the feature has optional or
  swappable parts.
- When composition is not useful, keep focused child files beside their parent
  rather than creating unrelated global component folders.
- Separate markup from coordination logic so the layout remains easy to scan.

# Data-backed feature boundaries

- Put a feature-local contract between data-backed UI and its data source instead
  of spreading backend hooks through presentational children.
- Let production containers or providers adapt the real data hooks to that
  contract. Keep backend validation, authorization, and business rules in their
  authoritative backend layer and test them there.
- Add controlled Storybook providers selectively when browser interaction
  coverage is valuable. Keep them deterministic and shallow; model only the
  client-visible state transitions the story exercises rather than building a
  fake backend.
- Keep the boundary local to the cohesive feature. Do not create a global data
  abstraction, one provider per query, or test/runtime conditionals for choosing
  an adapter.
