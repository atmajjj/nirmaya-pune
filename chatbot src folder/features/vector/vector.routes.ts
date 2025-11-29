import { Router } from "express";
import Route from "../../interfaces/route.interface";
import VectorController from "./vector.controller";
import validationMiddleware from "../../middlewares/validation.middleware";
import {
  FetchVectorsDto,
  DeleteVectorsDto,
  BatchUpsertDto,
} from "./vector.dto";

class VectorRoute implements Route {
  public path = "/vectors";
  public router = Router();
  public vectorController = new VectorController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Core Pinecone operations
    this.router.post(
      `${this.path}/upsert`,
      validationMiddleware(BatchUpsertDto, "body", false, []),
      this.vectorController.upsertRecords.bind(this.vectorController)
    );

    // Search operations
    this.router.post(
      `${this.path}/search`,
      this.vectorController.searchContent.bind(this.vectorController)
    );

    // Data management operations
    this.router.post(
      `${this.path}/fetch`,
      validationMiddleware(FetchVectorsDto, "body", false, []),
      this.vectorController.fetchVectors.bind(this.vectorController)
    );

    this.router.delete(
      `${this.path}/delete`,
      validationMiddleware(DeleteVectorsDto, "body", false, []),
      this.vectorController.deleteVectors.bind(this.vectorController)
    );

    this.router.delete(
      `${this.path}/delete-all`,
      this.vectorController.deleteAllVectors.bind(this.vectorController)
    );

    // Info operations

    this.router.get(
      `${this.path}/stats`,
      this.vectorController.getStats.bind(this.vectorController)
    );
  }
}

export default VectorRoute;
