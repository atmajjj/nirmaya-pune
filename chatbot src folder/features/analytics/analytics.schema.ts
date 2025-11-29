import DB from "../../../database/index.schema";

export const USER_ACTIVITY_EVENTS_TABLE = "user_activity_events";
export const CHAT_ANALYTICS_TABLE = "chat_analytics";
export const AGENT_PERFORMANCE_METRICS_TABLE = "agent_performance_metrics";
export const SYSTEM_PERFORMANCE_METRICS_TABLE = "system_performance_metrics";

// User Activity Events Table
export const createUserActivityEventsTable = async () => {
  await DB.schema.createTable(USER_ACTIVITY_EVENTS_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("event_type", 50).notNullable(); // 'login', 'logout', 'chat_send', 'agent_create', etc.
    table.jsonb("event_data").notNullable();
    table.string("session_id", 255).nullable();
    table.specificType("ip_address", "INET").nullable();
    table.text("user_agent").nullable();
    table.timestamp("created_at").defaultTo(DB.fn.now());
  });

  // Create indexes for performance
  await DB.raw(`
    CREATE INDEX idx_user_activity_events_user_id_created_at 
    ON ${USER_ACTIVITY_EVENTS_TABLE}(user_id, created_at);
  `);
  
  await DB.raw(`
    CREATE INDEX idx_user_activity_events_event_type_created_at 
    ON ${USER_ACTIVITY_EVENTS_TABLE}(event_type, created_at);
  `);
};

// Chat Analytics Table
export const createChatAnalyticsTable = async () => {
  await DB.schema.createTable(CHAT_ANALYTICS_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .integer("agent_id")
      .notNullable()
      .references("id")
      .inTable("agents")
      .onDelete("CASCADE");
    table
      .integer("session_id")
      .notNullable()
      .references("id")
      .inTable("chat_sessions")
      .onDelete("CASCADE");
    table.integer("message_count").defaultTo(0);
    table.integer("session_duration_seconds").nullable();
    table.boolean("context_used").defaultTo(false);
    table.integer("context_length").defaultTo(0);
    table.boolean("source_first_blocked").defaultTo(false);
    table.integer("response_time_ms").nullable();
    table.decimal("cost_estimate", 10, 6).nullable();
    table.integer("user_satisfaction_score").nullable(); // 1-5 scale
    table.timestamp("created_at").defaultTo(DB.fn.now());
  });

  // Create indexes for performance
  await DB.raw(`
    CREATE INDEX idx_chat_analytics_agent_id_created_at 
    ON ${CHAT_ANALYTICS_TABLE}(agent_id, created_at);
  `);
  
  await DB.raw(`
    CREATE INDEX idx_chat_analytics_user_id_created_at 
    ON ${CHAT_ANALYTICS_TABLE}(user_id, created_at);
  `);
};

// Agent Performance Metrics Table
export const createAgentPerformanceMetricsTable = async () => {
  await DB.schema.createTable(AGENT_PERFORMANCE_METRICS_TABLE, (table) => {
    table.increments("id").primary();
    table
      .integer("agent_id")
      .notNullable()
      .references("id")
      .inTable("agents")
      .onDelete("CASCADE");
    table.date("date").notNullable();
    table.integer("total_chats").defaultTo(0);
    table.integer("total_messages").defaultTo(0);
    table.decimal("avg_response_time_ms", 10, 2).nullable();
    table.bigInteger("total_tokens_consumed").defaultTo(0);
    table.decimal("total_cost", 10, 6).nullable();
    table.integer("source_first_blocks").defaultTo(0);
    table.integer("error_count").defaultTo(0);
    table.decimal("avg_satisfaction_score", 3, 2).nullable();
    table.timestamp("created_at").defaultTo(DB.fn.now());
    
    // Unique constraint to prevent duplicate daily records
    table.unique(["agent_id", "date"]);
  });

  // Create indexes for performance
  await DB.raw(`
    CREATE INDEX idx_agent_performance_metrics_date 
    ON ${AGENT_PERFORMANCE_METRICS_TABLE}(date);
  `);
};

// System Performance Metrics Table
export const createSystemPerformanceMetricsTable = async () => {
  await DB.schema.createTable(SYSTEM_PERFORMANCE_METRICS_TABLE, (table) => {
    table.increments("id").primary();
    table.string("metric_name", 50).notNullable();
    table.decimal("metric_value", 15, 6).notNullable();
    table.string("metric_unit", 20).notNullable();
    table.jsonb("metric_tags").nullable();
    table.timestamp("recorded_at").defaultTo(DB.fn.now());
  });

  // Create indexes for performance
  await DB.raw(`
    CREATE INDEX idx_system_performance_metrics_name_recorded_at 
    ON ${SYSTEM_PERFORMANCE_METRICS_TABLE}(metric_name, recorded_at);
  `);
};

// Create all analytics tables
export const createAnalyticsTables = async () => {
  console.log("Creating analytics tables...");
  
  await createUserActivityEventsTable();
  console.log(`✓ ${USER_ACTIVITY_EVENTS_TABLE} table created`);
  
  await createChatAnalyticsTable();
  console.log(`✓ ${CHAT_ANALYTICS_TABLE} table created`);
  
  await createAgentPerformanceMetricsTable();
  console.log(`✓ ${AGENT_PERFORMANCE_METRICS_TABLE} table created`);
  
  await createSystemPerformanceMetricsTable();
  console.log(`✓ ${SYSTEM_PERFORMANCE_METRICS_TABLE} table created`);
  
  console.log("All analytics tables created successfully!");
};

// Drop all analytics tables
export const dropAnalyticsTables = async () => {
  console.log("Dropping analytics tables...");
  
  await DB.schema.dropTableIfExists(SYSTEM_PERFORMANCE_METRICS_TABLE);
  console.log(`✓ ${SYSTEM_PERFORMANCE_METRICS_TABLE} table dropped`);
  
  await DB.schema.dropTableIfExists(AGENT_PERFORMANCE_METRICS_TABLE);
  console.log(`✓ ${AGENT_PERFORMANCE_METRICS_TABLE} table dropped`);
  
  await DB.schema.dropTableIfExists(CHAT_ANALYTICS_TABLE);
  console.log(`✓ ${CHAT_ANALYTICS_TABLE} table dropped`);
  
  await DB.schema.dropTableIfExists(USER_ACTIVITY_EVENTS_TABLE);
  console.log(`✓ ${USER_ACTIVITY_EVENTS_TABLE} table dropped`);
  
  console.log("All analytics tables dropped successfully!");
};

// For individual table migration (when run directly)
if (require.main === module) {
  const dropFirst = process.argv.includes("--drop");
  
  (async () => {
    try {
      if (dropFirst) {
        await dropAnalyticsTables();
      }
      await createAnalyticsTables();
      process.exit(0);
    } catch (error) {
      console.error("Error with analytics tables:", error);
      process.exit(1);
    }
  })();
}

/* Usage:
   npx tsx src/features/analytics/analytics.schema.ts       # Create tables
   npx tsx src/features/analytics/analytics.schema.ts --drop # Recreate tables
*/