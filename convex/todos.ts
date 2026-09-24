import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import schema from "./schema";
import { DEFAULT_TODO_PRIORITY } from "./schema/todo_validators";

const MAX_TODOS = 100;

const TODO_ERRORS = {
	textRequired: {
		code: "TODO_TEXT_REQUIRED",
		message: "Todo text is required",
	},
	notFound: {
		code: "TODO_NOT_FOUND",
		message: "Todo not found",
	},
} as const;

export const todoValidator = schema.tables.todos.validator;

async function getUserId(ctx: QueryCtx | MutationCtx) {
	const user = await authComponent.getAuthUser(ctx);
	return user._id;
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getUserId(ctx);

		return await ctx.db
			.query("todos")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.take(MAX_TODOS);
	},
});

export const add = mutation({
	args: todoValidator.pick("text", "priority"),
	handler: async (ctx, args) => {
		const userId = await getUserId(ctx);
		const text = args.text.trim();

		if (!text) {
			throw new ConvexError(TODO_ERRORS.textRequired);
		}

		return await ctx.db.insert("todos", {
			userId,
			text,
			completed: false,
			priority: args.priority ?? DEFAULT_TODO_PRIORITY,
		});
	},
});

export const setCompleted = mutation({
	args: todoValidator.pick("completed").extend({ id: v.id("todos") }),
	handler: async (ctx, args) => {
		const userId = await getUserId(ctx);
		const todo = await ctx.db.get(args.id);

		if (!todo || todo.userId !== userId) {
			throw new ConvexError(TODO_ERRORS.notFound);
		}

		await ctx.db.patch(args.id, { completed: args.completed });
	},
});

export const setPriority = mutation({
	args: todoValidator.pick("priority").extend({ id: v.id("todos") }),
	handler: async (ctx, args) => {
		const userId = await getUserId(ctx);
		const todo = await ctx.db.get(args.id);

		if (!todo || todo.userId !== userId) {
			throw new ConvexError(TODO_ERRORS.notFound);
		}

		await ctx.db.patch(args.id, {
			priority: args.priority ?? DEFAULT_TODO_PRIORITY,
		});
	},
});

export const remove = mutation({
	args: { id: v.id("todos") },
	handler: async (ctx, args) => {
		const userId = await getUserId(ctx);
		const todo = await ctx.db.get(args.id);

		if (!todo || todo.userId !== userId) {
			throw new ConvexError(TODO_ERRORS.notFound);
		}

		await ctx.db.delete(args.id);
	},
});
