# Convex TableHistory Component

[![npm version](https://badge.fury.io/js/@convex-dev%2Ftable-history.svg)](https://badge.fury.io/js/@convex-dev%2Ftable-history)

<!-- START: Include on https://convex.dev/components -->

## History on a Convex table

Attach a history component to your most important Convex tables to keep track of changes.

- View an audit log of all table changes in the Convex Dashboard or in a custom React component.
  - Answer questions like "did user A join the team before user B?"
- View an audit log of changes to a single document
  - Answer questions like "what was the user's email address before they changed it?"
- Look at a snapshot of the table at any point in time.

```ts
// Paginate through all history on the "users" table
userAuditLog.listHistory(ctx, args.maxTs, args.paginationOpts);

// Paginate through all history for a specific user
userAuditLog.listDocumentHistory(ctx, args.userId, args.maxTs, args.paginationOpts);

// Paginate through all users in the "users" table at a specific timestamp
userAuditLog.listSnapshot(ctx, args.snapshotTs, args.currentTs, args.paginationOpts);
```

Found a bug? Feature request? [File it here](https://github.com/get-convex/table-history/issues).

## Pre-requisite: Convex

You'll need an existing Convex project to use the component.
Convex is a hosted backend platform, including a database, serverless functions,
and a ton more you can learn about [here](https://docs.convex.dev/get-started).

Run `npm create convex` or follow any of the [quickstarts](https://docs.convex.dev/home) to set one up.

## Installation

Install the component package:

```ts
npm install @convex-dev/table-history
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import tableHistory from "@convex-dev/table-history/convex.config";

const app = defineApp();
app.use(tableHistory, { name: "userAuditLog" });

export default app;
```

To add history to multiple tables, you can call `app.use` multiple times with
different names. They will be available in your app as
`new TableHistory(components.<name>, ...)`.

## Usage

```ts
import { components } from "./_generated/api";
import { TableHistory } from "@convex-dev/table-history";

const userAuditLog = new TableHistory<DataModel, "users">(components.userAuditLog, {
  serializability: "wallclock",
});
```

Add an item to the history table when a document changes:

```ts
async function patchUser(ctx: MutationCtx, userId: Id<"users">, patch: Partial<Doc<"users">>) {
  await ctx.db.patch(userId, patch);
  const userDoc = await ctx.db.get(userId);
  await userAuditLog.update(ctx, userDoc._id, userDoc);
}
```

Or attach a [trigger](https://docs.convex.dev/triggers) to automatically write to the history table when a mutation changes a document:

```ts
const triggers = new Triggers<DataModel>();
triggers.register("users", userAuditLog.trigger());
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
```

Now that you're writing to the history table, you can use the `listHistory`, `listDocumentHistory`, and `listSnapshot` functions to query the history.

These functions are paginated, so you can use them with `usePaginatedQuery` to get all of the entries incrementally.
The pages consist of `HistoryEntry` objects, which have the following fields:

- `id`: the id of the document that was changed
- `doc`: the new version of the document that was changed, or null if the document was deleted
- `ts`: the timestamp of the change
- `isDeleted`: whether the document was deleted

See more example usage in [example.ts](./example/convex/example.ts).

## Details of usage

### Serializability

Convex mutations are serializable transactions, which is great for maintaining
consistency in your tables.

However, if you need the guarantee that history timestamps match the mutations'
serializable order, that would require serializing all changes to your whole
database, and your database would slow to a crawl and get OCC errors.

You can configure the serializability of the history table by setting the
`serializability` option. The three options are:

- `"table"` -- i.e. the latest ts for the table, plus one
  - history entries are serializable with other updates on the same table
- `"document"` -- i.e. the latest ts for the document, plus one
  - history entries are serializable with other updates on the same document.
- `"wallclock"` -- i.e. Date.now()
  - history entry timestamps don't have guarantees, but they also take no extra dependencies and are usually sufficient.

### `currentTs` and `maxTs` are required

- For `listSnapshot`, `currentTs` should be a stable recent timestamp.
  - If the timestamp isn't recent, the queries might read too much data in
    a single page and throw an error.
- For `listHistory` and `listDocumentHistory`, `maxTs` should be stable but
  doesn't need to be recent.

```ts
const [currentTs] = useState(Date.now()); // stable and recent
const [yesterday] = useState(Date.now() - 24 * 60 * 60 * 1000);
const usersYesterday = usePaginatedQuery(
  api.users.listSnapshot,
  {
    currentTs,
    snapshotTs: yesterday,
  },
  { initialNumItems: 100 },
);
```

**Why is this necessary?** 

The TableHistory component supports paginated queries with
[`usePaginatedQuery`](https://docs.convex.dev/database/pagination#paginating-within-react-components)
and [manual pagination](https://docs.convex.dev/database/pagination#paginating-manually).
But it needs a little help from you to make everything work seamlessly.

You want
[fully reactive pagination](https://stack.convex.dev/fully-reactive-pagination).
Concretely, `usePaginatedQuery` results should not have gaps or duplicates.

In order to implement this feature without the built-in `.paginate` method,
the TableHistory component assumes its own data model is append-only (which is
true, except when vacuuming), and takes in a stable recent timestamp. Then it
only looks at history entries from before that timestamp.

### Vacuuming

The history table can grow large, so you can use the `vacuumHistory` function
to remove old history entries. This function will
schedule background jobs to delete old history entries.
The entries which will be deleted are those which are not visible
at snapshots `>=minTsToKeep`.

### Limitations

- No attribution: there is no way to add attribution to a history entry, e.g. which `ctx.auth`
  made the change.
  - Workaround: you can add attribution to the document itself.
- No indexes: you can't use an index to change the sort order or get a subset of results.
  - Workaround: you can paginate until `isDone` returns true, and sort or filter
    the results yourself, either on the client or in an action.

<!-- END: Include on https://convex.dev/components -->
