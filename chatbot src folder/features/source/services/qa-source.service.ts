import knex from "../../../../database/index.schema";
import {
  QASource,
  QASourceInput,
  QASourceUpdateInput,
  QAPair,
} from "../source.interface";
import HttpException from "../../../exceptions/HttpException";
import { isEmpty } from "class-validator";
import { validateAgentExists, getUserForAgent } from "../../agent/services/agentUtils";
import { extractInsertedId } from "../../../utils/fileupload";

class QASourceService {
  public async getAllQASources(agentId: number): Promise<QASource[]> {
    try {
      const qaSources = await knex("sources")
        .join("qa_sources", "sources.id", "qa_sources.source_id")
        .where("sources.agent_id", agentId)
        .where("sources.is_deleted", false)
        .select("sources.*", "qa_sources.*");
      return qaSources;
    } catch (error) {
      throw new HttpException(
        500,
        `Error fetching QA sources: ${error.message}`
      );
    }
  }

  public async getQASourceById(sourceId: number): Promise<QASource> {
    try {
      const qaSource = await knex("sources")
        .join("qa_sources", "sources.id", "qa_sources.source_id")
        .where("sources.id", sourceId)
        .where("sources.is_deleted", false)
        .select("sources.*", "qa_sources.*")
        .first();

      if (!qaSource) {
        throw new HttpException(404, "QA source not found");
      }

      return qaSource;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error fetching QA source: ${error.message}`
      );
    }
  }

  public async createQASource(
    agentId: number,
    name: string,
    description: string,
    qaPairs: QAPair[],
    userId: number
  ): Promise<QASource[]> {
    try {
      if (isEmpty(qaPairs) || qaPairs.length === 0) {
        throw new HttpException(400, "QA pairs are required");
      }

      await validateAgentExists(agentId);
      const userInfo = await getUserForAgent(agentId);

      return await knex.transaction(async (trx) => {
        const qaSources: QASource[] = [];

        for (const qaPair of qaPairs) {
          const result = await trx("sources")
            .insert({
              agent_id: agentId,
              source_type: "qa",
              name: name || `QA: ${qaPair.question.substring(0, 50)}...`,
              description: description,
              status: "pending",
              is_embedded: false,
              created_by: userInfo.user_id,
              created_at: new Date(),
              updated_at: new Date(),
              is_deleted: false,
            })
            .returning("id");

          const sourceId = extractInsertedId(result);

          await trx("qa_sources").insert({
            source_id: sourceId,
            question: qaPair.question,
            answer: qaPair.answer,
          });

          const qaSource = await trx("sources")
            .join("qa_sources", "sources.id", "qa_sources.source_id")
            .where("sources.id", sourceId)
            .select("sources.*", "qa_sources.*")
            .first();

          qaSources.push(qaSource);
        }

        return qaSources;
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error creating QA source: ${error.message}`
      );
    }
  }

  public async updateQASource(
    sourceId: number,
    sourceData: QASourceUpdateInput,
    userId: number
  ): Promise<QASource> {
    try {
      if (isEmpty(sourceData)) {
        throw new HttpException(400, "Source data is empty");
      }

      const source = await knex("sources")
        .join("qa_sources", "sources.id", "qa_sources.source_id")
        .where("sources.id", sourceId)
        .where("sources.is_deleted", false)
        .first();

      if (!source) {
        throw new HttpException(404, "QA source not found");
      }

      return await knex.transaction(async (trx) => {
        // Update sources table with audit fields
        await trx("sources").where("id", sourceId).update({
          updated_by: userId,
          updated_at: new Date(),
        });

        // Update qa_sources table
        const updateData: any = {};
        if (sourceData.question !== undefined)
          updateData.question = sourceData.question;
        if (sourceData.answer !== undefined)
          updateData.answer = sourceData.answer;

        if (Object.keys(updateData).length > 0) {
          await trx("qa_sources")
            .where("source_id", sourceId)
            .update(updateData);
        }

        return await this.getQASourceById(sourceId);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error updating QA source: ${error.message}`
      );
    }
  }
}

export default QASourceService;
