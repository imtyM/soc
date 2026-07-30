---
name: component-isolation
description: Refactor complex React components with local context and isolated subcomponents. Use when prop drilling obscures a feature, a large component needs a folder boundary, or the user explicitly requests aggressive isolation, local context, no state or callback props, or ID-based list items.
---

# Component Isolation

Turn a complex feature component into a declarative composition whose
state-aware children consume a feature-local hook.

Use this pattern only when it improves a real coordination problem. For ordinary
React work, follow the React skill's preference for simple props and composition.
When the user explicitly asks for an aggressive isolation refactor, this skill's
local-context rules take precedence.

## Choose the mode

### Normal mode

Use the smallest useful refactor:

- Keep primitive data props when they remain clear.
- Extract a subcomponent when it has substantial markup, logic, or at least
  three coordination props.
- Introduce a feature folder when there are at least three meaningful files.
- Introduce context only when sibling or nested components genuinely coordinate
  shared state and callbacks.
- Keep simple conditionals in the parent when that reads better.

Do not add a provider to a component that has no prop drilling or shared feature
state.

### Aggressive mode

Use only when the user explicitly asks for it:

- Put the feature in its own folder.
- Move feature state, derived data, and callbacks into one local hook/provider.
- Pass no state or callback props between state-aware feature components.
- Let each child own its conditional rendering.
- Give list items only a stable item ID, then look up the item through the hook.
- Keep pure presentational helpers on normal data props when that is clearer.

"No props" means no state or callback drilling. Structural props such as
`children`, stable item IDs, and props for truly pure helpers remain valid.

## Suggested structure

```text
user-dashboard/
├── index.tsx
├── user-dashboard.tsx
├── use-user-dashboard.tsx
├── search-field.tsx
├── user-list.tsx
├── user-list-item.tsx
└── empty-state.tsx
```

Follow the repository's existing naming conventions if they differ. Keep the
provider, context, and consumer hook together in `use-<feature>.tsx` unless the
project already uses another established pattern.

## Provider pattern

```tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type User = {
  id: string;
  name: string;
};

type UserDashboardContextValue = {
  users: Array<User>;
  search: string;
  setSearch: (value: string) => void;
  selectUser: (userId: string) => void;
};

const UserDashboardContext =
  createContext<UserDashboardContextValue | null>(null);

export function UserDashboardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [search, setSearch] = useState("");

  // Use the project's established data and navigation hooks here.
  const users: Array<User> = [];
  const selectUser = (userId: string) => {
    void userId;
  };

  return (
    <UserDashboardContext
      value={{ users, search, setSearch, selectUser }}
    >
      {children}
    </UserDashboardContext>
  );
}

export function useUserDashboard() {
  const value = useContext(UserDashboardContext);

  if (!value) {
    throw new Error(
      "useUserDashboard must be used within UserDashboardProvider",
    );
  }

  return value;
}
```

Do not add `useMemo` or `useCallback` automatically. Use them only when the
project's compiler setup, an API identity requirement, or profiling justifies
them.

## Isolated children

```tsx
export function SearchField() {
  const { search, setSearch } = useUserDashboard();

  return (
    <input
      value={search}
      onChange={(event) => setSearch(event.target.value)}
    />
  );
}
```

```tsx
export function UserListItem({ userId }: { userId: string }) {
  const { users, selectUser } = useUserDashboard();
  const user = users.find((candidate) => candidate.id === userId);

  if (!user) {
    return null;
  }

  return <button onClick={() => selectUser(userId)}>{user.name}</button>;
}
```

Examples are architectural, not UI-library prescriptions. When the repository
uses shadcn, TanStack Router, or another established system, use its installed
components and APIs rather than copying the native controls above or introducing
MUI, React Router, or a parallel convention.

## Checklist

Before:

- Identify feature state, derived values, callbacks, and conditionals.
- Trace actual prop drilling and sibling coordination.
- Check existing feature-folder and context conventions.
- Choose normal or aggressive mode explicitly.

After:

- Keep the main component declarative with a small forehead.
- Keep the local provider scoped to the feature.
- Avoid state and callback drilling in aggressive mode.
- Preserve clear data props for pure helpers where appropriate.
- Keep list-item lookup bounded and efficient.
- Run typecheck, lint, tests, and a manual behavior check.
