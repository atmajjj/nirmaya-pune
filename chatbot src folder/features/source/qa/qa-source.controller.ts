import { NextFunction, Request, Response } from "express";
import QASourceService from "../services/qa-source.service";
import { RequestWithUser } from "../../../interfaces/auth.interface";
import HttpException from "../../../exceptions/HttpException";
import { CreateQASourceDto, UpdateQASourceDto } from "../source.dto";
import { ResponseUtil } from "../../../utils/response.util";

class QASourceController {
  public qaSourceService = new QASourceService();

  public getAllQASources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = Number(req.params.agentId);
      const qaSources = await this.qaSourceService.getAllQASources(agentId);
      res.status(200).json(
        ResponseUtil.success("QA sources retrieved successfully", qaSources)
      );
    } catch (error) {
      next(error);
    }
  };

  public getQASourceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = Number(req.params.id);
      const qaSource = await this.qaSourceService.getQASourceById(sourceId);
      res
        .status(200)
        .json(ResponseUtil.success("QA source retrieved successfully", qaSource));
    } catch (error) {
      next(error);
    }
  };

  public createQASource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const qaSourceData: CreateQASourceDto = req.body;
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const qaSources = await this.qaSourceService.createQASource(
        qaSourceData.agent_id,
        qaSourceData.name,
        qaSourceData.description,
        qaSourceData.qa_pairs,
        userId
      );
      res
        .status(201)
        .json(ResponseUtil.created("QA sources created successfully", qaSources));
    } catch (error) {
      next(error);
    }
  };

  public updateQASource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = Number(req.params.id);
      const qaSourceData: UpdateQASourceDto = req.body;
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const updatedQASource = await this.qaSourceService.updateQASource(
        sourceId,
        qaSourceData,
        userId
      );
      res.status(200).json(
        ResponseUtil.updated("QA source updated successfully", updatedQASource)
      );
    } catch (error) {
      next(error);
    }
  };
}

export default QASourceController;
