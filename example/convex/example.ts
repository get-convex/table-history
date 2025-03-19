import { query, mutation as rawMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { TableHistory } from "convex-table-history";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Triggers } from "convex-helpers/server/triggers";
import { DataModel } from "./_generated/dataModel";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { PaginatedQueryReference } from "convex/react";
import { api } from "./_generated/api";

const userAuditLog = new TableHistory<DataModel, "users">(components.userAuditLog, {
  serializability: "wallclock",
});

const triggers = new Triggers<DataModel>();
triggers.register("users", userAuditLog.trigger());
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").first();
    if (!user) {
      await ctx.db.insert("users", {
        name: args.name,
        email: args.email,
      });
    } else {
      await ctx.db.patch(user._id, {
        name: args.name,
        email: args.email,
      });
    }
  },
});

export const listHistory = query({
  args: {
    maxTs: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await userAuditLog.listHistory(ctx, args.maxTs, args.paginationOpts);
  },
});

export const listDocumentHistory = query({
  args: {
    id: v.id("users"),
    maxTs: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await userAuditLog.listDocumentHistory(ctx, args.id, args.maxTs, args.paginationOpts);
  },
});

const _typeAssertion: PaginatedQueryReference = api.example.listDocumentHistory;

export const listSnapshot = query({
  args: {
    snapshotTs: v.number(),
    currentTs: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await userAuditLog.listSnapshot(ctx, args.snapshotTs, args.currentTs, args.paginationOpts);
  },
});
