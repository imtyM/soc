/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as catalogue from "../catalogue.js";
import type * as http from "../http.js";
import type * as phone_auth from "../phone_auth.js";
import type * as phone_auth_errors from "../phone_auth_errors.js";
import type * as phone_numbers from "../phone_numbers.js";
import type * as schema_account_validators from "../schema/account_validators.js";
import type * as schema_catalogue_validators from "../schema/catalogue_validators.js";
import type * as schema_phone_auth_validators from "../schema/phone_auth_validators.js";
import type * as schema_todo_validators from "../schema/todo_validators.js";
import type * as todos from "../todos.js";
import type * as twilio_verify from "../twilio_verify.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  auth: typeof auth;
  catalogue: typeof catalogue;
  http: typeof http;
  phone_auth: typeof phone_auth;
  phone_auth_errors: typeof phone_auth_errors;
  phone_numbers: typeof phone_numbers;
  "schema/account_validators": typeof schema_account_validators;
  "schema/catalogue_validators": typeof schema_catalogue_validators;
  "schema/phone_auth_validators": typeof schema_phone_auth_validators;
  "schema/todo_validators": typeof schema_todo_validators;
  todos: typeof todos;
  twilio_verify: typeof twilio_verify;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
