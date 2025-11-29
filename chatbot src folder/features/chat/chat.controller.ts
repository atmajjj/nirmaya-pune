import { NextFunction, Request, Response } from "express";
import {
  LegacyChatDto,
  AgentChatDto,
  ChatSessionParamsDto,
  CreateSessionDto,
} from "./chat.dto";
import { RequestWithUser } from "../../interfaces/auth.interface";
import ChatService from "./services/chat.service";
import ChatSessionService from "./services/chat-session.service";
import HttpException from "../../exceptions/HttpException";
import ResponseUtil from "../../utils/response.util";

class ChatController {
  public chatService = new ChatService();
  public chatSessionService = new ChatSessionService();

  // Chat endpoints
  public handleChat = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const chatData: LegacyChatDto = req.body;
      const result = await this.chatService.handleChat(chatData);
      res.status(200).json(
        ResponseUtil.success("Chat processed successfully", result)
      );
    } catch (error) {
      next(error);
    }
  };

  public handleAgentChat = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const agentId = Number(req.params.agentId);
      if (isNaN(agentId)) {
        throw new HttpException(400, "Invalid agent ID");
      }

      const chatData: AgentChatDto = req.body;
      const result = await this.chatService.handleAgentChat(
        agentId,
        userId,
        chatData
      );

      res.status(200).json(
        ResponseUtil.success("Agent chat processed successfully", result)
      );
    } catch (error) {
      next(error);
    }
  };

  // Chat session endpoints (merged from ChatSessionController)
  public createChatSession = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const { agentId }: CreateSessionDto = req.body;
      if (!agentId || isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      const session = await this.chatService.createNewSession(agentId, userId);
      res.status(201).json(
        ResponseUtil.created("Chat session created successfully", session)
      );
    } catch (error) {
      next(error);
    }
  };

  public getChatSessions = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const agentId = req.query.agent_id
        ? Number(req.query.agent_id)
        : undefined;
      const sessions = await this.chatService.getUserChatSessions(
        userId,
        agentId
      );
      res.status(200).json(
        ResponseUtil.success("Chat sessions retrieved successfully", sessions)
      );
    } catch (error) {
      next(error);
    }
  };

  public getChatHistory = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const sessionId = Number(req.params.sessionId);
      if (isNaN(sessionId)) {
        throw new HttpException(400, "Invalid session ID");
      }
      const history = await this.chatService.getChatHistory(sessionId, userId);
      res.status(200).json(
        ResponseUtil.success("Chat history retrieved successfully", history)
      );
    } catch (error) {
      next(error);
    }
  };

  public deleteChatSession = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const sessionId = Number(req.params.sessionId);
      if (isNaN(sessionId)) {
        throw new HttpException(400, "Invalid session ID");
      }
      await this.chatSessionService.deleteChatSession(sessionId, userId);
      res.status(200).json(
        ResponseUtil.deleted("Chat session deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  };
}

export default ChatController;
