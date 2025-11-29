import { Router } from "express";
import WebsiteSourceController from "./website-source.controller";
import { CreateWebsiteSourceDto, UpdateWebsiteSourceDto } from "../source.dto";
import Route from "../../../interfaces/route.interface";
import validationMiddleware from "../../../middlewares/validation.middleware";

class WebsiteSourceRoute implements Route {
  public path = "/sources/website";
  public router = Router();
  public websiteSourceController = new WebsiteSourceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Basic CRUD routes
    this.router.get(
      `${this.path}/agent/:agentId`,
      this.websiteSourceController.getAllWebsiteSources
    );
    this.router.get(
      `${this.path}/:id`,
      this.websiteSourceController.getWebsiteSourceById
    );
    this.router.post(
      this.path,
      validationMiddleware(CreateWebsiteSourceDto, "body", false, []),
      this.websiteSourceController.createWebsiteSource
    );
    this.router.put(
      `${this.path}/:id`,
      validationMiddleware(UpdateWebsiteSourceDto, "body", true, []),
      this.websiteSourceController.updateWebsiteSource
    );

    // Scraping-specific routes
    this.router.post(
      `${this.path}/:id/scrape`,
      this.websiteSourceController.triggerScraping
    );
    this.router.get(
      `${this.path}/:id/status`,
      this.websiteSourceController.getScrapingStatus
    );
  }
}

export default WebsiteSourceRoute;
