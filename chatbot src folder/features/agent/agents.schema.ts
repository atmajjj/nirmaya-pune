import DB from "../../../database/index.schema";

export const AGENTS_TABLE = "agents";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(AGENTS_TABLE, (table) => {
    table.increments("id").primary(); // Primary key
    table.text("name").notNullable(); // Required field
    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE"); // User who owns this agent
    table.text("provider").notNullable(); // Provider name
    table.text("model").notNullable(); // Model specific to provider
    table.decimal("temperature", 3, 1).defaultTo(0.7);
    table
      .text("system_prompt")
      .defaultTo(
        "You are a helpful AI assistant. Provide accurate, informative responses while being concise and clear."
      );
    table.text("encrypted_api_key").notNullable(); // Encrypted API key
    table.text("encryption_salt").notNullable(); // Salt for encryption
    table.integer("is_active").defaultTo(1); // Default to active
    table.timestamp("trained_on").defaultTo(DB.fn.now()); // When the agent was trained
    table.string("training_status", 20).defaultTo("idle"); // idle, pending, in-progress, completed, failed
    table.integer("training_progress").defaultTo(0); // 0-100 percentage
    table.text("training_error").nullable(); // Error message if training fails
    table.integer("embedded_sources_count").defaultTo(0); // Number of sources embedded
    table.integer("total_sources_count").defaultTo(0); // Total sources to embed
    table.integer("created_by").notNullable();
    table.timestamp("created_at").defaultTo(DB.fn.now());
    table.integer("updated_by").nullable();
    table.timestamp("updated_at").defaultTo(DB.fn.now());
    table.boolean("is_deleted").defaultTo(false);
    table.integer("deleted_by").nullable();
    table.timestamp("deleted_at").nullable();
  });

  // Create the update_timestamp trigger
  await DB.raw(`
    CREATE TRIGGER update_agents_timestamp
    BEFORE UPDATE ON ${AGENTS_TABLE}
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  `);
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(AGENTS_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");

  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${AGENTS_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${AGENTS_TABLE} table...`);
      await createTable();


      console.log(
        `${AGENTS_TABLE} table ${dropFirst ? "recreated" : "created"}`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${AGENTS_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/agents.schema.ts       # Create table
   npx ts-node src/database/agents.schema.ts --drop # Recreate table
*/