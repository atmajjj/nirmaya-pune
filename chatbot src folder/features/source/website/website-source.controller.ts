import { NextFunction, Request, Response } from "express";
import WebsiteSourceService from "../services/website-source.service";
import { RequestWithUser } from "../../../interfaces/auth.interface";
import HttpException from "../../../exceptions/HttpException";
import { CreateWebsiteSourceDto, UpdateWebsiteSourceDto } from "../source.dto";
import { ResponseUtil } from "../../../utils/response.util";

class WebsiteSourceController {
  public websiteSourceService = new WebsiteSourceService();

  private validateNumericId(id: string, paramName: string): number {
    const numericId = Number(id);
    if (isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      throw new HttpException(
        400,
        `Invalid ${paramName}: must be a positive integer`
      );
    }
    return numericId;
  }

  public getAllWebsiteSources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = this.validateNumericId(req.params.agentId, "agent ID");
      const websiteSources =
        await this.websiteSourceService.getAllWebsiteSources(agentId);

      res.status(200).json(
        ResponseUtil.success("Website sources retrieved successfully", websiteSources)
      );
    } catch (error) {
      next(error);
    }
  };

  public getWebsiteSourceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = this.validateNumericId(req.params.id, "source ID");
      const websiteSource =
        await this.websiteSourceService.getWebsiteSourceById(sourceId);

      res.status(200).json(
        ResponseUtil.success("Website source retrieved successfully", websiteSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public createWebsiteSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const websiteSourceData: CreateWebsiteSourceDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const websiteSource = await this.websiteSourceService.createWebsiteSource(
        websiteSourceData.agent_id,
        websiteSourceData.name,
        websiteSourceData.description || "",
        websiteSourceData.url,
        websiteSourceData.crawl_depth || 1,
        userId
      );

      res.status(201).json(
        ResponseUtil.created("Website source created successfully", websiteSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public updateWebsiteSource = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = this.validateNumericId(req.params.id, "source ID");
      const websiteSourceData: UpdateWebsiteSourceDto = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const updatedWebsiteSource =
        await this.websiteSourceService.updateWebsiteSource(
          sourceId,
          websiteSourceData,
          userId
        );

      res.status(200).json(
        ResponseUtil.updated("Website source updated successfully", updatedWebsiteSource)
      );
    } catch (error) {
      next(error);
    }
  };

  public triggerScraping = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = this.validateNumericId(req.params.id, "source ID");
      await this.websiteSourceService.triggerScraping(sourceId);

      res.status(200).json(
        ResponseUtil.message("Scraping triggered successfully")
      );
    } catch (error) {
      next(error);
    }
  };

  public getScrapingStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const sourceId = this.validateNumericId(req.params.id, "source ID");
      const status = await this.websiteSourceService.getScrapingStatus(
        sourceId
      );

      res.status(200).json(
        ResponseUtil.success("Scraping status retrieved successfully", status)
      );
    } catch (error) {
      next(error);
    }
  };
}

export default WebsiteSourceController;
