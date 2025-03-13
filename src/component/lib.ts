import { v, Infer, Validator } from "convex/values";
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { paginator } from "convex-helpers/server/pagination";
import schema from "./schema.js";
import { paginationOptsValidator } from "convex/server";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

export const serializabilityValidator = v.union(
  /// "table" serializability means all writes to the table are serialized,
  /// so the timestamps are in causal order. This gives the strictest guarantees
  /// but can cause OCC conflicts if the table updates frequently.
  /// Writes to different tables are not serialized.
  v.literal("table"),
  /// "document" serializability means all writes to the same document are serialized,
  /// but writes to different documents may have out-of-order timestamps.
  v.literal("document"),
  /// "wallclock" serializability means the timestamp is set to the current time
  /// according to the server's clock. This provides no guarantees, but it's
  /// usually in causal order and causes no OCC conflicts.
  /// Wallclock serializability is the default.
  v.literal("wallclock"),
);
export type Serializability = Infer<typeof serializabilityValidator>;

export const historyEntryValidator = v.object({
  id: v.string(),
  doc: v.any(),
  ts: v.number(),
  isDeleted: v.boolean(),
  attribution: v.any(),
});
export type HistoryEntry = Infer<typeof historyEntryValidator>;

async function newTimestamp(
  ctx: QueryCtx,
  serializability: Serializability,
  id: string,
) {
  switch (serializability) {
    case "table": {
      const latest = await ctx.db.query("history").withIndex("ts").order("desc").first();
      if (latest) {
        return Math.max(latest.ts + 1, Date.now());
      } else {
        return Date.now();
      }
    }
    case "document": {
      const latest = await ctx.db.query("history").withIndex("id", (q) => q.eq("id", id)).order("desc").first();
      if (latest) {
        return Math.max(latest.ts + 1, Date.now());
      } else {
        return Date.now();
      }
    }
    case "wallclock": {
      return Date.now();
    }
  }
}

export const update = mutation({
  args: {
    id: v.string(),
    doc: v.union(v.any(), v.null()),
    serializability: serializabilityValidator,
    attribution: v.any(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let ts = await newTimestamp(ctx, args.serializability, args.id);
    const existing = await ctx.db.query("history").withIndex("id", (q) => q.eq("id", args.id).eq("ts", ts)).first();
    if (existing) {
      ts = existing.ts + 1;
    }
    await ctx.db.insert("history", {
      id: args.id,
      doc: args.doc,
      ts,
      isDeleted: args.doc === null,
      attribution: args.attribution,
    });
    return ts;
  },
});

function paginationResultValidator<T>(itemValidator: Validator<T, "required", string>) {
  return v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    page: v.array(itemValidator),
    pageStatus: v.optional(v.union(v.null(), v.literal("SplitRequired"), v.literal("SplitRecommended"))),
    splitCursor: v.optional(v.union(v.null(), v.string())),
  });
}
export type PaginationResult<T> = Infer<ReturnType<typeof paginationResultValidator<T>>>;

export const listHistory = query({
  args: {
    maxTs: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(historyEntryValidator),
  handler: async (ctx, args) => {
    const results = await paginator(ctx.db, schema)
      .query("history")
      .withIndex("ts", (q) => q.lte("ts", args.maxTs))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...results,
      page: results.page.map(extractHistoryEntry),
    };
  },
});

function extractHistoryEntry(h: Doc<"history">): HistoryEntry {
  return {
    id: h.id,
    doc: h.doc,
    ts: h.ts,
    isDeleted: h.isDeleted,
    attribution: h.attribution,
  };
}

export const listDocumentHistory = query({
  args: {
    id: v.string(),
    maxTs: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(historyEntryValidator),
  handler: async (ctx, args) => {
    const results = await paginator(ctx.db, schema)
      .query("history")
      .withIndex("id", (q) => q.eq("id", args.id).lte("ts", args.maxTs))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...results,
      page: results.page.map(extractHistoryEntry),
    };
  },
});

// Sentinel value for end of cursor.
const END_CURSOR = "END_CURSOR";

