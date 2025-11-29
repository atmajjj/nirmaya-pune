import DB from "../../../../database/index.schema";

export const FILE_SOURCES_TABLE = "file_sources";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(FILE_SOURCES_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("source_id")
      .notNullable()
      .references("id")
      .inTable("sources")
      .onDelete("CASCADE");
    table.text("file_url").notNullable();
    table.text("mime_type").nullable();
    table.bigInteger("file_size").defaultTo(0);
    table.text("text_content").nullable(); // Store extracted text content for vector embeddings
  });

  // Create the update_timestamp trigger with table-specific name
  await DB.raw(`
    CREATE TRIGGER update_file_sources_timestamp
    BEFORE UPDATE ON ${FILE_SOURCES_TABLE}
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  `);
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(FILE_SOURCES_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${FILE_SOURCES_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${FILE_SOURCES_TABLE} table...`);
      await createTable();

      
      console.log(
        `${FILE_SOURCES_TABLE} table ${dropFirst ? "recreated" : "created"}`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${FILE_SOURCES_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/file_sources.schema.ts       # Create table
   npx ts-node src/database/file_sources.schema.ts --drop # Recreate table
*/