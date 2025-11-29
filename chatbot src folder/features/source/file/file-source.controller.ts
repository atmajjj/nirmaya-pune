import { NextFunction, Request, Response } from "express";
import {
  CreateMultipleFilesSourceDto,
  UpdateFileSourceDto,
} from "../source.dto";
import FileSourceService from "../services/file-source.service";
import { RequestWithUser } from "../../../interfaces/auth.interface";
import {
  uploadMulterFile,
  uploadMultipleFilesMulter,
} from "../../../utils/fileupload";
import HttpException from "../../../exceptions/HttpException";
import { ResponseUtil } from "../../../utils/response.util";

class FileSourceController {
  public fileSourceService = new FileSourceService();

  public getAllFileSources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = Number(req.params.agentId);
      const fileSources = await this.fileSourceService.getAllFileSources(
        agentId
      );
      res.status(200).json(
        ResponseUtil.success("File sources retrieved successfully", fileSources)
      );
    } catch (error) {
      next(error);
    }
  };

  public getFileSourceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = Number(req.params.id);
      const fileSource = await this.fileSourceService.getFileSourceById(
        sourceId
      );
      res.status(200).json(
        ResponseUtil.success("File source retrieved successfully", fileSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public createFileSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      // Handle multipart/form-data uploads
      if (req.file) {
        const agentId = Number(req.body.agent_id);
        const name = req.body.name;
        const description = req.body.description;

        if (!name) {
          throw new HttpException(400, "Name is required");
        }

        const folderPath = await this.fileSourceService.getFolderPathForAgent(
          agentId
        );
        const uploadResult = await uploadMulterFile(req.file, folderPath);
        const fileSource =
          await this.fileSourceService.createFileSourceFromUpload(
            agentId,
            name,
            description,
            uploadResult
          );
        return res.status(201).json(
          ResponseUtil.created("File source created successfully from upload", fileSource)
        );
      }
      // For direct file source creation (this now requires source_id)
      throw new HttpException(400, "File upload is required");
    } catch (error) {
      next(error);
    }
  };

  public updateFileSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = Number(req.params.id);
      const fileSourceData: UpdateFileSourceDto = req.body;
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const updatedFileSource = await this.fileSourceService.updateFileSource(
        sourceId,
        fileSourceData,
        userId
      );
      res.status(200).json(
        ResponseUtil.updated("File source updated successfully", updatedFileSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public createMultipleFileSources = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const agentId = Number(req.body.agent_id);
      const names: string[] = req.body.names;
      const descriptions: string[] = req.body.descriptions;

      if (!agentId) {
        throw new HttpException(400, "Agent ID is required");
      }
      if (!names || !Array.isArray(names) || names.length === 0) {
        throw new HttpException(400, "Names array is required");
      }
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new HttpException(400, "No files uploaded");
      }
      if (req.files.length !== names.length) {
        throw new HttpException(
          400,
          "Number of files must match number of names"
        );
      }

      const folderPath = await this.fileSourceService.getFolderPathForAgent(
        agentId
      );
      const uploadResults = await uploadMultipleFilesMulter(
        req.files,
        folderPath
      );

      const fileSources =
        await this.fileSourceService.createMultipleFileSources(
          agentId,
          uploadResults,
          names,
          descriptions
        );

      res.status(201).json(
        ResponseUtil.created("Multiple file sources created successfully", fileSources)
      );
    } catch (error) {
      next(error);
    }
  };

  public createMultipleFilesWithMulter = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }
      const agentId = Number(req.body.agent_id);
      if (!agentId) {
        throw new HttpException(400, "Agent ID is required");
      }
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new HttpException(400, "No files uploaded");
      }
      const folderPath = await this.fileSourceService.getFolderPathForAgent(
        agentId
      );
      const uploadResults = await uploadMultipleFilesMulter(
        req.files,
        folderPath
      );
      const fileSourcePromises = uploadResults.map((result, index) => {
        const file = (req.files as Express.Multer.File[])[index];
        const name = req.body.names?.[index];
        const description = req.body.descriptions?.[index];

        if (!name) {
          throw new HttpException(
            400,
            `Name is required for file at index ${index}`
          );
        }

        return this.fileSourceService.createFileSourceFromUpload(
          agentId,
          name,
          description,
          result
        );
      });
      const fileSources = await Promise.all(fileSourcePromises);
      res.status(201).json(
        ResponseUtil.created("Multiple file sources created successfully from upload", fileSources)
      );
    } catch (error) {
      next(error);
    }
  };
}

export default FileSourceController;
