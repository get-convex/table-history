import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  history: defineTable({
    id: v.string(),
    ts: v.number(),
    doc: v.union(v.any(), v.null()),
    isDeleted: v.boolean(),
    attribution: v.any(),
  })
    .index("ts", ["ts"])
    .index("id", ["id", "ts"]),
  vacuumed: defineTable({
    minTsToKeep: v.number(),
  }),
});
