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
