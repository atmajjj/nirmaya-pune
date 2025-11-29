import { Response, NextFunction } from "express";
import { RequestWithUser } from "../../interfaces/auth.interface";
import VectorService from "./services/vector.service";
import HttpException from "../../exceptions/HttpException";
import { logger } from "../../utils/logger";
import { vectorConfig } from "../../config/vector.config";
import { searchConfig } from "../../config/search.config";
import ResponseUtil from "../../utils/response.util";

class VectorController {
  public vectorService = new VectorService();

  public upsertRecords = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { records, agentId }: { records: any[]; agentId?: number } =
        req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (
        !records ||
        !Array.isArray(records) ||
        records.some((r) => typeof r.text !== "string")
      ) {
        throw new HttpException(400, "Each record must have a 'text' field.");
      }

      await this.vectorService.upsertRecords(records, userId, agentId);
      res.status(201).json(
        ResponseUtil.message("Vectors upserted successfully")
      );
    } catch (error) {
      next(error);
    }
  };

  public searchContent = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, agentId }: { query: string; agentId?: number } = req.body;
      const userId = req.userId || req.user?.id;

            console.log(`🔍🔍 DEBUG: searchContent called with query: "${query}", userId: ${userId}, agentId: ${agentId}`);

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (!query || typeof query !== "string") {
        throw new HttpException(400, "Query string is required.");
      }

      const results = await this.vectorService.searchSimilarWithPineconeHybrid(
        query,
        userId,
        agentId,
        {
          topK: searchConfig.parameters.defaultTopK,
          includeMetadata: searchConfig.parameters.includeMetadataByDefault,
          minSimilarity: searchConfig.parameters.defaultMinSimilarity,
          enableCache: searchConfig.parameters.enableCacheByDefault,
          enableReranking: false, // explicit disable per endpoint docs
          rerankTopN: searchConfig.reranking.defaultTopN,
        }
      ).catch(error => {
        logger.error('❌ Pinecone hybrid search failed, falling back to regular search:', error);
        return this.vectorService.searchSimilar(query, userId, agentId);
      });
      
      console.log(`🔍🔍 DEBUG: searchContent returning ${results.length} results`);
      
      res.status(200).json(
        ResponseUtil.success("Search completed successfully", results)
      );
    } catch (error) {
      console.error(`❌ Error in searchContent:`, error);
      next(error);
    }
  };

  public getStats = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { agentId }: { agentId?: number } = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      const stats = await this.vectorService.getIndexStats();
      res.status(200).json(
        ResponseUtil.success("Index stats retrieved successfully", stats)
      );
    } catch (error) {
      next(error);
    }
  };

  public fetchVectors = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { ids, agentId }: { ids: string[]; agentId?: number } = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new HttpException(400, "Vector IDs are required");
      }

      const results = await this.vectorService.fetchVectors(ids, userId, agentId);
      res.status(200).json(
        ResponseUtil.success("Vectors fetched successfully", results)
      );
    } catch (error) {
      next(error);
    }
  };

  public deleteVectors = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { ids, agentId }: { ids: string[]; agentId?: number } = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new HttpException(400, "Vector IDs are required");
      }

      const results = await this.vectorService.deleteVectors(ids, userId, agentId);
      res.status(200).json(
        ResponseUtil.success("Vectors deleted successfully", results)
      );
    } catch (error) {
      next(error);
    }
  };

  public deleteAllVectors = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { agentId }: { agentId?: number } = req.body;
      const userId = req.userId || req.user?.id;

      if (!userId) {
        throw new HttpException(401, "User authentication required");
      }

      if (agentId) {
        // Delete all vectors for specific agent
        await this.vectorService.deleteAgentVectors(userId, agentId);
        res.status(200).json(
          ResponseUtil.deleted(`All vectors for agent ${agentId} deleted successfully`)
        );
      } else {
        // Delete all vectors for user across all agents (dangerous operation)
        await this.vectorService.deleteUserVectors(userId);
        res.status(200).json(
          ResponseUtil.success("All user vectors deleted successfully")
        );
      }
    } catch (error) {
      next(error);
    }
  };
}

export default VectorController;
