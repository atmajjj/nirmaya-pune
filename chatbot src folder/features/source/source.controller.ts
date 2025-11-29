import { NextFunction, Request, Response } from "express";
import BaseSourceService from "./services/source.service";
import { RequestWithUser } from "../../interfaces/auth.interface";
import HttpException from "../../exceptions/HttpException";
import { CreateSourceDto, UpdateSourceDto } from "./source.dto";
import ResponseUtil from "../../utils/response.util";

class BaseSourceController {
  public baseSourceService = new BaseSourceService();

  private validateNumericId(id: string, paramName: string): number {
    const numericId = Number(id);
    if (isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      throw new HttpException(
        400,
        `Invalid ${paramName}: must be a positive integer`
      );
    }
    return numericId;
  }

  // Generic source methods
  public getAllSourcesByAgentId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = this.validateNumericId(req.params.agentId, "agent ID");
      const sources = await this.baseSourceService.getAllSourcesByAgentId(
        agentId
      );

      res.status(200).json(
        ResponseUtil.success("Sources retrieved successfully", sources)
      );
    } catch (error) {
      next(error);
    }
  };

  public getSourceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = this.validateNumericId(req.params.id, "source ID");
      const source = await this.baseSourceService.getSourceById(sourceId);

      res.status(200).json(
        ResponseUtil.success("Source retrieved successfully", source)
      );
    } catch (error) {
      next(error);
    }
  };

  public deleteSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = this.validateNumericId(req.params.id, "source ID");
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      await this.baseSourceService.deleteSource(sourceId, userId);

      res.status(200).json(
        ResponseUtil.deleted("Source deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  };

  public createSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = this.validateNumericId(req.params.agentId, "agent ID");
      const sourceData: CreateSourceDto = { ...req.body, agent_id: agentId };
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const source = await this.baseSourceService.createSource(
        sourceData,
        userId
      );

      res
        .status(201)
        .json(ResponseUtil.created("Source created successfully", source));
    } catch (error) {
      next(error);
    }
  };

  public updateSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = Number(req.params.id);
      const sourceData: UpdateSourceDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const updatedSource = await this.baseSourceService.updateSource(
        sourceId,
        sourceData,
        userId
      );

      res.status(200).json(
        ResponseUtil.updated("Source updated successfully", updatedSource)
      );
    } catch (error) {
      next(error);
    }
  };
}

export default BaseSourceController;
