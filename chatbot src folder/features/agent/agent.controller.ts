import { NextFunction, Response } from "express";
import { CreateAgentDto, UpdateAgentDto } from "./agent.dto";
import { TrainAgentDto } from "../train/agent-training.dto";
import { RequestWithUser } from "../../interfaces/auth.interface";
import AgentService from "./services/agent.service";
import { AgentTrainingService } from "../train/services/agent-training.service";
import HttpException from "../../exceptions/HttpException";
import ResponseUtil from "../../utils/response.util";

import { sanitizeAgentResponse } from "./services/agentUtils";

class AgentController {
  public agentService = new AgentService();
  public trainingService = new AgentTrainingService();

  /**
   * Create a new agent
   */
  public createAgent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const agentData: CreateAgentDto = req.body;
      const userId = req.userId || req.user?.id; // Assuming user ID comes from auth middleware

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const agent = await this.agentService.createAgent(agentData, userId);
      const agentResponse = sanitizeAgentResponse(agent);
      res.status(201).json(
        ResponseUtil.created("Agent created successfully", agentResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all agents for the authenticated user
   */
  public getAgents = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const agents = await this.agentService.getAgentsByUser(userId);
      // Hide sensitive data in response
      const agentsResponse = agents.map((agent) =>
        sanitizeAgentResponse(agent)
      );
      res.status(200).json(
        ResponseUtil.success("Agents retrieved successfully", agentsResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get agent by ID
   */
  public getAgent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const agentId = parseInt(req.params.id);
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (isNaN(agentId)) {
        throw new HttpException(400, "Invalid agent ID");
      }

      const agent = await this.agentService.getAgentById(agentId, userId);
      const agentResponse = sanitizeAgentResponse(agent);
      res.status(200).json(
        ResponseUtil.success("Agent retrieved successfully", agentResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update agent
   */
  public updateAgent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const agentId = parseInt(req.params.id);
      const agentData: UpdateAgentDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (isNaN(agentId)) {
        throw new HttpException(400, "Invalid agent ID");
      }

      const agent = await this.agentService.updateAgent(
        agentId,
        agentData,
        userId
      );
      const agentResponse = sanitizeAgentResponse(agent);
      res.status(200).json(
        ResponseUtil.updated("Agent updated successfully", agentResponse)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete agent
   */
  public deleteAgent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const agentId = parseInt(req.params.id);
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (isNaN(agentId)) {
        throw new HttpException(400, "Invalid agent ID");
      }

      await this.agentService.deleteAgent(agentId, userId);

      res.status(200).json(
        ResponseUtil.deleted("Agent deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Start training an agent
   */
  public trainAgent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const { forceRetrain, cleanupExisting } = req.body as TrainAgentDto;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (!agentId || isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      // Start training using the queue system
      const result = await this.trainingService.trainAgent(agentId, userId);

      res.status(200).json(
        ResponseUtil.success(result.message, {
          agentId,
          jobId: result.jobId,
          totalSources: result.totalSources,
          status: "pending",
          namespace: `user_${userId}_agent_${agentId}`,
          estimatedDuration: "5-10 minutes",
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get training status for an agent
   */
  public getTrainingStatus = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      const status = await this.trainingService.getTrainingStatus(
        agentId,
        userId
      );

      res.status(200).json(
        ResponseUtil.success("Training status retrieved successfully", status)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get enhanced training analytics for an agent
   */
  public getTrainingAnalytics = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      // Get the enhanced status which includes all the new Phase 5 features
      const analytics = await this.trainingService.getTrainingStatus(
        agentId,
        userId
      );

      res.status(200).json(
        ResponseUtil.success("Training analytics retrieved successfully", analytics)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrain agent (Phase 6 enhancement)
   */
  public retrainAgent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (!agentId || isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      const result = await this.trainingService.retrainAgent(agentId, userId);

      res.status(200).json(
        ResponseUtil.success(result.message, {
          agentId,
          jobId: result.jobId,
          totalSources: result.totalSources,
        })
      );
    } catch (error) {
      next(error);
    }
  };
}

export default AgentController;
