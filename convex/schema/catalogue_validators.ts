import { type Infer, v } from "convex/values";

export const CATALOGUE_LIMITS = {
	name: 120,
	description: 1200,
	search: 120,
} as const;
export const catalogueFieldsValidator = v.object({
	name: v.string(),
	description: v.string(),
	isReady: v.boolean(),
	isSynthetic: v.boolean(),
});
export type CatalogueFields = Infer<typeof catalogueFieldsValidator>;
export const catalogueEntryValidator = catalogueFieldsValidator.extend({
	nameSort: v.string(),
	searchText: v.string(),
	version: v.number(),
});
