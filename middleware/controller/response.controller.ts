import { NextFunction, Request, Response } from "express";
import { ResponseService } from "../services/response.service";
import logger from "../logger";
import { HttpStatusCode } from "axios";

const responseService = new ResponseService();

const getAllData = async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Getting all data");
  try {
    const data = await responseService.getAll();
    return res.status(200).json({
      status: HttpStatusCode.Ok,
      data: data,
    });
  } catch (error) {
    logger.error("Error getting all data");
    next(error);
  }
};

const executeById = async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Executing by id");
  try {
    const { id } = req.params;
    const data = await responseService.executeById(id);
    return res.status(200).json({
      status: HttpStatusCode.Ok,
      data: data,
    });
  } catch (error) {
    logger.error("Error executing by id");
    next(error);
  }
};

export { getAllData, executeById };
