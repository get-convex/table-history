/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      listDocumentHistory: FunctionReference<
        "query",
        "internal",
        {
          id: string;
          maxTs: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            attribution: any;
            doc: any;
            id: string;
            isDeleted: boolean;
            ts: number;
          }>;
          pageStatus?: null | "SplitRequired" | "SplitRecommended";
          splitCursor?: null | string;
        },
        Name
      >;
      listHistory: FunctionReference<
        "query",
        "internal",
        {
          maxTs: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            attribution: any;
            doc: any;
            id: string;
            isDeleted: boolean;
            ts: number;
          }>;
          pageStatus?: null | "SplitRequired" | "SplitRecommended";
          splitCursor?: null | string;
        },
        Name
      >;
      listSnapshot: FunctionReference<
        "query",
        "internal",
        {
          currentTs: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          snapshotTs: number;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            attribution: any;
            doc: any;
            id: string;
            isDeleted: boolean;
            ts: number;
          }>;
          pageStatus?: null | "SplitRequired" | "SplitRecommended";
          splitCursor?: null | string;
        },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          attribution: any;
          doc: any | null;
          id: string;
          serializability: "table" | "document" | "wallclock";
        },
        number,
        Name
      >;
      vacuumHistory: FunctionReference<
        "mutation",
        "internal",
        { minTsToKeep: number },
        any,
        Name
      >;
    };
  };
