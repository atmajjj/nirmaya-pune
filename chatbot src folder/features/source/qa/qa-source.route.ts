import { Router } from "express";
import QASourceController from "./qa-source.controller";
import { CreateQASourceDto, UpdateQASourceDto } from "../source.dto";
import Route from "../../../interfaces/route.interface";
import validationMiddleware from "../../../middlewares/validation.middleware";

class QASourceRoute implements Route {
  public path = "/sources/qa";
  public router = Router();
  public qaSourceController = new QASourceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // QA source routes
    this.router.get(
      `${this.path}/agent/:agentId`,
      this.qaSourceController.getAllQASources
    );
    this.router.get(
      `${this.path}/:id`,
      this.qaSourceController.getQASourceById
    );
    this.router.post(
      this.path,
      validationMiddleware(CreateQASourceDto, "body", false, []),
      this.qaSourceController.createQASource
    );
    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(UpdateQASourceDto, "body", true, []),
      this.qaSourceController.updateQASource
    );
  }
}

export default QASourceRoute;
