import DB from "../../../../database/index.schema";

export const WEBSITE_SOURCES_TABLE = "website_sources";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(WEBSITE_SOURCES_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("source_id")
      .notNullable()
      .references("id")
      .inTable("sources")
      .onDelete("CASCADE");
    table.text("url").notNullable();
    table.integer("crawl_depth").notNullable().defaultTo(1);

    // Content storage
    table.text("scraped_content").nullable();

    // Scraping status and metadata
    table.string("scraping_status").defaultTo("pending");
    table.text("scraping_error").nullable();
    table.timestamp("scraped_at").nullable();

    // Content metrics
    table.integer("content_length").nullable();
    table.integer("word_count").nullable();
    table.integer("pages_scraped").defaultTo(0);

    // Extracted data
    table.json("extracted_links").nullable();

    // Indexing for performance
    table.index(["scraping_status"]);
    table.index(["scraped_at"]);
  });
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(WEBSITE_SOURCES_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${WEBSITE_SOURCES_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${WEBSITE_SOURCES_TABLE} table...`);
      await createTable();

      
      console.log(
        `${WEBSITE_SOURCES_TABLE} table ${dropFirst ? "recreated" : "created"}`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${WEBSITE_SOURCES_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/features/source/website/website_sources.schema.ts       # Create table
   npx ts-node src/features/source/website/website_sources.schema.ts --drop # Recreate table
*/