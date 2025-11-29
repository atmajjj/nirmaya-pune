import { Router } from "express";
import Route from "../../interfaces/route.interface";
import validationMiddleware from "../../middlewares/validation.middleware";
import AgentController from "./agent.controller";
import { CreateAgentDto, UpdateAgentDto, AgentParamsDto } from "./agent.dto";
import { TrainAgentDto } from "../train/agent-training.dto";

class AgentRoute implements Route {
  public path = "/agents";
  public router = Router();
  public agentController = new AgentController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Create a new agent
    this.router.post(
      `${this.path}`,
      validationMiddleware(CreateAgentDto, "body", false, []),
      this.agentController.createAgent
    );

    // Get all agents for the authenticated user
    this.router.get(`${this.path}`, this.agentController.getAgents);

    // Get agent by ID
    this.router.get(
      `${this.path}/:id`,
      validationMiddleware(AgentParamsDto, "params", false, []),
      this.agentController.getAgent
    );

    // Update agent
    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(AgentParamsDto, "params", false, []),
      validationMiddleware(UpdateAgentDto, "body", true, []), // skipMissingProperties: true for partial updates
      this.agentController.updateAgent
    );

    // Delete agent
    this.router.delete(
      `${this.path}/:id`,
      validationMiddleware(AgentParamsDto, "params", false, []),
      this.agentController.deleteAgent
    );

    // Training operations
    this.router.post(
      `${this.path}/:agentId/train`,
      validationMiddleware(TrainAgentDto, "body", false, []),
      this.agentController.trainAgent
    );

    this.router.post(
      `${this.path}/:agentId/retrain`,
      validationMiddleware(TrainAgentDto, "body", false, []),
      this.agentController.retrainAgent
    );

    this.router.get(
      `${this.path}/:agentId/training-status`,
      this.agentController.getTrainingStatus
    );

    this.router.get(
      `${this.path}/:agentId/training-analytics`,
      this.agentController.getTrainingAnalytics
    );
  }
}

export default AgentRoute;
