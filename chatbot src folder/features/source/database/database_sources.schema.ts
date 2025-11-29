import DB from "../../../../database/index.schema";

export const DATABASE_SOURCES_TABLE = "database_sources";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(DATABASE_SOURCES_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("source_id")
      .notNullable()
      .references("id")
      .inTable("sources")
      .onDelete("CASCADE");
    table.string("db_host").notNullable();
    table.integer("db_port").notNullable();
    table.string("db_user").notNullable();

    // Encrypted password fields
    table.text("encrypted_password").notNullable();
    table.string("password_salt", 64).notNullable();
    table.string("password_iv", 32).notNullable();

    table.string("db_name").notNullable();

    // Encrypted connection string fields (optional)
    table.text("encrypted_connection_string").nullable();
    table.string("connection_string_salt", 64).nullable();
    table.string("connection_string_iv", 32).nullable();

    table.string("schema_name").nullable();

    // Legacy fields (to be removed after migration)
    table.string("db_password").nullable();
    table.string("connection_string").nullable();

    // Connection metadata
    table.boolean("connection_tested").defaultTo(false);
    table.timestamp("last_connection_test").nullable();
    table.text("last_connection_error").nullable();

    // Schema management for simplified database querying
    table.jsonb("trained_tables").defaultTo("[]");
    table.timestamp("last_schema_update").nullable();
  });

  // Note: No timestamp trigger needed - audit fields are in sources table
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(DATABASE_SOURCES_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${DATABASE_SOURCES_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${DATABASE_SOURCES_TABLE} table...`);
      await createTable();

      
      console.log(
        `${DATABASE_SOURCES_TABLE} table ${
          dropFirst ? "recreated" : "created"
        }`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${DATABASE_SOURCES_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/database_sources.schema.ts       # Create table
   npx ts-node src/database/database_sources.schema.ts --drop # Recreate table
*/