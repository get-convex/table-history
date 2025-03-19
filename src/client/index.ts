import {
  DocumentByName,
  Expand,
  FunctionReference,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
  TableNamesInDataModel,
} from "convex/server";
import { GenericId } from "convex/values";
import { api } from "../component/_generated/api";
import type { Serializability } from "../component/lib";

export class TableHistory<DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel>> {
  public options: {
    serializability: Serializability;
  };
  constructor(
    public component: UseApi<typeof api>,
    options?: {
      serializability?: Serializability;
    }
  ) {
    this.options = {
      serializability: options?.serializability ?? "wallclock",
    };
  }

  /**
   * Write a new history entry.
   * 
   * @argument attribution an arbitrary object that will be stored with the
   *   history entry. Attribution can include actor/user identity, reason for
   *   change, etc.
   */
  async update(
    ctx: RunMutationCtx,
    id: GenericId<TableName>,
    doc: DocumentByName<DataModel, TableName> | null,
    attribution: unknown = null,
  ) {
    return ctx.runMutation(this.component.lib.update, {
      id,
      doc,
      serializability: this.options.serializability,
      attribution,
    });
  }

  /**
   * Paginate the history of the table, from newest to oldest.
   * 
   * @argument maxTs To keep pages contiguous, set `maxTs` to a fixed timestamp
   *   (milliseconds since epoch, like Date.now()) and keep
   *   it the same for subsequent pages.
   */
  async listHistory(ctx: RunQueryCtx, maxTs: number, paginationOpts: PaginationOptions) {
    return ctx.runQuery(this.component.lib.listHistory, { maxTs, paginationOpts });
  }
  /**
   * Paginate the history of a single document, from newest to oldest.
   * 
   * @argument maxTs To keep pages contiguous, set `maxTs` to a fixed timestamp
   *   (milliseconds since epoch, like Date.now()) and keep
   *   it the same for subsequent pages.
   */
  async listDocumentHistory(ctx: RunQueryCtx, id: GenericId<TableName>, maxTs: number, paginationOpts: PaginationOptions) {
    return ctx.runQuery(this.component.lib.listDocumentHistory, { id, maxTs, paginationOpts });
  }
  /**
   * Paginate a snapshot of the table at a fixed timestamp.
   * 
   * @argument ts the snapshot at which you want to list the table (milliseconds since epoch)
   * @argument currentTs a fixed recent timestamp (milliseconds since epoch, like Date.now())
   *   which should be the same for subsequent pages.
   */
  async listSnapshot(ctx: RunQueryCtx, snapshotTs: number, currentTs: number, paginationOpts: PaginationOptions) {
    return ctx.runQuery(this.component.lib.listSnapshot, { snapshotTs, currentTs, paginationOpts });
  }

  /**
   * Delete old history entries.
   * 
   * @argument minTsToKeep the timestamp (milliseconds since epoch) of the oldest
   *   snapshot of history that should be kept.
   */
  async vacuumHistory(ctx: RunMutationCtx, minTsToKeep: number) {
    return ctx.runMutation(this.component.lib.vacuumHistory, { minTsToKeep });
  }

  /**
   * For use with `Triggers` from "convex-helpers/server/triggers".
   */
  trigger<Ctx extends RunMutationCtx>(): Trigger<Ctx, DataModel, TableName> {
    return async (ctx, change) => {
      let attribution: unknown = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((ctx as any).auth && typeof (ctx as any).auth.getUserIdentity === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attribution = await (ctx as any).auth.getUserIdentity();
      }
      await this.update(ctx, change.id, change.newDoc, attribution);
    };
  }
}

/* Type utils follow */

export type Trigger<
  Ctx,
  DataModel extends GenericDataModel,
  TableName extends TableNamesInDataModel<DataModel>,
> = (ctx: Ctx, change: Change<DataModel, TableName>) => Promise<void>;

export type Change<
  DataModel extends GenericDataModel,
  TableName extends TableNamesInDataModel<DataModel>,
> = {
  id: GenericId<TableName>;
} & (
  | {
      operation: "insert";
      oldDoc: null;
      newDoc: DocumentByName<DataModel, TableName>;
    }
  | {
      operation: "update";
      oldDoc: DocumentByName<DataModel, TableName>;
      newDoc: DocumentByName<DataModel, TableName>;
    }
  | {
      operation: "delete";
      oldDoc: DocumentByName<DataModel, TableName>;
      newDoc: null;
    }
);

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export type OpaqueIds<T> = T extends GenericId<infer _T>
  ? string
  : T extends (infer U)[]
    ? OpaqueIds<U>[]
    : T extends ArrayBuffer
      ? ArrayBuffer
      : T extends object
        ? { [K in keyof T]: OpaqueIds<T[K]> }
        : T;

export type UseApi<API> = Expand<{
  [mod in keyof API]: API[mod] extends FunctionReference<
    infer FType,
    "public",
    infer FArgs,
    infer FReturnType,
    infer FComponentPath
  >
    ? FunctionReference<
        FType,
        "internal",
        OpaqueIds<FArgs>,
        OpaqueIds<FReturnType>,
        FComponentPath
      >
    : UseApi<API[mod]>;
}>;
