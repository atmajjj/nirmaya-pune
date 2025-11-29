import DB from "../../../database/index.schema";

export const SOURCES_TABLE = "sources";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(SOURCES_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("agent_id")
      .notNullable()
      .references("id")
      .inTable("agents")
      .onDelete("CASCADE");
    table
      .text("source_type")
      .notNullable()
      .checkIn(["file", "text", "website", "database", "qa"]);
    table.string("name").notNullable();
    table.text("description").nullable();
    table
      .text("status")
      .defaultTo("pending")
      .checkIn(["pending", "processing", "completed", "failed"]);
    table.boolean("is_embedded").defaultTo(false); // Track if content is vectorized
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
    CREATE TRIGGER update_sources_timestamp
    BEFORE UPDATE ON ${SOURCES_TABLE}
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  `);
};

// Drop Table (handles dependencies)
export const dropTable = async () => {
  // Drop all dependent tables first
  const dependentTables = [
    "file_sources",
    "text_sources",
    "website_sources",
    "database_sources",
    "qa_sources",
  ];

  for (const table of dependentTables) {
    console.log(`Dropping dependent table: ${table}...`);
    await DB.schema.dropTableIfExists(table);
  }

  // Then drop the sources table
  await DB.schema.dropTableIfExists(SOURCES_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${SOURCES_TABLE} table and its dependencies...`);
        await dropTable();
      }
      console.log(`Creating ${SOURCES_TABLE} table...`);
      await createTable();

      
      console.log(
        `${SOURCES_TABLE} table ${dropFirst ? "recreated" : "created"}`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${SOURCES_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/sources.schema.ts       # Create table
   npx ts-node src/database/sources.schema.ts --drop # Recreate table (drops dependent tables too)
*/