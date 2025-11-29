import DB from "../../../../database/index.schema";

export const QA_SOURCES_TABLE = "qa_sources";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(QA_SOURCES_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("source_id")
      .notNullable()
      .references("id")
      .inTable("sources")
      .onDelete("CASCADE");
    table.text("question").notNullable();
    table.text("answer").notNullable();
  });

  // Create the update_timestamp trigger
  await DB.raw(`
    CREATE TRIGGER update_qa_sources_timestamp
    BEFORE UPDATE ON ${QA_SOURCES_TABLE}
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  `);
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(QA_SOURCES_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${QA_SOURCES_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${QA_SOURCES_TABLE} table...`);
      await createTable();

      
      console.log(
        `${QA_SOURCES_TABLE} table ${dropFirst ? "recreated" : "created"}`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${QA_SOURCES_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/qa_sources.schema.ts       # Create table
   npx ts-node src/database/qa_sources.schema.ts --drop # Recreate table
*/