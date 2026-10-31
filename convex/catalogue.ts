import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireOperator } from "./accounts";
import { authComponent } from "./auth";
import schema from "./schema";
import {
	CATALOGUE_LIMITS,
	type CatalogueFields,
} from "./schema/catalogue_validators";

export const catalogueValidator = schema.tables.organisations.validator;
function fail(code: string, message: string): never {
	throw new ConvexError({ code, message });
}
async function requireMaintenance(ctx: QueryCtx) {
	if (!(await authComponent.safeGetAuthUser(ctx)))
		fail("CATALOGUE_FORBIDDEN", "Operator access is required.");
	await requireOperator(ctx);
}
function fields(value: CatalogueFields) {
	const name = value.name.trim();
	const description = value.description.trim();
	if (
		!name ||
		name.length > CATALOGUE_LIMITS.name ||
		!description ||
		description.length > CATALOGUE_LIMITS.description
	)
		fail(
			"CATALOGUE_INVALID",
			"Enter a name of 1–120 characters and a description of 1–1200 characters.",
		);
	return {
		name,
		description,
		isReady: value.isReady,
		isSynthetic: value.isSynthetic,
		nameSort: name.toLocaleLowerCase("en-ZA"),
		searchText: `${name}\n${description}`,
	};
}
function checkPage(numItems: number) {
	if (!Number.isInteger(numItems) || numItems < 1 || numItems > 50)
		fail("CATALOGUE_PAGE_INVALID", "Request a page of 1–50 organisations.");
}

export const list = query({
	args: { search: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		checkPage(args.paginationOpts.numItems);
		const search = args.search.trim();
		if (search.length > CATALOGUE_LIMITS.search)
			fail("CATALOGUE_SEARCH_INVALID", "Search using at most 120 characters.");
		const rows = search
			? await ctx.db
					.query("organisations")
					.withSearchIndex("search_catalogue", (q) =>
						q.search("searchText", search).eq("isReady", true),
					)
					.paginate(args.paginationOpts)
			: await ctx.db
					.query("organisations")
					.withIndex("by_isReady_and_nameSort", (q) => q.eq("isReady", true))
					.paginate(args.paginationOpts);
		return {
			...rows,
			page: rows.page.map(({ _id, name, description, isSynthetic }) => ({
				_id,
				name,
				description,
				isSynthetic,
			})),
		};
	},
});
export const managementList = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		await requireMaintenance(ctx);
		checkPage(args.paginationOpts.numItems);
		const rows = await ctx.db
			.query("organisations")
			.withIndex("by_nameSort")
			.paginate(args.paginationOpts);
		return {
			...rows,
			page: rows.page.map(
				({ _id, name, description, isReady, isSynthetic, version }) => ({
					_id,
					name,
					description,
					isReady,
					isSynthetic,
					version,
				}),
			),
		};
	},
});
export const create = mutation({
	args: catalogueValidator.pick(
		"name",
		"description",
		"isReady",
		"isSynthetic",
	),
	handler: async (ctx, args) => {
		await requireMaintenance(ctx);
		return await ctx.db.insert("organisations", {
			...fields(args),
			version: 1,
		});
	},
});
export const update = mutation({
	args: catalogueValidator
		.pick("name", "description", "isReady", "isSynthetic")
		.extend({
			id: v.id("organisations"),
			expectedVersion: v.number(),
		}),
	handler: async (ctx, args) => {
		await requireMaintenance(ctx);
		const entry = await ctx.db.get("organisations", args.id);
		if (!entry)
			fail("CATALOGUE_NOT_FOUND", "Organisation is no longer available.");
		if (entry.version !== args.expectedVersion)
			fail(
				"CATALOGUE_CHANGED",
				"This organisation changed. Close the editor and reopen it before saving.",
			);
		await ctx.db.patch("organisations", entry._id, {
			...fields(args),
			version: entry.version + 1,
		});
		return null;
	},
});
