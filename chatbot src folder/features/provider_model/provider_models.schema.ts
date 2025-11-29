import DB from "../../../database/index.schema";

export const PROVIDER_MODELS_TABLE = "provider_models";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(PROVIDER_MODELS_TABLE, (table) => {
    table.increments("id").primary();
    table.text("provider").notNullable();
    table.text("model_name").notNullable();
    table.integer("created_by").notNullable();
    table.timestamp("created_at").defaultTo(DB.fn.now());
    table.integer("updated_by").nullable();
    table.timestamp("updated_at").defaultTo(DB.fn.now());
    table.boolean("is_deleted").defaultTo(false);
    table.integer("deleted_by").nullable();
    table.timestamp("deleted_at").nullable();

    // Add unique constraint to prevent duplicate provider-model combinations
    table.unique(["provider", "model_name"]);
  });

  // Create the update_timestamp trigger
  await DB.raw(`
    CREATE TRIGGER update_provider_models_timestamp
    BEFORE UPDATE ON ${PROVIDER_MODELS_TABLE}
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  `);
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(PROVIDER_MODELS_TABLE);
};

// Seed table with default provider models
export const seedTable = async () => {
  const groqModels = [
    "moonshotai/kimi-k2-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
  ];

  // Use transaction to ensure atomic operation
  const trx = await DB.transaction();
  
  try {
    const modelsToInsert = [];

    // Check which models don't already exist
    for (const modelName of groqModels) {
      const existing = await trx(PROVIDER_MODELS_TABLE)
        .where({ provider: "groq", model_name: modelName })
        .first();

      if (!existing) {
        modelsToInsert.push({
          provider: "groq",
          model_name: modelName,
          created_by: 1,
          created_at: DB.fn.now(),
          updated_at: DB.fn.now(),
        });
      }
    }

    if (modelsToInsert.length > 0) {
      await trx(PROVIDER_MODELS_TABLE).insert(modelsToInsert);
      await trx.commit();
      console.log(`✅ Seeded ${modelsToInsert.length} Groq models (with transaction)`);
    } else {
      await trx.commit();
      console.log(`ℹ️  Groq models already seeded`);
    }
  } catch (error) {
    await trx.rollback();
    console.error("❌ Error seeding provider models:", error);
    throw error;
  }
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${PROVIDER_MODELS_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${PROVIDER_MODELS_TABLE} table...`);
      await createTable();
      
      console.log(`Seeding ${PROVIDER_MODELS_TABLE} table...`);
      await seedTable();

      
      console.log(
        `${PROVIDER_MODELS_TABLE} table ${dropFirst ? "recreated" : "created"} and seeded`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${PROVIDER_MODELS_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/provider_models.schema.ts       # Create table and seed with Groq models
   npx ts-node src/database/provider_models.schema.ts --drop # Recreate table and seed with Groq models
*/