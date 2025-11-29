import { Worker, Job } from "bullmq";
import { redisClient } from "../../utils/redis";
import {
  TrainingJobData,
  TrainingJobResult,
  TRAINING_QUEUE_NAME,
  MAX_CONCURRENT_JOBS,
} from "./queue";
import { AgentTrainingService } from "./services/agent-training.service";
import { SourceExtractorService } from "../source/services/source-extractor.service";
import VectorService from "../vector/services/vector.service";
import { logger } from "../../utils/logger";
import unifiedCacheService from "../vector/services/unified-cache.service";
import agentCacheService from "../agent/services/agent-cache.service";
import DB from "../../../database/index.schema";

// Helper function to update agent training status
const updateAgentTrainingStatus = async (
  agentId: number,
  status: "idle" | "pending" | "in-progress" | "completed" | "failed",
  progress: number,
  errorMessage?: string | null,
  embeddedSourcesCount?: number
) => {
  try {
    const updateData: any = {
      training_status: status,
      training_progress: progress,
      updated_at: new Date(),
    };

    if (errorMessage !== undefined) {
      updateData.training_error = errorMessage;
    }

    if (embeddedSourcesCount !== undefined) {
      updateData.embedded_sources_count = embeddedSourcesCount;
    }

    await DB("agents").where("id", agentId).update(updateData);

    logger.info(`📊 Updated agent ${agentId} status: ${status} (${progress}%)`);
  } catch (error) {
    logger.error(`❌ Failed to update agent training status:`, error);
    throw error;
  }
};

// Create training job processor
export const createTrainingWorker = (): Worker<
  TrainingJobData,
  TrainingJobResult
> => {
  const trainingService = new AgentTrainingService();
  const sourceExtractorService = new SourceExtractorService();
  const vectorService = new VectorService();

  const worker = new Worker<TrainingJobData, TrainingJobResult>(
    TRAINING_QUEUE_NAME,
    async (job: Job<TrainingJobData>): Promise<TrainingJobResult> => {
      const { agentId, userId, totalSources } = job.data;

      logger.info(
        `🔄 Starting training job for agent ${agentId} (${totalSources} sources)`
      );

      try {
        // Update agent status to "in-progress"
        await trainingService.updateAgentTrainingStatus(
          agentId,
          "in-progress",
          0
        );
        await job.updateProgress(10);

        // Step 1: Extract content from all sources
        logger.info(`📊 Extracting content for agent ${agentId}`);
        const extractedSources =
          await sourceExtractorService.extractAllSourcesForAgent(agentId);

        if (extractedSources.length === 0) {
          logger.warn(`⚠️ No sources found for agent ${agentId}`);
          await trainingService.updateAgentTrainingStatus(
            agentId,
            "completed",
            100
          );
          return {
            success: true,
            processedSources: 0,
            failedSources: 0,
          };
        }

        await job.updateProgress(30);

        // Step 2: Transform data to vector format with semantic chunking
        logger.info(
          `🔄 Transforming ${extractedSources.length} sources to vector format with semantic chunking`
        );
        const vectorRecords =
          await sourceExtractorService.transformToVectorFormat(
            agentId,
            extractedSources
          );
        await job.updateProgress(50);

        // Step 3: Upsert vectors to Pinecone with agent-specific namespace
        logger.info(
          `📤 Upserting ${vectorRecords.length} vectors to agent namespace`
        );
        await vectorService.upsertRecords(vectorRecords, userId, agentId);
        await job.updateProgress(80);

        // Step 4: Mark sources as embedded after successful vector creation
        const sourceIds = extractedSources.map((source) => source.sourceId);
        await sourceExtractorService.markSourcesAsEmbedded(sourceIds);
        await job.updateProgress(90);

        // Step 5: Update agent training status and embedded sources count
        await trainingService.updateAgentTrainingStatus(
          agentId,
          "completed",
          100,
          null,
          extractedSources.length
        );
        await job.updateProgress(100);

        logger.info(
          `✅ Training completed for agent ${agentId}: ${extractedSources.length} sources processed`
        );

        return {
          success: true,
          processedSources: extractedSources.length,
          failedSources: 0,
        };
      } catch (error) {
        logger.error(`❌ Training failed for agent ${agentId}:`, error);

        // Update agent status to failed
        await trainingService.updateAgentTrainingStatus(
          agentId,
          "failed",
          0,
          error instanceof Error ? error.message : "Unknown error"
        );

        throw error;
      }
    },
    {
      connection: redisClient,
      concurrency: MAX_CONCURRENT_JOBS,
    }
  );

  // Worker event listeners
  worker.on("completed", async (job) => {
    logger.info(
      `✅ Worker completed job ${job.id} for agent ${job.data.agentId}`
    );

    // Invalidate caches after training completion
    const { agentId, userId } = job.data;
    try {
      // Invalidate vector cache for this agent (new vectors were added)
      await unifiedCacheService.invalidateAgentCache(userId, agentId);
      // Invalidate agent cache (embedded_sources_count may have changed)
      await agentCacheService.invalidateAgent(agentId, userId);
      logger.info(`🗑️  Caches invalidated for Agent ${agentId} after training`);
    } catch (error) {
      logger.error(`❌ Error invalidating caches:`, error);
    }
  });

  worker.on("failed", (job, error) => {
    logger.error(
      `❌ Worker failed job ${job?.id} for agent ${job?.data.agentId}:`,
      error
    );
  });

  worker.on("error", (error) => {
    logger.error("❌ Worker error:", error);
  });

  return worker;
};

// Start the training worker
export const startTrainingWorker = (): Worker<
  TrainingJobData,
  TrainingJobResult
> => {
  const worker = createTrainingWorker();
  logger.info("🚀 Training worker started");
  return worker;
};

// Stop the training worker
export const stopTrainingWorker = async (worker: Worker): Promise<void> => {
  try {
    await worker.close();
    logger.info("✅ Training worker stopped gracefully");
  } catch (error) {
    logger.error("❌ Error stopping training worker:", error);
  }
};
