import express from "express";
import cors from "cors";

import {
  generatePrompt,
  getAdStatsByTime,
  getCPC,
  getDonutChart,
  getImpressionStatsByTime,
  getPieChart,
  getSessionBrokeByDay,
  getSessionBrokeByMonth,
  getTotalRAO,
  getUniqueCounts,
  saveQuery,
} from "./controller/queryController";
import { getAllData, executeById } from "./controller/response.controller";
import { config } from "./config/cors.config";
import bodyParser from "body-parser";
import { globalErrorHandler } from "./services/exception.service";
import { completion } from "./services/openai.service";
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors(config));
app.use(bodyParser.json());
app.get("/", async (req, res, next) => {
  const { query } = req;

  switch (query.type) {
    case "unique-counts":
      return await getUniqueCounts(req, res, next);
    case "session-broken-down-by-month":
      return await getSessionBrokeByMonth(req, res, next);
    case "session-broken-down-by-day":
      return await getSessionBrokeByDay(req, res, next);
    case "ad-stats-by-time":
      return await getAdStatsByTime(req, res, next);
    case "impression-stats-by-time":
      return await getImpressionStatsByTime(req, res, next);
    case "total-RAO":
      return await getTotalRAO(req, res, next);
    case "cpc-rate":
      return await getCPC(req, res, next);
    case "donut-chart":
      return await getDonutChart(req, res, next);
    case "pie-chart":
      return await getPieChart(req, res, next);
    default:
      break;
  }

  res.send("Hello, World!");
});
app.get("/getPrompts", getAllData);
app.get("/execute/:id", executeById);
app.post("/save-query", saveQuery);
app.post("/completion", generatePrompt);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
app.use(globalErrorHandler);

export default app;
