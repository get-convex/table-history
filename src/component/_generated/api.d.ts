/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib from "../lib.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  lib: typeof lib;
}>;
export type Mounts = {
  lib: {
    listDocumentHistory: FunctionReference<
      "query",
      "public",
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
      }
    >;
    listHistory: FunctionReference<
      "query",
      "public",
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
      }
    >;
    listSnapshot: FunctionReference<
      "query",
      "public",
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
      }
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        attribution: any;
        doc: any | null;
        id: string;
        serializability: "table" | "document" | "wallclock";
      },
      number
    >;
    vacuumHistory: FunctionReference<
      "mutation",
      "public",
      { minTsToKeep: number },
      any
    >;
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
