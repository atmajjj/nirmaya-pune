import { Router } from "express";
import FileSourceController from "./file-source.controller";
import {
  UpdateFileSourceDto,
  CreateMultipleFilesSourceDto,
} from "../source.dto";
import Route from "../../../interfaces/route.interface";
import validationMiddleware from "../../../middlewares/validation.middleware";
import {
  uploadSingleFileMiddleware,
  uploadMultipleFilesMiddleware,
} from "../../../middlewares/upload.middleware";

class FileSourceRoute implements Route {
  public path = "/sources/file";
  public router = Router();
  public fileSourceController = new FileSourceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      `${this.path}/agent/:agentId`,
      this.fileSourceController.getAllFileSources
    );
    this.router.get(
      `${this.path}/:id`,
      this.fileSourceController.getFileSourceById
    );

    // Route for multipart/form-data file upload (recommended method)
    this.router.post(
      this.path,
      uploadSingleFileMiddleware,
      this.fileSourceController.createFileSource
    );

    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(UpdateFileSourceDto, "body", true, []),
      this.fileSourceController.updateFileSource
    );

    // Route for uploading multiple files at once with multipart/form-data (recommended)
    this.router.post(
      `${this.path}/multiple`,
      uploadMultipleFilesMiddleware,
      this.fileSourceController.createMultipleFilesWithMulter
    );
  }
}

export default FileSourceRoute;
