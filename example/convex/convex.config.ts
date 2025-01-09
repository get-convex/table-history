import { defineApp } from "convex/server";
import tableHistory from "@convex-dev/table-history/convex.config";

const app = defineApp();
app.use(tableHistory, { name: "userAuditLog" });

export default app;
