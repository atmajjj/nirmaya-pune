import { Router } from "express";
import ProviderModelController from "./provider-model.controller";
import {
  CreateProviderModelDto,
  UpdateProviderModelDto,
} from "./provider-model.dto";
import Route from "../../interfaces/route.interface";
import validationMiddleware from "../../middlewares/validation.middleware";

export class ProviderModelRoute implements Route {
  public path = "/provider-models";
  public router = Router();
  public providerModelController = new ProviderModelController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Get all provider models
    this.router.get(
      `${this.path}`,
      this.providerModelController.getProviderModels
    );

    // Get models by provider
    this.router.get(
      `${this.path}/provider/:provider`,
      this.providerModelController.getProviderModelsByProvider
    );

    // Get model by id
    this.router.get(
      `${this.path}/:id`,
      this.providerModelController.getProviderModelById
    );

    // Create new provider model (allows adding both provider and model to the database)
    this.router.post(
      `${this.path}`,
      validationMiddleware(CreateProviderModelDto, "body", false, []),
      this.providerModelController.createProviderModel
    );

    // Update model
    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(UpdateProviderModelDto, "body", true, []),
      this.providerModelController.updateProviderModel
    );

    // Delete model
    this.router.delete(
      `${this.path}/:id`,
      this.providerModelController.deleteProviderModel
    );
  }
}
