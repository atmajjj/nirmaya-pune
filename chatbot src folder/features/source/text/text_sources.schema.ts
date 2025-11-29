import DB from "../../../../database/index.schema";

export const TEXT_SOURCES_TABLE = "text_sources";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(TEXT_SOURCES_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("source_id")
      .notNullable()
      .references("id")
      .inTable("sources")
      .onDelete("CASCADE");
    table.text("content").notNullable();
  });

  // Create the update_timestamp trigger
  await DB.raw(`
    CREATE TRIGGER update_text_sources_timestamp
    BEFORE UPDATE ON ${TEXT_SOURCES_TABLE}
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  `);
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(TEXT_SOURCES_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${TEXT_SOURCES_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${TEXT_SOURCES_TABLE} table...`);
      await createTable();

      
      console.log(
        `${TEXT_SOURCES_TABLE} table ${dropFirst ? "recreated" : "created"}`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${TEXT_SOURCES_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/text_sources.schema.ts       # Create table
   npx ts-node src/database/text_sources.schema.ts --drop # Recreate table
*/