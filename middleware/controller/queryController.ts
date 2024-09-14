import { NextFunction, Request, Response } from "express";
import { QueryService } from "../services/query.service";
import { STATUS_MESSAGE } from "../util/enum";
import { log, loggers } from "winston";
import logger from "../logger";
import { createTable } from "../util/databasePg";
import { Session } from "inspector";

const queryService = new QueryService();

export const buildSQLQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryData(
      req.body,
      req.query.tableName as string
    );

    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getUniqueCounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryUniqueCounts();

    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getSessionBrokeByMonth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.querySessionBrokenDownByMonth();

    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
        type: "sessionBrokenDownByMonth",
        data: data,
      },
      chart: {

      },
    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};
export const getSessionBrokeByDay = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.querySessionBrokenDownByDay();
    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
        type: "sessionBrokenDownByDay",
        data: data,
      },
      chart: {

      },


    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getAdStatsByTime = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryGetAdStatsByTime(
      req.query.startDate as string,
      req.query.endDate as string
    );
    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
        type: "adStats",
        data: data,
      },
      chart: {

      },

    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getImpressionStatsByTime = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryGetImpressionStatsByTime(
      req.query.tableName as string,
      req.query.startDate as string,
      req.query.endDate as string
    );
    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
        type: "impression",
        data: data,
      },
      charts: {}
    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getTotalRAO = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryGetTotalRAO(
      req.query.startDate as string,
      req.query.endDate as string
    );
    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
        type: "RAO",
        data: data,
      },
      chart: {

      },
    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getCPC = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryGetCPC(
      req.query.startDate as string,
      req.query.endDate as string
    );
    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
        type: "CPC",
        data: data,
      },
      chart
        : {

      },

    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getDonutChart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryDonutChart();
    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
      },
      chart: {
        chartType: "donut",
        data: data,
      },

    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const getPieChart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await queryService.queryGetPieChart(
      req.query.startDate as string,
      req.query.endDate as string
    );
    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data: {
      },
      chart: {
        chartType: "pie",
        data: data,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const generatePrompt = async (req: Request, res: Response) => {
  try {
    await createTable();
    const data = await queryService.generatePrompt(req);

    return res.status(200).json({
      status: STATUS_MESSAGE.SUCCESS,
      data,
    });
  } catch (err) {
    logger.error("Error generating prompt", err);
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};

export const saveQuery = async (req: Request, res: Response) => {
  try {
    if (req.body.query && req.body.query_name) {
      logger.info("Saving query", req.body.query);
      await createTable();
      const data = await queryService.saveQuery(
        req.body.query,
        req.body.query_name
      );
      return res.status(200).json({
        status: STATUS_MESSAGE.SUCCESS,
        data,
      });
    } else {
      return res.status(400).json({
        status: STATUS_MESSAGE.FAIL,
        message: "No query provided",
      });
    }
  } catch (err) {
    logger.error("Error saving query", err);
    return res.status(500).json({
      status: STATUS_MESSAGE.FAIL,
      message: err,
    });
  }
};
