import { NextFunction, Response } from "express";
import { ProviderModelService } from "./services/provider-model.service";
import {
  CreateProviderModelDto,
  UpdateProviderModelDto,
} from "./provider-model.dto";
import { RequestWithUser } from "../../interfaces/auth.interface";
import HttpException from "../../exceptions/HttpException";
import { ResponseUtil } from "../../utils/response.util";

class ProviderModelController {
  private providerModelService = new ProviderModelService();

  public getProviderModels = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const models = await this.providerModelService.getProviderModels();
      res.status(200).json(
        ResponseUtil.success("Provider models retrieved successfully", models)
      );
    } catch (error) {
      next(error);
    }
  };

  public getProviderModelsByProvider = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const provider = req.params.provider;
      if (!provider) {
        throw new HttpException(400, "Provider parameter is required");
      }

      const models =
        await this.providerModelService.getProviderModelsByProvider(provider);
      res.status(200).json(
        ResponseUtil.success(`Models for provider ${provider} retrieved successfully`, models)
      );
    } catch (error) {
      next(error);
    }
  };

  public getProviderModelById = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new HttpException(400, "Invalid provider model ID");
      }

      const model = await this.providerModelService.getProviderModelById(id);
      res.status(200).json(
        ResponseUtil.success("Provider model retrieved successfully", model)
      );
    } catch (error) {
      next(error);
    }
  };

  public createProviderModel = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const modelData: CreateProviderModelDto = req.body;
      const model = await this.providerModelService.createProviderModel(
        userId,
        modelData
      );
      res
        .status(201)
        .json(ResponseUtil.created("Provider model created successfully", model));
    } catch (error) {
      next(error);
    }
  };

  public updateProviderModel = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new HttpException(400, "Invalid provider model ID");
      }

      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const modelData: UpdateProviderModelDto = req.body;
      const model = await this.providerModelService.updateProviderModel(
        id,
        userId,
        modelData
      );
      res
        .status(200)
        .json(ResponseUtil.updated("Provider model updated successfully", model));
    } catch (error) {
      next(error);
    }
  };

  public deleteProviderModel = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new HttpException(400, "Invalid provider model ID");
      }

      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      await this.providerModelService.deleteProviderModel(id, userId);
      res.status(200).json(
        ResponseUtil.deleted("Provider model deleted successfully")
      );
    } catch (error) {
      next(error);
    }
  };
}

export default ProviderModelController;
