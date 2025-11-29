import { NextFunction, Request, Response } from "express";
import DatabaseSourceService from "../services/database-source.service";
import { RequestWithUser } from "../../../interfaces/auth.interface";
import HttpException from "../../../exceptions/HttpException";
import {
  CreateDatabaseSourceDto,
  UpdateDatabaseSourceDto,
  TestDatabaseConnectionDto,
} from "./database-source.dto";
import { logger } from "../../../utils/logger";
import { ResponseUtil } from "../../../utils/response.util";

class DatabaseSourceController {
  public databaseSourceService = new DatabaseSourceService();

  public getAllDatabaseSources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const agentId = Number(req.params.agentId);

      if (!agentId || isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      const databaseSources =
        await this.databaseSourceService.getAllDatabaseSources(agentId);

      res.status(200).json(
        ResponseUtil.success("Database sources retrieved successfully", databaseSources)
      );
    } catch (error) {
      next(error);
    }
  };

  public getDatabaseSourceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sourceId = Number(req.params.id);

      if (!sourceId || isNaN(sourceId)) {
        throw new HttpException(400, "Valid source ID is required");
      }

      const databaseSource =
        await this.databaseSourceService.getDatabaseSourceById(sourceId);

      res.status(200).json(
        ResponseUtil.success("Database source retrieved successfully", databaseSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public createDatabaseSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const databaseSourceData: CreateDatabaseSourceDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      logger.info(`🔄 Creating database source: ${databaseSourceData.name}`);

      const databaseSource =
        await this.databaseSourceService.createDatabaseSource(
          {
            agent_id: databaseSourceData.agent_id,
            name: databaseSourceData.name,
            description: databaseSourceData.description,
            db_host: databaseSourceData.db_host,
            db_port: databaseSourceData.db_port,
            db_user: databaseSourceData.db_user,
            db_password: databaseSourceData.db_password,
            db_name: databaseSourceData.db_name,
            connection_string: databaseSourceData.connection_string,
            schema_name: databaseSourceData.schema_name,
            test_connection: databaseSourceData.test_connection,
          },
          userId
        );

      res.status(201).json(
        ResponseUtil.created("Database source created successfully", databaseSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public updateDatabaseSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sourceId = Number(req.params.id);
      const databaseSourceData: UpdateDatabaseSourceDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!sourceId || isNaN(sourceId)) {
        throw new HttpException(400, "Valid source ID is required");
      }

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      logger.info(`🔄 Updating database source: ${sourceId}`);

      const updatedDatabaseSource =
        await this.databaseSourceService.updateDatabaseSource(
          sourceId,
          databaseSourceData,
          userId
        );

      res.status(200).json(
        ResponseUtil.updated("Database source updated successfully", updatedDatabaseSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public testConnectionWithConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const connectionConfig: TestDatabaseConnectionDto = req.body;

      logger.info(`🔍 Testing database connection with provided config`);

      // Import the service here to avoid circular dependencies
      const { databaseConnectionService } = await import(
        "../../../utils/database-connection"
      );

      const config = {
        host: connectionConfig.db_host,
        port: connectionConfig.db_port,
        user: connectionConfig.db_user,
        password: connectionConfig.db_password,
        database: connectionConfig.db_name,
        schema: connectionConfig.schema_name,
        connectionString: connectionConfig.connection_string,
      };

      const connectionResult =
        await databaseConnectionService.testConnectionWithRetry(config);

      const status = connectionResult.success ? 200 : 400;

      res.status(status).json(
        connectionResult.success 
          ? ResponseUtil.success("Database connection test successful", connectionResult)
          : ResponseUtil.error("Database connection test failed", "CONNECTION_FAILED", connectionResult)
      );
    } catch (error) {
      next(error);
    }
  };
}

export default DatabaseSourceController;
