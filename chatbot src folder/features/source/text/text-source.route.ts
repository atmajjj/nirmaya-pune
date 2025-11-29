import { Router } from "express";
import TextSourceController from "./text-source.controller";
import { CreateTextSourceDto, UpdateTextSourceDto } from "../source.dto";
import Route from "../../../interfaces/route.interface";
import validationMiddleware from "../../../middlewares/validation.middleware";

class TextSourceRoute implements Route {
  public path = "/sources/text";
  public router = Router();
  public textSourceController = new TextSourceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      `${this.path}/agent/:agentId`,
      this.textSourceController.getAllTextSources
    );
    this.router.get(
      `${this.path}/:id`,
      this.textSourceController.getTextSourceById
    );
    this.router.post(
      this.path,
      validationMiddleware(CreateTextSourceDto, "body", false, []),
      this.textSourceController.createTextSource
    );
    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(UpdateTextSourceDto, "body", true, []),
      this.textSourceController.updateTextSource
    );
  }
}

export default TextSourceRoute;
