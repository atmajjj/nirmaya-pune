import { Router } from "express";
import BaseSourceController from "./source.controller";
import Route from "../../interfaces/route.interface";
import { CreateSourceDto, UpdateSourceDto } from "./source.dto";
import validationMiddleware from "../../middlewares/validation.middleware";

class BaseSourceRoute implements Route {
  public path = "/sources";
  public router = Router();
  public baseSourceController = new BaseSourceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // General source routes
    this.router.get(
      `${this.path}/agent/:agentId`,
      this.baseSourceController.getAllSourcesByAgentId
    );
    this.router.post(
      `${this.path}/agent/:agentId`,
      validationMiddleware(CreateSourceDto, "body", false, []),
      this.baseSourceController.createSource
    );
    this.router.get(
      `${this.path}/:id`,
      this.baseSourceController.getSourceById
    );
    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(UpdateSourceDto, "body", true, []),
      this.baseSourceController.updateSource
    );
    this.router.delete(
      `${this.path}/:id`,
      this.baseSourceController.deleteSource
    );
  }
}

export default BaseSourceRoute;
