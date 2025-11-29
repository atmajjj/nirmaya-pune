import knex from "../../../../database/index.schema";
import {
  CreateProviderModelDto,
  UpdateProviderModelDto,
} from "../provider-model.dto";
import { ProviderModel } from "../provider-model.interface";
import HttpException from "../../../exceptions/HttpException";

export class ProviderModelService {
  /**
   * Get all provider models
   */
  public async getProviderModels(): Promise<ProviderModel[]> {
    try {
      const models = await knex("provider_models")
        .where("is_deleted", false)
        .select("*")
        .orderBy("provider", "asc")
        .orderBy("model_name", "asc");
      return models;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error getting provider models: ${error.message}`
      );
    }
  }

  /**
   * Get models for a specific provider
   */
  public async getProviderModelsByProvider(
    provider: string
  ): Promise<ProviderModel[]> {
    try {
      const models = await knex("provider_models")
        .where({ provider, is_deleted: false })
        .select("*")
        .orderBy("model_name", "asc");
      return models;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error getting provider models: ${error.message}`
      );
    }
  }

  /**
   * Get provider model by ID
   */
  public async getProviderModelById(id: number): Promise<ProviderModel> {
    try {
      const model = await knex("provider_models")
        .where({ id, is_deleted: false })
        .first();

      if (!model) {
        throw new HttpException(404, "Provider model not found");
      }

      return model;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error getting provider model: ${error.message}`
      );
    }
  }

  /**
   * Create a new provider model
   */
  public async createProviderModel(
    userData: number,
    modelData: CreateProviderModelDto
  ): Promise<ProviderModel> {
    try {
      const exists = await knex("provider_models")
        .where({
          provider: modelData.provider,
          model_name: modelData.model_name,
          is_deleted: false,
        })
        .first();

      if (exists) {
        throw new HttpException(409, "Provider model already exists");
      }

      const [createdModel] = await knex("provider_models")
        .insert({
          ...modelData,
          created_by: userData,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return createdModel;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error creating provider model: ${error.message}`
      );
    }
  }

  /**
   * Update an existing provider model
   */
  public async updateProviderModel(
    id: number,
    userData: number,
    modelData: UpdateProviderModelDto
  ): Promise<ProviderModel> {
    try {
      // Check if model exists
      await this.getProviderModelById(id);

      if (modelData.provider && modelData.model_name) {
        const exists = await knex("provider_models")
          .where({
            provider: modelData.provider,
            model_name: modelData.model_name,
            is_deleted: false,
          })
          .whereNot("id", id)
          .first();

        if (exists) {
          throw new HttpException(
            409,
            "Provider model combination already exists"
          );
        }
      }

      const [updatedModel] = await knex("provider_models")
        .where({ id })
        .update({
          ...modelData,
          updated_by: userData,
          updated_at: new Date(),
        })
        .returning("*");

      return updatedModel;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error updating provider model: ${error.message}`
      );
    }
  }

  /**
   * Delete a provider model (soft delete)
   */
  public async deleteProviderModel(
    id: number,
    userData: number
  ): Promise<void> {
    try {
      // Check if model exists
      await this.getProviderModelById(id);

      const [deletedModel] = await knex("provider_models")
        .where({ id })
        .update({
          is_deleted: true,
          deleted_by: userData,
          deleted_at: new Date(),
        })
        .returning("*");

      if (!deletedModel) {
        throw new HttpException(404, "Provider model not found");
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error deleting provider model: ${error.message}`
      );
    }
  }
}
