import { Router } from "express";
import Route from "../../interfaces/route.interface";
import validationMiddleware from "../../middlewares/validation.middleware";
import ChatController from "./chat.controller";
import { LegacyChatDto, AgentChatDto, CreateSessionDto } from "./chat.dto";

class ChatRoute implements Route {
  public path = "/chat";
  public router = Router();
  public chatController = new ChatController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Agent-based chat with session management (primary endpoint)
    this.router.post(
      `${this.path}/agents/:agentId`,
      validationMiddleware(AgentChatDto, "body", false, []),
      this.chatController.handleAgentChat
    );

    // Session management endpoints
    this.router.post(
      `${this.path}/sessions`,
      validationMiddleware(CreateSessionDto, "body", false, []),
      this.chatController.createChatSession
    );

    this.router.get(
      `${this.path}/sessions`,
      this.chatController.getChatSessions
    );

    this.router.get(
      `${this.path}/sessions/:sessionId/history`,
      this.chatController.getChatHistory
    );

    this.router.delete(
      `${this.path}/sessions/:sessionId`,
      this.chatController.deleteChatSession
    );

    // Legacy endpoint for backward compatibility
    this.router.post(
      `${this.path}`,
      validationMiddleware(LegacyChatDto, "body", false, []),
      this.chatController.handleChat
    );
  }
}

export default ChatRoute;
