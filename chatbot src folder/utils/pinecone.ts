import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "./logger";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// Use environment variable for index name, fallback to default
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "chatverse";

export const chatbotIndex = pc.index(INDEX_NAME);

// Test Pinecone connectivity on startup
export const initializePineconeConnection = async (): Promise<boolean> => {
  try {
    logger.info("🔄 Testing Pinecone connection...");

    // Test connection by trying to get index stats
    const stats = await chatbotIndex.describeIndexStats();
    logger.info("✅ Pinecone connection test passed");
    logger.info(
      `📊 Pinecone index stats - Total records: ${stats.totalRecordCount}, Dimension: ${stats.dimension}`
    );

    return true;
  } catch (error) {
    logger.error("❌ Pinecone connection test failed:", error);
    return false;
  }
};

// Test Pinecone connectivity (for manual testing)
export const testPineconeConnection = async (): Promise<boolean> => {
  try {
    const stats = await chatbotIndex.describeIndexStats();
    logger.info("✅ Pinecone connection successful");
    logger.info("📊 Index stats:", stats);
    return true;
  } catch (error) {
    logger.error("❌ Pinecone connection failed:", error);
    return false;
  }
};

export default pc;
