/// <reference types="vite/client" />

import { describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { Serializability } from "./lib.js";

const modules = import.meta.glob("./**/*.*s");

describe("table-history", () => {
  test("update and list", async () => {
    const t = convexTest(schema, modules);
    const serializability: Serializability = "table";
    await t.mutation(api.lib.update, { id: "1", doc: { name: "beans", count: 10 }, serializability });
    await t.mutation(api.lib.update, { id: "1", doc: { name: "beans", count: 5 }, serializability });
    const maxTs = await t.mutation(api.lib.update, { id: "2", doc: { name: "socks", count: 1 }, serializability });

    // List all history
    const page = await t.query(api.lib.listHistory, {
      maxTs,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page.length).toEqual(3);
    expect(page.page[0].doc).toEqual({ name: "socks", count: 1 });
    expect(page.page[1].doc).toEqual({ name: "beans", count: 5 });
    expect(page.page[2].doc).toEqual({ name: "beans", count: 10 });
    expect(page.isDone).toEqual(true);

    // List by document
    const page2 = await t.query(api.lib.listDocumentHistory, {
      id: "1",
      maxTs,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page2.page.length).toEqual(2);
    expect(page2.page[0].doc).toEqual({ name: "beans", count: 5 });
    expect(page2.page[1].doc).toEqual({ name: "beans", count: 10 });
    expect(page2.isDone).toEqual(true);
  });

  test("snapshot", async () => {
    const t = convexTest(schema, modules);
    const serializability: Serializability = "table";
    await t.mutation(api.lib.update, { id: "1", doc: { name: "beans", count: 10 }, serializability });
    await t.mutation(api.lib.update, { id: "1", doc: { name: "beans", count: 5 }, serializability });
    const snapshotTs = await t.mutation(api.lib.update, { id: "2", doc: { name: "socks", count: 1 }, serializability });
    await t.mutation(api.lib.update, { id: "2", doc: { name: "socks", count: 4 }, serializability });
    const currentTs = await t.mutation(api.lib.update, { id: "1", doc: { name: "beans", count: 1 }, serializability });
    await t.mutation(api.lib.update, { id: "3", doc: { name: "shoes", count: 2 }, serializability });

    // Fetch one at a time
    const page0 = await t.query(api.lib.listSnapshot, {
      snapshotTs,
      currentTs,
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(page0.page.length).toEqual(1);
    expect(page0.page[0].doc).toEqual({ name: "socks", count: 1 });
    expect(page0.isDone).toEqual(false);
    const page1 = await t.query(api.lib.listSnapshot, {
      snapshotTs,
      currentTs,
      paginationOpts: { numItems: 1, cursor: page0.continueCursor },
    });
    expect(page1.page.length).toEqual(1);
    expect(page1.page[0].doc).toEqual({ name: "beans", count: 5 });
    expect(page1.isDone).toEqual(false);
    const page2 = await t.query(api.lib.listSnapshot, {
      snapshotTs,
      currentTs,
      paginationOpts: { numItems: 1, cursor: page1.continueCursor },
    });
    expect(page2.page.length).toEqual(0);
    expect(page2.isDone).toEqual(true);

    // Fetch all at once
    const allPage = await t.query(api.lib.listSnapshot, {
      snapshotTs,
      currentTs,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(allPage.page.length).toEqual(2);
    expect(allPage.page[0].doc).toEqual({ name: "socks", count: 1 });
    expect(allPage.page[1].doc).toEqual({ name: "beans", count: 5 });
    expect(allPage.isDone).toEqual(true);
  });

  test("vacuum", async () => {
    vi.useFakeTimers();

    const t = convexTest(schema, modules);
    const serializability: Serializability = "table";
    await t.mutation(api.lib.update, { id: "1", doc: { name: "beans", count: 10 }, serializability });
    await t.mutation(api.lib.update, { id: "1", doc: { name: "beans", count: 5 }, serializability });
    await t.mutation(api.lib.update, { id: "2", doc: { name: "socks", count: 1 }, serializability });
    await t.mutation(api.lib.update, { id: "2", doc: null, serializability });
    const minTsToKeep = await t.mutation(api.lib.update, { id: "3", doc: { name: "shoes", count: 2 }, serializability });
    await t.mutation(api.lib.vacuumHistory, { minTsToKeep });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const history = await t.query(api.lib.listHistory, {
      maxTs: minTsToKeep,
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(history.page.length).toEqual(2);
    expect(history.page[0].doc).toEqual({ name: "shoes", count: 2 });
    expect(history.page[1].doc).toEqual({ name: "beans", count: 5 });

    vi.useRealTimers();
  });
});
