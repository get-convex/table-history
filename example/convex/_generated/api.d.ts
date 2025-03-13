/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as example from "../example.js";

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
  example: typeof example;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  userAuditLog: {
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
        }
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
        }
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
        }
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
        number
      >;
      vacuumHistory: FunctionReference<
        "mutation",
        "internal",
        { minTsToKeep: number },
        any
      >;
    };
  };
};
