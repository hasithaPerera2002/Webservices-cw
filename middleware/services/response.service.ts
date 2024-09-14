import dotenv from "dotenv";
import { getSavedQueries, getSavedQueryById } from "../util/databasePg";
import { CustomError } from "./exception.service";
import axios, { HttpStatusCode } from "axios";
import logger from "../logger";

dotenv.config();
export class ResponseService {
  async getAll() {
    try {
      const data = await getSavedQueries();
      return data;
    } catch (err) {
      throw new CustomError(
        HttpStatusCode.InternalServerError,
        `Error getting all data ${err}`
      );
    }
  }
  async executeById(id: string) {
    try {
      const resp = await getSavedQueryById(id);
      let data = JSON.stringify({
        query: resp,
      });

      logger.info(`data ${data}`);

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: process.env.DATA_MANAGER_EXECUTE_ENDPOINT!,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      const response = await axios
        .request(config)
        .then((response) => {
          logger.info(JSON.stringify(response.data));
          return response.data;
        })
        .catch((error) => {
          throw new CustomError(
            HttpStatusCode.InternalServerError,
            `Axios error ${error}`
          );
        });
      return response;
    } catch (err) {
      throw new CustomError(
        HttpStatusCode.InternalServerError,
        `Error executing by id ${err} `
      );
    }
  }
}
