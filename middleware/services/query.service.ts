import axios, { HttpStatusCode } from "axios";
import { QueryOperation, QueryVariable } from "../util/types";
import { CustomError } from "./exception.service";
import { NextFunction, Request, Response } from "express";
import { completion } from "./openai.service";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";
import { createTable, insertSavedQuery } from "../util/databasePg";
import logger from "../logger";

dotenv.config();
export class QueryService {
  private buildQuery(query: QueryOperation): string {
    if ("and" in query) {
      const conditions = query
        .and!.map((op) => this.buildQuery(op))
        .join(" AND ");
      return `(${conditions})`;
    } else if ("or" in query) {
      const conditions = query
        .or!.map((op) => this.buildQuery(op))
        .join(" OR ");
      return `(${conditions})`;
    } else {
      const operator = Object.keys(query)[0] as keyof QueryOperation;

      if (
        operator === "!=" ||
        operator === "<" ||
        operator === "<=" ||
        operator === ">" ||
        operator === ">=" ||
        operator === "=="
      ) {
        const operands = query[operator] as
          | [QueryVariable, string | number]
          | [number, QueryVariable, number];

        if (operands.length === 2) {
          const [variable, value] = operands;
          const varName = variable.var;
          const comparisonValue =
            typeof value === "string" ? `'${value}'` : value.toString();
          return `${varName} ${operator} ${comparisonValue}`;
        } else if (operands.length === 3) {
          const [value1, variable, value2] = operands;
          const varName = variable.var;
          const comparisonValue1 =
            typeof value1 === "string" ? value1 : value1.toString();
          const comparisonValue2 =
            typeof value2 === "string" ? value2 : value2.toString();
          return `${varName} ${operator} ${comparisonValue1} AND ${varName} ${operator} ${comparisonValue2}`;
        } else {
          throw new Error(
            `Invalid number of operands for operator ${operator}`
          );
        }
      } else {
        throw new Error(`Unsupported operator ${operator}`);
      }
    }
  }

  async queryData(body: QueryOperation, tableName: string) {
    try {
      const whereClause = this.buildQuery(body);
      const query = `SELECT * FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=${tableName}/**/*.parquet', union_by_name=True)  WHERE ${whereClause}`;

      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }

  async queryUniqueCounts() {
    try {
      const query = `SELECT COUNT(DISTINCT _data->>'sid') AS unique_sessions 
      FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=visits_datamgr_format/**/*.parquet', union_by_name=True)`;
      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });

      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }

