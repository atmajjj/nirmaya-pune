import { Queue, Worker, QueueEvents } from "bullmq";
import { redisClient } from "../../utils/redis";
import { logger } from "../../utils/logger";

// Queue configuration
export const TRAINING_QUEUE_NAME =
  process.env.TRAINING_QUEUE_NAME || "agent-training";
export const MAX_CONCURRENT_JOBS = parseInt(
  process.env.MAX_CONCURRENT_JOBS || "5"
);
export const JOB_TIMEOUT = parseInt(process.env.JOB_TIMEOUT || "300000"); // 5 minutes

// Training job data interface
export interface TrainingJobData {
  agentId: number;
  userId: number;
  totalSources: number;
}

// Training job result interface
export interface TrainingJobResult {
  success: boolean;
  processedSources: number;
  failedSources: number;
  error?: string;
}

// Create training queue
export const trainingQueue = new Queue<TrainingJobData, TrainingJobResult>(
  TRAINING_QUEUE_NAME,
  {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 10, // Keep last 10 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
    },
  }
);

// Queue events for monitoring
export const trainingQueueEvents = new QueueEvents(TRAINING_QUEUE_NAME, {
  connection: redisClient,
});

// Add job to training queue
export const addTrainingJob = async (
  agentId: number,
  userId: number,
  totalSources: number
): Promise<void> => {
  try {
    const jobData: TrainingJobData = {
      agentId,
      userId,
      totalSources,
    };

    await trainingQueue.add(`train-agent-${agentId}`, jobData, {
      jobId: `agent-${agentId}-${Date.now()}`,
      delay: 1000, // Small delay to ensure database updates are complete
    });

    logger.info(`✅ Training job added for agent ${agentId}`);
  } catch (error) {
    logger.error(`❌ Failed to add training job for agent ${agentId}:`, error);
    throw error;
  }
};

// Get job status
export const getJobStatus = async (jobId: string) => {
  try {
    const job = await trainingQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  } catch (error) {
    logger.error(`❌ Failed to get job status for ${jobId}:`, error);
    return null;
  }
};

// Clean up completed and failed jobs
export const cleanupJobs = async (): Promise<void> => {
  try {
    await trainingQueue.clean(24 * 60 * 60 * 1000, 100, "completed"); // Clean completed jobs older than 24 hours
    await trainingQueue.clean(7 * 24 * 60 * 60 * 1000, 50, "failed"); // Clean failed jobs older than 7 days
    logger.info("✅ Queue cleanup completed");
  } catch (error) {
    logger.error("❌ Queue cleanup failed:", error);
  }
};

// Graceful shutdown
export const closeQueue = async (): Promise<void> => {
  try {
    await trainingQueue.close();
    await trainingQueueEvents.close();
    logger.info("✅ Training queue closed gracefully");
  } catch (error) {
    logger.error("❌ Error closing training queue:", error);
  }
};

// Event listeners for monitoring
trainingQueueEvents.on("completed", ({ jobId, returnvalue }) => {
  logger.info(`✅ Training job ${jobId} completed:`, returnvalue);
});

trainingQueueEvents.on("failed", ({ jobId, failedReason }) => {
  logger.error(`❌ Training job ${jobId} failed:`, failedReason);
});

trainingQueueEvents.on("progress", ({ jobId, data }) => {
  logger.info(`📊 Training job ${jobId} progress:`, data);
});

export default trainingQueue;
