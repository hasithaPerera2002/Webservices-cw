import { Pool } from "pg";
import logger from "../logger";
import { CustomError } from "../services/exception.service";
import { HttpStatusCode } from "axios";

// Create a new pool
const pool = new Pool({
  user: process.env.POSTGRESS_USER,
  host: process.env.POSTGRESS_HOST,
  password: process.env.POSTGRESS_PASSWORD,
  database: process.env.POSTGRESS_DATABASE,
  port: parseInt(process.env.POSTGRESS_PORT!),
});

async function insertSavedQuery(
  customerId: string,
  promptId: string,
  queryText: string,
  prompt: string
) {
  const queryTextSQL = `
        INSERT INTO saved_queries(customer_id, prompt_id, query_text, prompt)
        VALUES($1, $2, $3, $4)
        RETURNING *`;
  const values = [customerId, promptId, queryText, prompt];

  try {
    const client = await pool.connect(); // Get a client from the pool
    try {
      const res = await client.query(queryTextSQL, values);

      logger.info(`Saved query inserted: ${res.rows[0].id}`);
      return res.rows[0];
    } finally {
      client.release(); // Release the client back to the pool
    }
  } catch (err: any) {
    logger.error(`Error inserting saved query: ${err}`);
    throw new CustomError(
      HttpStatusCode.InternalServerError,
      `Error inserting saved query: ${err}`
    );
  }
}
async function getSavedQueryById(id: string) {
  logger.info(`Getting saved query by id: ${id}`);
  const queryTextSQL = `
        SELECT query_text FROM saved_queries
        WHERE prompt_id = $1`;
  const values = [id];

  try {
    const client = await pool.connect(); // Get a client from the pool
    try {
      const res = await client.query(queryTextSQL, values);
      if (res.rows.length > 0) {
        logger.info(`Saved query retrieved: ${res.rows[0].query_text}`);
        return res.rows[0].query_text;
      } else {
        logger.warn(`No saved query found for id: ${id}`);
        return null;
      }
    } catch (queryErr: any) {
      logger.error(`Error executing query: ${queryErr.message}`);
      throw new CustomError(
        HttpStatusCode.InternalServerError,
        `Error executing query ${queryErr.message}`
      );
    } finally {
      client.release(); // Ensure the client is released back to the pool
    }
  } catch (connectionErr: any) {
    logger.error(`Error getting client from pool: ${connectionErr.message}`);
    throw new CustomError(
      HttpStatusCode.InternalServerError,
      `Error executing query ${connectionErr.message}`
    );
  }
}

async function getSavedQueries() {
  const queryTextSQL = `
        SELECT prompt_id, prompt FROM saved_queries`;

  try {
    const client = await pool.connect(); // Get a client from the pool
    try {
      const res = await client.query(queryTextSQL);

      return res.rows;
    } finally {
      client.release(); // Release the client back to the pool
    }
  } catch (err: any) {
    logger.error(`Error getting saved queries: ${err}`);
    throw new CustomError(
      HttpStatusCode.InternalServerError,
      `Error getting saved queries: ${err}`
    );
  }
}

export async function createTable() {
  logger.info(`Creating table`);
  const queryTextSQL = `
        CREATE TABLE IF NOT EXISTS saved_queries(
            id SERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            prompt_id VARCHAR(255) NOT NULL,
            query_text TEXT NOT NULL,
            prompt TEXT NOT NULL
        )`;
  try {
    const client = await pool.connect(); // Get a client from the pool
    try {
      await client.query(queryTextSQL);
      logger.info(`Table created`);
    } finally {
      client.release(); // Release the client back to the pool
    }
  } catch (err: any) {
    logger.error(`Error creating table: ${err}`);
    throw new CustomError(
      HttpStatusCode.InternalServerError,
      `Error creating table: ${err}`
    );
  }
}

export { insertSavedQuery, getSavedQueryById, getSavedQueries };