  async querySessionBrokenDownByMonth() {
    try {
      const query =
        "SELECT _data->>'sessionSource' AS session_source, _data->>'yearMonth' AS year_month, COUNT(DISTINCT _data->>'sid') AS unique_sessions FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=visits_datamgr_format/**/*.parquet', union_by_name=True)  GROUP BY session_source, year_month  ORDER BY session_source, year_month";
      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }

  async querySessionBrokenDownByDay() {
    try {
      const query =
        "SELECT _data->>'sessionSource' AS session_source, _data->>'date' AS date, COUNT(DISTINCT _data->>'sid') AS unique_sessions FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=visits_datamgr_format/**/*.parquet', union_by_name=True) GROUP BY session_source, date ORDER BY session_source, date";

      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }
  async queryGetAdStatsByTime(startDate: string, endDate: string) {
    try {
      const query = `SELECT source->>'dataSource' AS ad_source,SUM(CAST(metrics->>'cost' AS DOUBLE)) AS total_spend FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=adreport_datamgr_format/**/*.parquet', union_by_name=True) WHERE (source->>'dataSource' IN ('google', 'meta', 'linkedin'))  AND (date_time->>'date')::date BETWEEN '${startDate}' AND '${endDate}' GROUP BY ad_source ORDER BY ad_source `;
      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }

  async queryGetImpressionStatsByTime(
    table_name: string,
    startDate: string,
    endDate: string
  ) {
    try {
      const query = `
  SELECT SUM(CAST(metrics->>'impressions' AS bigint)) AS total
  FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=adreport_datamgr_format/**/*.parquet', union_by_name=True)
   WHERE (date_time->>'date')::date BETWEEN '${startDate}' AND '${endDate}'`;

      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }

  async queryGetTotalRAO(startDate: string, endDate: string) {
    try {
      const query = `WITH revenue_sum AS (SELECT SUM(CAST(_data->>'total' AS DOUBLE)) AS total_revenue 
      FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=transactions_datamgr_format/**/*.parquet',
       union_by_name=True)), 
      adspend_sum AS
       (SELECT SUM(CAST(metrics->>'cost' AS DOUBLE)) AS total_adspend FROM
        READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=adreport_datamgr_format/**/*.parquet', union_by_name=True) 
       WHERE (date_time->>'date')::date BETWEEN '${startDate}' AND '${endDate}') SELECT revenue_sum.total_revenue / adspend_sum.total_adspend AS total_roas FROM revenue_sum, adspend_sum `;
      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }
  async queryGetCPC(startDate: string, endDate: string) {
    try {
      const query = `WITH clicks_sum AS (SELECT SUM(CAST(metrics->>'clicks' AS INTEGER)) AS total_clicks FROM 
      READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=adreport_datamgr_format/**/*.parquet', union_by_name=True)
       WHERE (date_time->>'date')::date BETWEEN '${startDate}' AND '${endDate}'), impressions_sum AS (SELECT SUM(CAST(metrics->>'impressions' AS INTEGER)) AS total_impressions 
       FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=adreport_datamgr_format/**/*.parquet', union_by_name=True)
        WHERE (date_time->>'date')::date BETWEEN '${startDate}' AND '${endDate}') SELECT clicks_sum.total_clicks / impressions_sum.total_impressions AS cpc_rate FROM clicks_sum, impressions_sum`;
      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }

  async queryDonutChart() {
    try {
      const query = `WITH total_revenue_cte AS (SELECT SUM(CAST(_data ->> 'total' AS decimal)) AS total_revenue 
      FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=transactions_datamgr_format/**/*.parquet',
       union_by_name = True)), revenue_by_source AS(SELECT TRIM(BOTH '\"' FROM JSON_EXTRACT(_data, '$.campaign.source')) AS source, SUM(CAST(_data ->> 'total' AS decimal))
        AS revenue FROM READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=transactions_datamgr_format/**/*.parquet', 
        union_by_name = True) WHERE JSON_EXTRACT(_data, '$.campaign.source') IS NOT NULL GROUP BY source) SELECT r.source, r.revenue, t.total_revenue
        FROM revenue_by_source r CROSS JOIN total_revenue_cte t`;

      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(500, err.message);
    }
  }

  async queryGetPieChart(startDate: string, endDate: string) {
    try {
      const query = ` SELECT
     (source ->> 'dataSource') AS source,
        SUM(CAST(metrics ->> 'cost' AS DECIMAL)) AS total_ad_spend
      FROM
      READ_PARQUET('${process.env.BUCKET_NAME}/main/cust_id=cust_68c2410d-8d6c-49a9-aa3f-a467f7c6da7e/table_name=adreport_datamgr_format/**/*.parquet', union_by_name = True)
      WHERE
        (date_time ->> 'date')::date BETWEEN '${startDate}' AND '${endDate}' 
GROUP BY
      source`;

      const resp = await axios.post(process.env.DATA_MANAGER_QUERY_ENDPOINT!, {
        query,
      });
      return resp.data;
    } catch (err: any) {
      console.error(err);
      throw new CustomError(HttpStatusCode.InternalServerError, err.message);
    }
  }
  async generatePrompt(req: Request) {
    await createTable();
    logger.info("Query Service: generatePrompt");
    let filters = `You are an intelligent assistant designed to help users generate DuckDB queries for analyzing data stored in Parquet files on AWS S3. Users will provide
     specific details about the type of analysis they want to perform,the columns needed, the dataset, the S3 path, the date range, any calculations, groupings, and orderings.Use this information to construct the appropriate DuckDB query.
    - Use added_date_full for date calculations and aggregation. not ts.
    - dont cast startdate and end date dont cast startdate end date use add_date_full for date filtering
    - to go to inside the nested JSON fields, use JSON_EXTRACT(_data,$'.{key1}.{key2}') format.
    - Use JSON_EXTRACT to parse JSON fields and CAST(JSON_EXTRACT(_data,$'.{key1}.{key2}')  as DOUBLE) format to convert values to decimals.
    - Provide only the SQL text without any explanations .
 '`;
    try {
      const { query, tableName1, tableName2 } = req.body;
      if (!query) return "Please provide a query";

      if (!tableName1) {
        return "Please provide a table name";
      } else {
        logger.info(`Table Name: ${tableName1}`);
        const res = await axios.post(
          process.env.DATA_MANAGER_TABLE_ENDPOINT!,
          null,
          {
            params: {
              table_name: tableName1,
            },
          }
        );
        logger.info(`Response from Data Manager:${res.data}`);
        filters += `S3 path:'s3://${process.env.BUCKET_NAME}/main/cust_id=${process.env.CUSTOMER_ID}/table_name=${tableName1}/**/*.parquet' `;
        filters += `use this data set ${tableName1} :${res.data}`;
      }
      if (tableName2) {
        logger.info("Table Name 2:", tableName2);
        const res = await axios.post(
          process.env.DATA_MANAGER_TABLE_ENDPOINT!,
          null,
          {
            params: { table_name: tableName2 },
          }
        );
        logger.info(`Response from Data Manager 2 ;  ${res.data}`);
        filters += `S3 path:'s3://${process.env.BUCKET_NAME}/main/cust_id=${process.env.CUSTOMER_ID}/table_name=${tableName2}/**/*.parquet' `;
        filters += `use this data set for table ${tableName2}:${res.data}`;
      }

      filters += query;
      logger.info(`filters ------ ${filters}`);
      const response = await completion(filters);
      logger.info(`Response from OpenAI: ${response}`);

      if (!response) {
        return "No response from OpenAI";
      }
      let extractQueryResponse = await this.extractQuery(response);
      if (extractQueryResponse) {
        await insertSavedQuery(randomUUID(), randomUUID(), extractQueryResponse, filters);
        return extractQueryResponse;
      }
      await insertSavedQuery(randomUUID(), randomUUID(), response, filters);

      logger.info(`Extracted Query: ${response}`);
      return response;
    } catch (error: any) {
      console.error("Error occurred:", error);
      throw new CustomError(HttpStatusCode.InternalServerError, error.message);
    }
  }
  async extractQuery(data: string) {
    try {
      const regex = /```sql\n([\s\S]*?)\n```/;
      const match = data.match(regex);
      if (match) {
        logger.info(`Match: ${match[1]}`);
        return match[1];
      } else {
        return null;
      }
    } catch (error: any) {
      console.error("Error occurred:", error);
      throw new CustomError(HttpStatusCode.InternalServerError, error.message);
    }
  }

  async saveQuery(query: string, query_name: string) {
    try {
      logger.info(`Saving query ${query}`);
      await insertSavedQuery(randomUUID(), randomUUID(), query, query_name);
    } catch (error: any) {
      logger.error(`Error occurred ${error}`);
      throw new CustomError(HttpStatusCode.InternalServerError, error.message);
    }
  }
}
