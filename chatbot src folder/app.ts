import "reflect-metadata";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import compression from "compression";
import rateLimitMiddleware from "./middlewares/rate-limit.middleware";
import { analyticsMiddleware } from "./middlewares/analytics.middleware";
import Routes from "./interfaces/route.interface";
import errorMiddleware from "./middlewares/error.middleware";
import { logger, stream } from "./utils/logger";
import authMiddleware from "./middlewares/auth.middleware";
import { setupSwagger, updateSwaggerServers } from "../docs/swagger";

class App {
  public app: express.Application;
  public port: string | number;
  public env: string;

  constructor(routes: Routes[]) {
    // Initialize the express app
    this.app = express();
    this.port = process.env.PORT || 8000;
    this.env = process.env.NODE_ENV || "development";

    this.app.use(cookieParser());
    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();

    this.app.get("/", (req, res) => {
      res.send("Welcome to Chatverse Backend");
    });

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: this.env,
        uptime: process.uptime(),
        memory: {
          used:
            Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
            100,
          total:
            Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
            100,
        },
        version: process.env.npm_package_version || "1.0.0",
      });
    });
  }

  public listen() {
    const port = Number(this.port);
    this.app.listen(port, "0.0.0.0", () => {
      logger.info(
        `🚀 Chatverse Backend listening on port ${port}. Environment: ${this.env}.`
      );
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    if (this.env === "production") {
      this.app.use(morgan("combined", { stream }));
    } else if (this.env === "development") {
      this.app.use(morgan("dev", { stream }));
    }

    // Configure CORS with specific allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "https://chatverse-frontend.vercel.app",
      "http://localhost:8000",
    ];
    this.app.use(
      cors({
        origin: allowedOrigins,
        credentials: true,
      })
    );

    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());

    // Add rate limiting middleware
    this.app.use("/api/", rateLimitMiddleware);

    this.app.use(express.json({ limit: "10mb" })); // Reduced from 2gb
    this.app.use(express.urlencoded({ limit: "10mb", extended: true })); // Reduced from 2gb
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    this.app.use("/api/v1/", authMiddleware);
    this.app.use("/api/v1/", analyticsMiddleware);
    routes.forEach((route) => {
      this.app.use("/api/v1/", route.router);
    });
  }

  private initializeSwagger() {
    // Update server URLs based on environment
    const serverUrl = `http://localhost:${this.port}`;
    updateSwaggerServers([
      {
        url: serverUrl,
        description: `${this.env} server (Root routes)`,
      },
      {
        url: `${serverUrl}/api/v1`,
        description: `${this.env} server (API routes)`,
      },
    ]);

    // Setup Swagger documentation
    setupSwagger(this.app, "/api-docs");
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
