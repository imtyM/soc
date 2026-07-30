---
name: react
description: Skill to write clean and maintainable React code. Use when working with .tsx and .jsx files.
---

# React

## Instructions

When you create or update React code, follow these rules:

- The main exported component should be at the top of the file.
- Subcomponents should be defined below the main component, and in the order
  they are used.
- If the top level component has a very large forehead (that is, a lot of logic
  and computation defined before the return and render of the markup),
  then extract related logic into custom hooks defined below all component
  definitions. If the hook is very large, consider moving it to a separate file.
- If a hook or piece of logic is generic, and you see that it is more of a utility,
  consider moving it to a utilities file. This is usually in the `lib` or `utils`
  folder in the same project.
- Clean up types. We don't want to use `any`, you can rather state to the user
  that you don't know the type here. Also try not to cast - unless it makes
  absolute sense. More about types later.
- In React 19 projects, do not add `useMemo` or `useCallback` by default. Use
  them when referential identity is required or profiling justifies them.
- Avoid `useEffect` when rendering, event handlers, derived state, or framework
  data APIs express the behavior more directly.

### Components

**Pattern Selection (in order of preference):**

1. **Simple component** - single responsibility, props in, JSX out. Default choice.
2. **Compound component** - when sub-parts need shared state or flexible
composition. Use dot notation exports.

**Compound Component Structure:**

```tsx
// ✅ Dot notation for related composable parts
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>{children}</Card.Body>
</Card>

// Export pattern:
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
});
```

**Rules:**

- Don't force composition. If a component has no optional/swappable parts, keep it simple.
- Co-locate component hooks under `ComponentName/useComponentName.ts`, or use
  `.tsx` when the module contains a context provider with JSX. Follow the
  repository's existing file-naming convention.
- Context is a last resort for shared state. Prefer props, then composition,
  then context. If the user explicitly requests an aggressive
  `$component-isolation` refactor, that skill's local-context rules take
  precedence.
- Forward refs on components wrapping native elements.
- Extend native element props when wrapping (`ComponentProps<"button">`).
- use cn for conditional classNames.

**Props:**

- Destructure props in function signature.
- Use discriminated unions for mutually exclusive prop sets, not optional booleans.
- Event handler props: `onX`. Internal handlers: `handleX`.
- Avoid `children` as a function unless render delegation is required.

**Performance:**

- Never define components inside other components.
- Avoid expensive inline object or array construction in hot component paths
  when profiling shows it matters. Do not obscure simple JSX preemptively.

**Types:**

- Infer from schema/data when possible.
- Use `ComponentProps<"element">` to extend HTML attributes.
- Generic components are fine; don't over-abstract.

### Forms

We usually work with tanstack forms. Refactor and clean with the following rules:

- Ensure that the app form is used, because the project likely has a composition
  around tanstack forms.
- When default values are used, ensure that they are typed properly.
  This is done by moving the default values to a separate constant
  and inferring the type from the schema there:

  ```js
  const schema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    age: z.number().min(0, "Age must be a positive number"),
  });
  ...

  const defaultValues: z.infer<typeof schema> = {
    name: "",
    age: 0,
  };

  const form = useAppForm({
    schema,
    defaultValues,
  });
  ```

### Convex

If there is a convex skill and you're working in a convex file, use it.
