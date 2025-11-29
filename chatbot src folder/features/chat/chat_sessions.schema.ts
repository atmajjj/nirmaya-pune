import DB from "../../../database/index.schema";

export const CHAT_SESSIONS_TABLE = "chat_sessions";

// Schema Definition
export const createTable = async () => {
  await DB.schema.createTable(CHAT_SESSIONS_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("agent_id")
      .notNullable()
      .references("id")
      .inTable("agents")
      .onDelete("CASCADE");
    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(DB.fn.now());
  });
};

// Drop Table
export const dropTable = async () => {
  await DB.schema.dropTableIfExists(CHAT_SESSIONS_TABLE);
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        console.log(`Dropping ${CHAT_SESSIONS_TABLE} table...`);
        await dropTable();
      }
      console.log(`Creating ${CHAT_SESSIONS_TABLE} table...`);
      await createTable();

      
      console.log(
        `${CHAT_SESSIONS_TABLE} table ${dropFirst ? "recreated" : "created"}`
      );
      process.exit(0);
    } catch (error) {
      console.error(`Error with ${CHAT_SESSIONS_TABLE} table:`, error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx ts-node src/database/chat_sessions.schema.ts       # Create table
   npx ts-node src/database/chat_sessions.schema.ts --drop # Recreate table
*/