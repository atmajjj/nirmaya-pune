import { Router } from "express";
import DatabaseSourceController from "./database-source.controller";
import Route from "../../../interfaces/route.interface";
import authMiddleware from "../../../middlewares/auth.middleware";
import validationMiddleware from "../../../middlewares/validation.middleware";
import {
  CreateDatabaseSourceDto,
  UpdateDatabaseSourceDto,
  TestDatabaseConnectionDto,
} from "./database-source.dto";

class DatabaseSourceRoute implements Route {
  public path = "/sources/database";
  public router = Router();
  public databaseSourceController = new DatabaseSourceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Apply authentication middleware to all routes
    this.router.use(authMiddleware);

    // Use Case 1: Database Connection Management

    // Test database connection before saving (essential for workflow)
    this.router.post(
      `${this.path}/test-connection`,
      validationMiddleware(TestDatabaseConnectionDto, "body", false, []),
      this.databaseSourceController.testConnectionWithConfig
    );

    // Basic CRUD operations for database sources
    this.router.get(
      `${this.path}/agent/:agentId`,
      this.databaseSourceController.getAllDatabaseSources
    );
    this.router.get(
      `${this.path}/:id`,
      this.databaseSourceController.getDatabaseSourceById
    );
    this.router.post(
      `${this.path}`,
      validationMiddleware(CreateDatabaseSourceDto, "body", false, []),
      this.databaseSourceController.createDatabaseSource
    );
    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(UpdateDatabaseSourceDto, "body", true, []),
      this.databaseSourceController.updateDatabaseSource
    );

    // Use Case 2: Table Schema Management
    // TODO: These methods need to be implemented in the controller
    // They will manage a separate table for storing table schemas under database sources

    // Add a table to a database source and fetch its schema
    // this.router.post(
    //   `${this.path}/:id/tables`,
    //   this.databaseSourceController.addTableToSource
    // );

    // Get all tables for a database source
    // this.router.get(
    //   `${this.path}/:id/tables`,
    //   this.databaseSourceController.getTablesForSource
    // );

    // Get specific table schema
    // this.router.get(
    //   `${this.path}/:id/tables/:tableId`,
    //   this.databaseSourceController.getTableById
    // );

    // Update table schema (re-fetch from database)
    // this.router.put(
    //   `${this.path}/:id/tables/:tableId/refresh-schema`,
    //   this.databaseSourceController.refreshTableSchema
    // );

    // Remove table from source
    // this.router.delete(
    //   `${this.path}/:id/tables/:tableId`,
    //   this.databaseSourceController.removeTableFromSource
    // );
  }
}

export default DatabaseSourceRoute;
