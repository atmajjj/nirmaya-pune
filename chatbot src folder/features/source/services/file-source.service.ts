import knex from "../../../../database/index.schema";
import {
  FileSource,
  FileSourceInput,
  FileSourceUpdateInput,
} from "../source.interface";
import HttpException from "../../../exceptions/HttpException";
import { isEmpty } from "class-validator";
import {
  uploadMulterFile,
  uploadMultipleFilesMulter,
  extractInsertedId,
  type FileUploadResult,
} from "../../../utils/fileupload";
import { getUserForAgent, validateAgentExists } from "../../agent/services/agentUtils";

class FileSourceService {
  public async getAllFileSources(agentId: number): Promise<FileSource[]> {
    try {
      const fileSources = await knex("sources")
        .join("file_sources", "sources.id", "file_sources.source_id")
        .where("sources.agent_id", agentId)
        .where("sources.is_deleted", false)
        .select("sources.*", "file_sources.*");
      return fileSources;
    } catch (error) {
      throw new HttpException(
        500,
        `Error fetching file sources: ${error.message}`
      );
    }
  }

  public async getFileSourceById(sourceId: number): Promise<FileSource> {
    try {
      const fileSource = await knex("sources")
        .join("file_sources", "sources.id", "file_sources.source_id")
        .where("sources.id", sourceId)
        .where("sources.is_deleted", false)
        .select("sources.*", "file_sources.*")
        .first();

      if (!fileSource) {
        throw new HttpException(404, "File source not found");
      }

      return fileSource;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error fetching file source: ${error.message}`
      );
    }
  }

  public async getFolderPathForAgent(agentId: number): Promise<string> {
    try {
      // Get user associated with the agent
      const user = await getUserForAgent(agentId);
      return `users/${user.name}/agents/${agentId}/files`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error getting folder path for agent: ${error.message}`
      );
    }
  }

  public async createFileSourceFromUpload(
    agentId: number,
    sourceName: string,
    sourceDescription: string,
    uploadResult: FileUploadResult
  ): Promise<FileSource> {
    try {
      await validateAgentExists(agentId);
      const user = await getUserForAgent(agentId);

      return await knex.transaction(async (trx) => {
        try {
          const result = await trx("sources")
            .insert({
              agent_id: agentId,
              source_type: "file",
              name: sourceName,
              description: sourceDescription,
              status: "pending",
              is_embedded: false,
              created_by: user.user_id,
              created_at: new Date(),
              updated_at: new Date(),
              is_deleted: false,
            })
            .returning("id");

          const sourceId = extractInsertedId(result);

          const fileSourceInsert = await trx("file_sources").insert({
            source_id: sourceId,
            file_url: uploadResult.Location,
            mime_type: uploadResult.ContentType || "application/octet-stream",
            file_size: uploadResult.size || 0,
            text_content: uploadResult.textContent || null,
          });
          if (!fileSourceInsert) {
            throw new HttpException(
              500,
              "Failed to insert file_sources record"
            );
          }

          // Fetch the joined file source using the same transaction
          const fileSource = await trx("sources")
            .join("file_sources", "sources.id", "file_sources.source_id")
            .where("sources.id", sourceId)
            .where("sources.is_deleted", false)
            .select("sources.*", "file_sources.*")
            .first();
          if (!fileSource) {
            throw new HttpException(
              500,
              `File source inserted but not found (in transaction). sourceId: ${sourceId}`
            );
          }
          return fileSource;
        } catch (err) {
           
          console.error(
            "[DEBUG] Transaction error in createFileSourceFromUpload:",
            err
          );
          throw err;
        }
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error creating file source from upload: ${error.message}`
      );
    }
  }

  public async createFileSource(
    sourceData: FileSourceInput,
    userId: number
  ): Promise<FileSource> {
    try {
      if (isEmpty(sourceData)) {
        throw new HttpException(400, "Source data is empty");
      }

      // First check if source exists
      const source = await knex("sources")
        .where("id", sourceData.source_id)
        .where("is_deleted", false)
        .first();

      if (!source) {
        throw new HttpException(404, "Source not found");
      }

      const fileSourceInsert = await knex("file_sources").insert({
        source_id: sourceData.source_id,
        file_url: sourceData.file_url,
        mime_type: sourceData.mime_type || "application/octet-stream",
        file_size: sourceData.file_size || 0,
        text_content: sourceData.text_content,
      });

      if (!fileSourceInsert) {
        throw new HttpException(500, "Failed to insert file_sources record");
      }

      // Update the source table
      await knex("sources").where("id", sourceData.source_id).update({
        updated_by: userId,
        updated_at: new Date(),
      });

      // Fetch the joined file source after insert
      const fileSource = await knex("sources")
        .join("file_sources", "sources.id", "file_sources.source_id")
        .where("sources.id", sourceData.source_id)
        .where("sources.is_deleted", false)
        .select("sources.*", "file_sources.*")
        .first();

      if (!fileSource) {
        throw new HttpException(
          500,
          `File source inserted but not found. sourceId: ${sourceData.source_id}`
        );
      }

      return fileSource;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Failed to create file source: ${error.message}`
      );
    }
  }

  public async updateFileSource(
    sourceId: number,
    sourceData: FileSourceUpdateInput,
    userId: number
  ): Promise<FileSource> {
    try {
      if (isEmpty(sourceData)) {
        throw new HttpException(400, "Source data is empty");
      }

      // Check if source exists
      const source = await knex("sources")
        .join("file_sources", "sources.id", "file_sources.source_id")
        .where("sources.id", sourceId)
        .where("sources.is_deleted", false)
        .first();

      if (!source) {
        throw new HttpException(404, "File source not found");
      }

      // Start transaction
      return await knex.transaction(async (trx) => {
        // Update sources table with audit fields
        await trx("sources").where("id", sourceId).update({
          updated_by: userId,
          updated_at: new Date(),
        });

        // Update file_sources table
        const updateData: any = {};
        if (sourceData.file_url) updateData.file_url = sourceData.file_url;
        if (sourceData.mime_type) updateData.mime_type = sourceData.mime_type;
        if (sourceData.file_size !== undefined)
          updateData.file_size = sourceData.file_size;
        if (sourceData.text_content !== undefined)
          updateData.text_content = sourceData.text_content;

        if (Object.keys(updateData).length > 0) {
          await trx("file_sources")
            .where("source_id", sourceId)
            .update(updateData);
        }

        // Get the updated file source
        return await this.getFileSourceById(sourceId);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error updating file source: ${error.message}`
      );
    }
  }

  public async createMultipleFileSources(
    agentId: number,
    uploadResults: FileUploadResult[],
    names: string[],
    descriptions?: string[]
  ): Promise<FileSource[]> {
    try {
      if (isEmpty(uploadResults) || uploadResults.length === 0) {
        throw new HttpException(400, "No files provided");
      }

      await validateAgentExists(agentId);
      const user = await getUserForAgent(agentId);

      // Insert and fetch all file sources in a single transaction
      return await knex.transaction(async (trx) => {
        const fileSources = [];
        for (let i = 0; i < uploadResults.length; i++) {
          const uploadResult = uploadResults[i];
          const name = names[i];
          const description = descriptions?.[i];

          const sourceResult = await trx("sources")
            .insert({
              agent_id: agentId,
              source_type: "file",
              name: name,
              description: description,
              status: "pending",
              is_embedded: false,
              created_by: user.user_id,
              created_at: new Date(),
              updated_at: new Date(),
              is_deleted: false,
            })
            .returning("id");

          const sourceId = extractInsertedId(sourceResult);

          await trx("file_sources").insert({
            source_id: sourceId,
            file_url: uploadResult.Location,
            mime_type: uploadResult.ContentType || "application/octet-stream",
            file_size: uploadResult.size || 0,
            text_content: uploadResult.textContent || null,
          });

          // Fetch the joined file source using the same transaction
          const fileSource = await trx("sources")
            .join("file_sources", "sources.id", "file_sources.source_id")
            .where("sources.id", sourceId)
            .where("sources.is_deleted", false)
            .select("sources.*", "file_sources.*")
            .first();
          if (!fileSource) {
            throw new HttpException(
              500,
              `File source inserted but not found (in transaction). sourceId: ${sourceId}`
            );
          }
          fileSources.push(fileSource);
        }
        return fileSources;
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Failed to upload files: ${error.message}`);
    }
  }
}

export default FileSourceService;
