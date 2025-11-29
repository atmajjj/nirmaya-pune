import knex from "../../../../database/index.schema";
import { Source, SourceInput, SourceUpdateInput } from "../source.interface";
import HttpException from "../../../exceptions/HttpException";
import { validateAgentExists, getUserForAgent } from "../../agent/services/agentUtils";
import { extractInsertedId } from "../../../utils/fileupload";
import { logger } from "../../../utils/logger";
import agentCacheService from "../../agent/services/agent-cache.service";

class BaseSourceService {
  // Generic source methods
  public async getAllSourcesByAgentId(agentId: number): Promise<Source[]> {
    try {
      const sources = await knex("sources")
        .where("agent_id", agentId)
        .where("is_deleted", false)
        .select("*");

      return sources;
    } catch (error) {
      throw new HttpException(500, `Error fetching sources: ${error.message}`);
    }
  }

  public async getSourceById(sourceId: number): Promise<Source> {
    try {
      const source = await knex("sources")
        .where("id", sourceId)
        .where("is_deleted", false)
        .first();

      if (!source) {
        throw new HttpException(404, "Source not found");
      }

      return source;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching source: ${error.message}`);
    }
  }

  public async deleteSource(sourceId: number, userId: number): Promise<void> {
    try {
      const source = await knex("sources")
        .where("id", sourceId)
        .where("is_deleted", false)
        .first();

      if (!source) {
        throw new HttpException(404, "Source not found");
      }

      // Get agent ID before deletion
      const agentId = source.agent_id;

      // Delete all vectors for this agent to allow retraining
      if (agentId) {
        try {
          const VectorService = require("../../vector/services/vector.service").default;
          const vectorService = new VectorService();
          await vectorService.deleteAgentVectors(userId, agentId);
          
          // Reset all remaining sources for this agent to allow retraining
          await knex("sources")
            .where({ agent_id: agentId, is_deleted: false })
            .update({ is_embedded: false });
          
          // Reset agent's embedded sources count to allow retraining
          await knex("agents")
            .where({ id: agentId })
            .update({ embedded_sources_count: 0 });
          
          // Invalidate agent cache to reflect the changes
          const userInfo = await getUserForAgent(agentId);
          await agentCacheService.invalidateAgent(agentId, userInfo.user_id);
          
          logger.info(`🧹 Deleted all vectors for agent ${agentId}, reset sources, cleared embedded count, and invalidated cache for retraining`);
        } catch (vectorError) {
          logger.warn(`⚠️ Could not delete vectors for agent ${agentId}:`, vectorError);
          // Continue with source deletion even if vector deletion fails
        }
      }

      // Use soft delete
      await knex("sources").where("id", sourceId).update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error deleting source: ${error.message}`);
    }
  }

  public async createSource(
    sourceData: SourceInput,
    userId: number
  ): Promise<Source> {
    try {
      await validateAgentExists(sourceData.agent_id);
      const userInfo = await getUserForAgent(sourceData.agent_id);

      const result = await knex("sources")
        .insert({
          agent_id: sourceData.agent_id,
          source_type: sourceData.source_type,
          name: sourceData.name,
          description: sourceData.description,
          status: "pending",
          is_embedded: false,
          created_by: userInfo.user_id,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("id");

      const sourceId = extractInsertedId(result);
      return await this.getSourceById(sourceId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error creating source: ${error.message}`);
    }
  }

  public async updateSource(
    sourceId: number,
    sourceData: SourceUpdateInput,
    userId: number
  ): Promise<Source> {
    try {
      const source = await knex("sources")
        .where("id", sourceId)
        .where("is_deleted", false)
        .first();

      if (!source) {
        throw new HttpException(404, "Source not found");
      }

      await knex("sources")
        .where("id", sourceId)
        .update({
          ...sourceData,
          updated_by: userId,
          updated_at: new Date(),
        });

      return await this.getSourceById(sourceId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error updating source: ${error.message}`);
    }
  }
}

export default BaseSourceService;
