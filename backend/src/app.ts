import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db";
import { budgetRouter } from "./router/budget-router";
import { savingsRouter } from "./router/savings-router";
import { noteRouter } from "./router/note-router";
import { authRouter } from "./router/auth-router";
import { workspaceRouter } from "./router/workspace-router";
import { authMiddleware } from "./middleware/auth-middleware";
import { workspaceContextMiddleware } from "./middleware/workspace-context-middleware";
import { bankRouter, bankCallbackRouter } from "./router/bank.router";

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes — no middleware needed
app.use("/api/auth",          authRouter);
app.use("/api/bank/callback", bankCallbackRouter);        // ← no auth, Tink redirects here
app.use("/api/bank",          authMiddleware, bankRouter); // ← needs auth
app.use("/api/budget",        authMiddleware, workspaceContextMiddleware, budgetRouter);
app.use("/api/savings",       authMiddleware, workspaceContextMiddleware, savingsRouter);
app.use("/api/notes",         authMiddleware, workspaceContextMiddleware, noteRouter);
app.use("/api/workspaces",    authMiddleware, workspaceRouter);

initDb();

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.get("/", (_req, res) => {
  res.send("BudgetPlanner API läuft");
});