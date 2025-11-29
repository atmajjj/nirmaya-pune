import knex from "../../../../database/index.schema";
import HttpException from "../../../exceptions/HttpException";
import encryption from "./encryption";

// Remove sensitive fields from agent response
export function sanitizeAgentResponse(
  agent: any
): Omit<any, "encrypted_api_key" | "encryption_salt"> {
  const { encrypted_api_key, encryption_salt, ...sanitizedAgent } = agent;
  // Suppress unused variable warnings - we intentionally extract these to exclude them
  void encrypted_api_key;
  void encryption_salt;
  return sanitizedAgent;
}

// Validate model exists for provider
export async function validateModelForProvider(
  provider: string,
  model: string
) {
  const validModel = await knex("provider_models")
    .where({ provider, model_name: model, is_deleted: false })
    .first();
  if (!validModel) {
    throw new HttpException(
      400,
      `Invalid model '${model}' for provider '${provider}'`
    );
  }
}

// Check if agent name exists for user (optionally exclude agentId)
export async function checkAgentNameExists(
  name: string,
  userId: number,
  excludeId?: number
) {
  let query = knex("agents").where({
    name,
    user_id: userId,
    is_deleted: false,
  });
  if (excludeId) query = query.whereNot({ id: excludeId });
  const agent = await query.first();
  if (agent) {
    throw new HttpException(409, "Agent with this name already exists");
  }
}

// Encrypt API key if provided
export function encryptApiKeyIfNeeded(api_key?: string) {
  if (!api_key) return {};
  const salt = encryption.generateSalt();
  return {
    encrypted_api_key: encryption.encryptApiKey(api_key, salt),
    encryption_salt: salt,
  };
}

// Returns the user object for a given agentId, or throws if not found
export async function getUserForAgent(
  agentId: number
): Promise<{ user_id: number; name: string }> {
  const agent = await knex("agents")
    .join("users", "agents.user_id", "users.id")
    .where("agents.id", agentId)
    .select("users.id as user_id", "users.name")
    .first();
  if (!agent) {
    throw new HttpException(404, "Agent or user not found");
  }
  return agent;
}

// Throws if the agent does not exist
export async function validateAgentExists(agentId: number): Promise<void> {
  const agent = await knex("agents").where("id", agentId).first();
  if (!agent) {
    throw new HttpException(404, "Agent not found");
  }
}
