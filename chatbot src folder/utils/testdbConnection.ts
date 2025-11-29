import DB from "../../database/index.schema";
import { logger } from "./logger";

export async function testDbConnection() {
  try {
    const result = await DB.raw("SELECT 1+1 AS result");
    logger.info(`✅ Database connected. Result: ${result.rows[0].result}`);
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error; // Let caller decide what to do
  }
}
