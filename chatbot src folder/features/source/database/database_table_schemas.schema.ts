import DB from "../../../../database/index.schema";

export const DATABASE_TABLE_SCHEMAS_TABLE = "database_table_schemas";

export interface DatabaseTableSchema {
  id: number;
  database_source_id: number; // References database_sources.id
  table_name: string;
  schema_name: string;
  columns: any; // JSON object containing the table columns
  relationships: any[]; // JSON array of relationships
  indexes: any[]; // JSON array of indexes
  sample_data?: any; // JSON object with sample data
  business_description?: string;
  row_count?: number;
  table_size?: string;
  vector_embedding?: any;
  training_status: "pending" | "training" | "completed" | "failed";
  training_started_at?: Date;
  training_completed_at?: Date;
  training_error?: string;
  last_accessed_at?: Date;
  access_count: number;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
}

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(DATABASE_TABLE_SCHEMAS_TABLE, (table) => {
    // Primary key
    table.increments("id").primary();

    // Foreign key to database_sources table
    table
      .integer("database_source_id")
      .notNullable()
      .references("id")
      .inTable("database_sources")
      .onDelete("CASCADE");

    // Table identification
    table.string("table_name", 255).notNullable();
    table.string("schema_name", 255).notNullable().defaultTo("public");

    // Schema data stored as JSON
    table.jsonb("columns").notNullable();
    table.jsonb("relationships").notNullable().defaultTo("[]");
    table.jsonb("indexes").notNullable().defaultTo("[]");
    table.jsonb("sample_data").nullable();

    // Business context
    table.text("business_description").nullable();

    // Table statistics
    table.bigInteger("row_count").nullable();
    table.string("table_size", 50).nullable();

    // Vector embeddings for semantic search
    table.jsonb("vector_embedding").nullable();

    // Training status and metadata
    table
      .enum("training_status", ["pending", "training", "completed", "failed"])
      .notNullable()
      .defaultTo("pending");
    table.timestamp("training_started_at").nullable();
    table.timestamp("training_completed_at").nullable();
    table.text("training_error").nullable();

    // Access tracking
    table.timestamp("last_accessed_at").nullable();
    table.integer("access_count").notNullable().defaultTo(0);

    // Audit fields
    table.integer("created_by").notNullable();
    table.integer("updated_by").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(DB.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(DB.fn.now());
  });

  // Note: No timestamp trigger needed - audit fields are managed manually
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(DATABASE_TABLE_SCHEMAS_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");

  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${DATABASE_TABLE_SCHEMAS_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${DATABASE_TABLE_SCHEMAS_TABLE} table...`);
      await createTable();

      console.log(
        `${DATABASE_TABLE_SCHEMAS_TABLE} table ${
          dropFirst ? "recreated" : "created"
        }`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${DATABASE_TABLE_SCHEMAS_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}
