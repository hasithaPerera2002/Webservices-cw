import { Request, Response, NextFunction } from "express";
import { STATUS_MESSAGE } from "../util/enum";
import logger from "../logger";

export class CustomError extends Error {
  constructor(public code: number, message: string, public status?: string) {
    super(message);
    logger.error(message);
  }
}

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);
  err.statusCode = err.code || 500;
  err.status = err.status || STATUS_MESSAGE.ERROR;

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
