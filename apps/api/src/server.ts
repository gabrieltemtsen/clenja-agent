import "dotenv/config";
import express from "express";
import cors from "cors";
import { walletRouter } from "./routes/wallet.js";
import { offrampRouter } from "./routes/offramp.js";
import { chatRouter } from "./routes/chat.js";
import { beneficiariesRouter } from "./routes/beneficiaries.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { readinessRouter } from "./routes/readiness.js";
import { auditRouter } from "./routes/audit.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "@clenja/api" }));
app.use("/v1", readinessRouter);
app.use("/v1", auditRouter);
app.use("/v1/wallet", walletRouter);
app.use("/v1/offramp", offrampRouter);
app.use("/v1/chat", chatRouter);
app.use("/v1/beneficiaries", beneficiariesRouter);
app.use("/v1/dashboard", dashboardRouter);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`[clenja-api] listening on :${port}`);
});
