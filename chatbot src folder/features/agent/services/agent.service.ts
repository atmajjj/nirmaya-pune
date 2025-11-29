import knex from "../../../../database/index.schema";
import {
  IAgent,
  CreateAgentRequest,
  UpdateAgentRequest,
} from "../agent.interface";
import HttpException from "../../../exceptions/HttpException";
import {
  validateModelForProvider,
  checkAgentNameExists,
  encryptApiKeyIfNeeded,
} from "./agentUtils";
import agentCacheService from "./agent-cache.service";
import apiKeyCacheService from "./api-key-cache.service";
import SystemPromptTemplates from "../../chat/system-prompt-templates";

class AgentService {
  /**
   * Create a new agent
   */
  public async createAgent(
    agentData: CreateAgentRequest,
    userId: number
  ): Promise<IAgent> {
    try {
      if (!agentData.model || !agentData.provider) {
        throw new HttpException(400, "Both model and provider are required");
      }
      await validateModelForProvider(agentData.provider, agentData.model);
      await checkAgentNameExists(agentData.name, userId);

      const { encrypted_api_key, encryption_salt } = encryptApiKeyIfNeeded(
        agentData.api_key
      );
      const newAgent = {
        name: agentData.name,
        provider: agentData.provider,
        model: agentData.model,
        encrypted_api_key,
        encryption_salt,
        user_id: userId,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
        temperature: agentData.temperature || 0.7,
        system_prompt:
          agentData.system_prompt ||
          SystemPromptTemplates.generateSystemPrompt(
            "You are a helpful AI assistant. Provide accurate, informative responses while being concise and clear."
          ),
        is_active: agentData.is_active !== undefined ? agentData.is_active : 1,
      };
      const [createdAgent] = await knex("agents")
        .insert(newAgent)
        .returning("*");
      return createdAgent;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error creating agent: ${error.message}`);
    }
  }

  /**
   * Get all agents for a user
   */
  public async getAgentsByUser(userId: number): Promise<IAgent[]> {
    try {
      const agents = await knex("agents")
        .where({ user_id: userId, is_deleted: false })
        .orderBy("created_at", "desc");

      return agents;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching agents: ${error.message}`);
    }
  }

  /**
   * Get agent by ID (with caching)
   */
  public async getAgentById(agentId: number, userId: number): Promise<IAgent> {
    try {
      // Try to get from cache first
      const agent = await agentCacheService.getOrFetch(
        agentId,
        userId,
        async () => {
          const dbAgent = await knex("agents")
            .where({ id: agentId, user_id: userId, is_deleted: false })
            .first();

          if (!dbAgent) {
            throw new HttpException(404, "Agent not found");
          }

          return dbAgent;
        }
      );

      return agent;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching agent: ${error.message}`);
    }
  }

  /**
   * Update agent
   */
  public async updateAgent(
    agentId: number,
    agentData: UpdateAgentRequest,
    userId: number
  ): Promise<IAgent> {
    try {
      const existingAgent = await this.getAgentById(agentId, userId);
      const {
        name,
        provider,
        model,
        api_key,
        temperature,
        system_prompt,
        is_active,
      } = agentData;

      // Validate model if provider or model is being updated
      if (provider || model) {
        await validateModelForProvider(
          provider ?? existingAgent.provider,
          model ?? existingAgent.model
        );
      }

      // Check for name conflict if name is being updated
      if (name && name !== existingAgent.name) {
        await checkAgentNameExists(name, userId, agentId);
      }

      const updateData: Partial<IAgent> & {
        updated_by: number;
        updated_at: Date;
      } = {
        updated_by: userId,
        updated_at: new Date(),
        ...encryptApiKeyIfNeeded(api_key),
        ...(name && { name }),
        ...(provider && { provider }),
        ...(model && { model }),
        ...(temperature !== undefined && { temperature }),
        ...(system_prompt !== undefined && { system_prompt }),
        ...(is_active !== undefined && { is_active }),
      };

      const [updatedAgent] = await knex("agents")
        .where({ id: agentId, user_id: userId })
        .update(updateData)
        .returning("*");

      if (!updatedAgent) {
        throw new HttpException(404, "Agent not found");
      }

      // Invalidate cache after update
      await agentCacheService.invalidateAgent(agentId, userId);
      await apiKeyCacheService.invalidateApiKey(agentId, userId);

      return updatedAgent;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error updating agent: ${error.message}`);
    }
  }

  /**
   * Delete agent (soft delete)
   */
  public async deleteAgent(agentId: number, userId: number): Promise<void> {
    try {
      // Check if agent exists and belongs to user
      await this.getAgentById(agentId, userId);

      const [deletedAgent] = await knex("agents")
        .where({ id: agentId, user_id: userId })
        .update({
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        })
        .returning("*");

      if (!deletedAgent) {
        throw new HttpException(404, "Agent not found");
      }

      // Invalidate cache after deletion
      await agentCacheService.invalidateAgent(agentId, userId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error deleting agent: ${error.message}`);
    }
  }
}

export default AgentService;