export const listSnapshot = query({
  args: {
    snapshotTs: v.number(),
    currentTs: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(historyEntryValidator),
  handler: async (ctx, args) => {
    const pageSize = args.paginationOpts.numItems;
    const page: HistoryEntry[] = [];
    if (args.paginationOpts.cursor === END_CURSOR) {
      return {
        continueCursor: END_CURSOR,
        isDone: true,
        page: [],
      };
    }
    if (pageSize <= 0) {
      throw new Error("pageSize must be positive");
    }
    if (args.currentTs < args.snapshotTs) {
      throw new Error("currentTs must be >= snapshotTs");
    }
    const vacuumed = await ctx.db.query("vacuumed").first();
    if (vacuumed && vacuumed.minTsToKeep > args.snapshotTs) {
      throw new Error("invalid snapshotTs, snapshot has been vacuumed");
    }
    const targetEndCursor = args.paginationOpts.endCursor ?? null;
    let prevId = args.paginationOpts.cursor;
    const allIdsSeen: string[] = [];
    const allIdsBeforeCurrentTs: string[] = [];
    while (allIdsBeforeCurrentTs.length < pageSize || targetEndCursor !== null) {
      const itemWithNextId = await ctx.db.query("history").withIndex("id", (q) =>
        prevId !== null ? q.lt("id", prevId) : q
      ).order("desc").first();
      if (itemWithNextId === null) {
        return {
          continueCursor: END_CURSOR,
          isDone: true,
          page,
          ...maybeSplit(allIdsSeen, pageSize),
        };
      }
      allIdsSeen.push(itemWithNextId.id);
      prevId = itemWithNextId.id;
      if (targetEndCursor !== null && targetEndCursor !== END_CURSOR && itemWithNextId.id < targetEndCursor) {
        // We've reached the end of the page.
        return {
          continueCursor: targetEndCursor,
          isDone: targetEndCursor === END_CURSOR,
          page,
          ...maybeSplit(allIdsSeen, pageSize),
        };
      }
      let revision: Doc<"history"> | null = itemWithNextId;
      if (itemWithNextId.ts > args.snapshotTs) {
        // Find the revision as it existed at args.ts
        const itemAtSnapshotTs = await ctx.db.query("history").withIndex("id", (q) => q.eq("id", itemWithNextId.id).lte("ts", args.snapshotTs)).order("desc").first();
        if (itemAtSnapshotTs === null) {
          // The item doesn't exist in the snapshotTs snapshot.
          // Check if it exists as of currentTs
          const itemAtCurrentTs = await ctx.db.query("history").withIndex("id", (q) => q.eq("id", itemWithNextId.id).lte("ts", args.currentTs)).order("desc").first();
          if (itemAtCurrentTs === null) {
            // It was created after currentTs, so we should treat it like it doesn't exist.
            // prevId has advanced, but it never gets returned.
            continue;
          } else {
            // It was created between snapshotTs and currentTs, so it counts toward the limit and can be in the cursor, but it's not in the page.
            revision = null;
          }
        } else {
          revision = itemAtSnapshotTs;
        }
      }
      if (revision && revision.isDeleted) {
        // If it's deleted, we don't want to include it in the page, but it counts toward the limit and can be in the cursor.
        revision = null;
      }
      allIdsBeforeCurrentTs.push(itemWithNextId.id);
      if (revision) {
        page.push(extractHistoryEntry(revision));
      }
    }
    const output: Infer<ReturnType<typeof paginationResultValidator<HistoryEntry>>> = {
      continueCursor: allIdsBeforeCurrentTs[allIdsBeforeCurrentTs.length - 1],
      isDone: false,
      page,
      ...maybeSplit(allIdsSeen, pageSize),
    };
    return output;
  },
});

function maybeSplit(allIdsSeen: string[], pageSize: number): {
  splitCursor?: string;
  pageStatus?: "SplitRecommended";
} {
  if (allIdsSeen.length >= pageSize * 2) {
    return {
      splitCursor: allIdsSeen[pageSize-1],
      pageStatus: "SplitRecommended",
    };
  }
  return {};
}

/**
 * Deletes history of state that was gone (overwritten or deleted) before
 * minTsToKeep.
 * 
 * After `vacuumHistory` is called, `listSnapshot` with `ts` before `minTsToKeep` will not
 * necessarily be correct.
 * 
 * This mutation does not delete history atomically. It may take a while with
 * async operations.
 * 
 * NOTE: `usePaginatedQuery` on `listSnapshot` may yield pages that have gaps or
 * overlap if a reactive query is subscribed when `vacuumHistory` runs.
 */
export const vacuumHistory = mutation({
  args: {
    minTsToKeep: v.number(),
  },
  handler: async (ctx, args) => {
    // Ensure that no one relies on vacuuming running immediately by waiting
    // 100ms.
    // This also avoids race conditions where `args.minTsToKeep` is so recent
    // that new entries with earlier timestamps are still being added to the
    // history table.
    await ctx.scheduler.runAfter(100, internal.lib.vacuumHistoryRecursive, {
      minTsToKeep: args.minTsToKeep,
      paginationOpts: {
        numItems: 100,
        cursor: null,
      },
    });
  },
});

export const vacuumHistoryRecursive = internalMutation({
  args: {
    minTsToKeep: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const vacuumed = await ctx.db.query("vacuumed").first();
    const startTs = vacuumed?.minTsToKeep ?? 0;
    if (startTs >= args.minTsToKeep) {
      return;
    }
    const toDelete = await paginator(ctx.db, schema)
      .query("history")
      .withIndex("ts", (q) => q.gt("ts", startTs).lte("ts", args.minTsToKeep))
      .order("asc")
      .paginate(args.paginationOpts);
    let maxTs = startTs;
    for (const h of toDelete.page) {
      const prevRev = await ctx.db.query("history").withIndex("id", (q) => q.eq("id", h.id).lt("ts", h.ts)).order("desc").first();
      if (prevRev !== null) {
        await ctx.db.delete(prevRev._id);
      }
      if (h.isDeleted) {
        await ctx.db.delete(h._id);
      }
      maxTs = Math.max(maxTs, h.ts);
    }
    if (vacuumed === null) {
      await ctx.db.insert("vacuumed", {
        minTsToKeep: maxTs,
      });
    } else {
      await ctx.db.patch(vacuumed._id, {
        minTsToKeep: maxTs,
      });
    }
    await ctx.scheduler.runAfter(0, internal.lib.vacuumHistoryRecursive, {
      minTsToKeep: args.minTsToKeep,
      paginationOpts: {
        numItems: args.paginationOpts.numItems,
        cursor: toDelete.continueCursor,
      }
    });
  },
});
