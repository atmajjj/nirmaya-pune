import { NextFunction, Request, Response } from "express";
import { CreateTextSourceDto, UpdateTextSourceDto } from "../source.dto";
import TextSourceService from "../services/text-source.service";
import { RequestWithUser } from "../../../interfaces/auth.interface";
import HttpException from "../../../exceptions/HttpException";
import { ResponseUtil } from "../../../utils/response.util";

class TextSourceController {
  public textSourceService = new TextSourceService();

  public getAllTextSources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = Number(req.params.agentId);
      const textSources = await this.textSourceService.getAllTextSources(
        agentId
      );

      res.status(200).json(
        ResponseUtil.success("Text sources retrieved successfully", textSources)
      );
    } catch (error) {
      next(error);
    }
  };

  public getTextSourceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = Number(req.params.id);
      const textSource = await this.textSourceService.getTextSourceById(
        sourceId
      );

      res.status(200).json(
        ResponseUtil.success("Text source retrieved successfully", textSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public createTextSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const textSourceData: CreateTextSourceDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const textSource = await this.textSourceService.createTextSource(
        textSourceData.agent_id,
        textSourceData.name,
        textSourceData.description,
        textSourceData.content,
        userId
      );

      res.status(201).json(
        ResponseUtil.created("Text source created successfully", textSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public updateTextSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = Number(req.params.id);
      const textSourceData: UpdateTextSourceDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const updatedTextSource = await this.textSourceService.updateTextSource(
        sourceId,
        textSourceData,
        userId
      );

      res.status(200).json(
        ResponseUtil.updated("Text source updated successfully", updatedTextSource)
      );
    } catch (error) {
      next(error);
    }
  };
}

export default TextSourceController;
