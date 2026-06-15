import express from "express";
import { BudgetService } from "../service/budget-service";
import { authMiddleware, AuthRequest } from "../middleware/auth-middleware";
import { requireWrite } from "../middleware/workspace-context-middleware";

export const budgetRouter = express.Router();
const budgetService = new BudgetService();
budgetRouter.use(authMiddleware);

budgetRouter.get("/ping", (_req, res) => {
  res.send("Pong");
});

budgetRouter.get("/transactions", async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    res.json(await budgetService.getAll(userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

budgetRouter.post("/transactions", requireWrite('transactions'), async (req: AuthRequest, res) => {
  const { name, amount, type, date } = req.body;
  if (!name || !amount || !type || !date) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const id = await budgetService.create({ ...req.body, user_id: userId });
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

budgetRouter.put("/transactions/:id", requireWrite('transactions'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { name, amount, type, date } = req.body;
  if (!name || !amount || !type || !date) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const ok = await budgetService.update(id, userId, req.body);
    if (!ok) return res.status(403).json({ error: "Unauthorized" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

budgetRouter.delete("/transactions/:id", requireWrite('transactions'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const ok = await budgetService.delete(id, userId);
    if (!ok) return res.status(403).json({ error: "Unauthorized" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});