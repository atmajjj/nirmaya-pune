# Simplified Database Sources Implementation Plan

## 🎯 Overview

Implement a **simple, focused database querying system** following existing codebase patterns where users can:

1. Connect to their database
2. Select specific tables to work with
3. Train the system on table schemas only
4. Ask natural language questions about their data

## 🏗️ Architecture: Aligned with Existing Patterns

### Core Principle

**Store schemas, not data** - We embed table structure information, then generate SQL queries dynamically.

### 🔍 Analysis of Existing Architecture Patterns

**Vector Service Pattern**:

- Uses namespace isolation: `user_${userId}_agent_${agentId}`
- Upserts records with `IVectorRecord` interface
- Methods: `upsertRecords()`, `searchSimilar()`, `deleteAgentVectors()`

**Training Service Pattern**:

- BullMQ queue system with Redis backend
- Service methods: `trainAgent()`, `getTrainingStatus()`, `updateAgentTrainingStatus()`
- Worker processes jobs with progress updates (0-100%)
- Source extraction pattern via `SourceExtractorService`

**Source Service Pattern**:

- Base service with CRUD operations in `source.service.ts`
- Specialized services (TextSourceService, etc.) in subfolders
- Transaction-based operations with audit fields
- Status flow: `pending` → `completed` → `is_embedded: true`

**Chat Integration Pattern**:

- Cached agent data (5-minute TTL)
- Vector context via `getRelevantContext()`
- Streaming responses with AI SDK

### User Workflow

```
1. User enters DB connection details → Test & Save Connection
2. User specifies table name → Fetch Table Schema
3. User clicks "Train" → Store Schema in Vectors (follows existing training pattern)
4. User asks questions → Generate SQL → Execute → Return Results (integrates with chat)
```

## 📋 Implementation Plan - Atomic Steps

### Phase 1: Table Schema Management Service

#### Step 1.1: Create Table Schema Service ✨

**File**: `src/features/source/database/table-schema.service.ts`
**Purpose**: Fetch and manage table schemas following existing database connection patterns

```typescript
interface TableSchema {
  source_id: number;
  table_name: string;
  columns: TableColumn[];
  relationships: TableRelationship[];
  indexes: string[];
  sample_data?: any[]; // Optional: 2-3 rows for context
  business_description?: string;
}

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key?: {
    references_table: string;
    references_column: string;
  };
  description?: string;
}
```

**Methods** (following existing service patterns):

- `fetchTableSchema(sourceId: number, tableName: string): Promise<TableSchema>`
- `validateTableExists(sourceId: number, tableName: string): Promise<boolean>`
- `getTableSampleData(sourceId: number, tableName: string, limit = 3): Promise<any[]>`
- `generateBusinessContext(schema: TableSchema): Promise<string>`

#### Step 1.2: Create Database Table Storage Schema

**File**: `database/database-table-schemas.migration.ts`
**Purpose**: Store table metadata following existing schema patterns

```sql
CREATE TABLE database_table_schemas (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
  table_name VARCHAR(255) NOT NULL,
  schema_data JSONB NOT NULL, -- Full TableSchema object
  business_context TEXT, -- Generated description for embeddings
  is_trained BOOLEAN DEFAULT FALSE, -- Following is_embedded pattern
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER,
  UNIQUE(source_id, table_name)
);
```

### Phase 2: Schema Vector Storage (Following Existing Vector Patterns)

#### Step 2.1: Database Schema Vector Service ✨

**File**: `src/features/source/database/database-schema-vector.service.ts`
**Purpose**: Handle schema vectorization following existing `VectorService` patterns

```typescript
interface DatabaseSchemaVector extends IVectorRecord {
  id: string; // Format: `db_${sourceId}_table_${tableName}`
  metadata: {
    source_id: number;
    table_name: string;
    column_names: string[];
    data_types: string[];
    relationships: string[];
    business_context: string;
    agent_id: number;
  };
}
```

**Methods** (following VectorService pattern):

- `upsertTableSchema(schema: TableSchema, userId: number, agentId: number): Promise<void>`
- `searchRelevantTables(query: string, userId: number, agentId: number): Promise<TableSchema[]>`
- `deleteTableSchema(sourceId: number, tableName: string, userId: number, agentId: number): Promise<void>`

**Integration**: Uses existing `VectorService.upsertRecords()` with namespace `user_${userId}_agent_${agentId}_db`

#### Step 2.2: Update Existing Database Source Service

**File**: `src/features/source/database/database-source.service.ts`
**Purpose**: Add table management methods to existing service

**New Methods**:

- `getTrainedTables(sourceId: number): Promise<string[]>`
- `addTrainedTable(sourceId: number, tableName: string): Promise<void>`
- `removeTrainedTable(sourceId: number, tableName: string): Promise<void>`

### Phase 3: Schema Training System (Following Existing Training Patterns)

#### Step 3.1: Database Schema Training Service ✨

**File**: `src/features/source/database/database-schema-training.service.ts`
**Purpose**: Handle schema training following `AgentTrainingService` patterns

```typescript
interface DatabaseTrainingJobData {
  sourceId: number;
  tableName: string;
  userId: number;
  agentId: number;
  trainingType: "new_table" | "retrain_table";
}
```

**Methods** (following existing training patterns):

- `trainTableSchema(sourceId: number, tableName: string, userId: number, agentId: number): Promise<TrainingJobResult>`
- `getSchemaTrainingStatus(sourceId: number, tableName: string): Promise<TrainingStatus>`
- `retrainTableSchema(sourceId: number, tableName: string, userId: number, agentId: number): Promise<void>`

**Integration**:

- Extends existing BullMQ queue system
- Uses `database-schema-training` queue name
- Follows same worker pattern as existing training

#### Step 3.2: Database Schema Extractor ✨

**File**: `src/features/source/database/database-schema-extractor.service.ts`
**Purpose**: Extract schemas following `SourceExtractorService` patterns

**Methods**:

- `extractTableSchema(sourceId: number, tableName: string): Promise<ExtractedSchema>`
- `transformSchemaToVector(schema: TableSchema): Promise<IVectorRecord>`
- `markTableAsTrained(sourceId: number, tableName: string): Promise<void>`

### Phase 4: Natural Language SQL Generation

#### Step 4.1: Database Query Generator Service ✨

**File**: `src/features/source/database/database-query-generator.service.ts`
**Purpose**: Generate SQL from natural language using schema context

```typescript
interface SQLGenerationResult {
  sql: string;
  confidence: number;
  explanation: string;
  table_used: string;
  safety_warnings?: string[];
  estimated_rows?: number;
}
```

**Methods**:

- `generateSQLFromNaturalLanguage(query: string, userId: number, agentId: number): Promise<SQLGenerationResult>`
- `validateSQLSafety(sql: string): Promise<boolean>`
- `optimizeSQL(sql: string): Promise<string>`

**Integration**:

- Uses existing `languageModels` from providers
- Integrates with schema vector search
- Follows existing AI service patterns

#### Step 4.2: Database Query Executor Service ✨

**File**: `src/features/source/database/database-query-executor.service.ts`  
**Purpose**: Execute SQL safely following existing database connection patterns

```typescript
interface QueryExecutionResult {
  success: boolean;
  data: any[];
  row_count: number;
  execution_time_ms: number;
  generated_sql: string;
  table_used: string;
  error?: string;
}
```

**Methods**:

- `executeQuery(sourceId: number, sql: string): Promise<QueryExecutionResult>`
- `validateQuerySafety(sql: string): Promise<boolean>`
- `formatResults(data: any[]): Promise<any[]>`

### Phase 5: API Integration (Following Existing Controller Patterns)

#### Step 5.1: Add New Controller Methods

**File**: `src/features/source/database/database-source.controller.ts`
**Purpose**: Add new endpoints following existing controller patterns

**New Methods**:

```typescript
public getTableSchema = async (req: Request, res: Response, next: NextFunction) => {}
public trainTableSchema = async (req: Request, res: Response, next: NextFunction) => {}
public getTrainedTables = async (req: Request, res: Response, next: NextFunction) => {}
public executeNaturalLanguageQuery = async (req: Request, res: Response, next: NextFunction) => {}
```

#### Step 5.2: Update Routes

**File**: `src/features/source/database/database-source.route.ts`
**Purpose**: Add new routes following existing patterns

**New Routes**:

```typescript
// Table schema management
GET    /api/v1/sources/database/:sourceId/tables/:tableName/schema
POST   /api/v1/sources/database/:sourceId/tables/:tableName/train
GET    /api/v1/sources/database/:sourceId/trained-tables

// Natural language querying
POST   /api/v1/sources/database/:sourceId/query
GET    /api/v1/sources/database/:sourceId/query-history
```

### Phase 6: Chat Integration (Following Existing Chat Patterns)

#### Step 6.1: Database Chat Integration Service ✨

**File**: `src/features/source/database/database-chat-integration.service.ts`
**Purpose**: Integrate with existing chat system

**Methods**:

- `handleDatabaseQuery(message: string, userId: number, agentId: number): Promise<string>`
- `getDatabaseContext(query: string, userId: number, agentId: number): Promise<string>`
- `formatDatabaseResponse(result: QueryExecutionResult): Promise<string>`

**Integration**:

- Extends existing `ChatService.getRelevantContext()`
- Uses existing agent caching pattern
- Follows streaming response pattern

### Phase 7: Testing (Following Existing Test Patterns)

#### Step 7.1: Create Test Scripts

**File**: `scripts/test-database-schema-workflow.ts`
**Purpose**: End-to-end testing following existing test script patterns

**Test Scenarios**:

- Database connection → schema fetch → training → querying
- Multiple table training and querying
- Error handling and edge cases
- Performance testing with large schemas

## 🔧 Technical Implementation Details

### Database Schema Updates

```sql
-- Add to existing database_sources table
ALTER TABLE database_sources ADD COLUMN trained_tables JSONB DEFAULT '[]';
ALTER TABLE database_sources ADD COLUMN last_schema_update TIMESTAMP;

-- New table for schema storage
CREATE TABLE database_table_schemas (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
  table_name VARCHAR(255) NOT NULL,
  schema_data JSONB NOT NULL,
  business_context TEXT,
  is_trained BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER,
  UNIQUE(source_id, table_name)
);
```

### Vector Namespace Strategy

- **Pattern**: `user_${userId}_agent_${agentId}_db`
- **Vector IDs**: `db_${sourceId}_table_${tableName}`
- **Metadata**: Schema info, relationships, business context

### Queue Integration

- **Queue Name**: `database-schema-training`
- **Job Types**: `train_table_schema`, `retrain_table_schema`
- **Progress Updates**: 0% → 25% (fetch) → 50% (analyze) → 75% (vectorize) → 100% (complete)

### Safety Measures

- **SQL Validation**: Only SELECT statements allowed
- **Query Timeouts**: 30-second maximum execution
- **Result Limits**: Maximum 1000 rows returned
- **Connection Security**: Read-only user recommended
- **Query Sanitization**: Parameterized queries only

## 🚀 Implementation Benefits

### ✅ Architectural Consistency

- Follows existing service patterns
- Uses established vector namespace isolation
- Integrates with existing training queue system
- Maintains audit trail patterns

### ✅ Performance Optimized

- Cached schema data (5-minute TTL like agents)
- Lightweight vector storage (schemas only)
- Background training jobs
- Efficient SQL generation

### ✅ User Experience

- Simple workflow: connect → select table → train → query
- Real-time training progress
- Transparent SQL generation
- Safe query execution

## 📝 Implementation Priority

### Phase 1 (Core Foundation) - Week 1

- [x] Database connection infrastructure (existing)
- [ ] Table Schema Service
- [ ] Database Table Storage Schema

### Phase 2 (Vector Integration) - Week 1

- [ ] Database Schema Vector Service
- [ ] Update Database Source Service

### Phase 3 (Training System) - Week 2

- [ ] Database Schema Training Service
- [ ] Database Schema Extractor
- [ ] Queue Integration

### Phase 4 (Query Generation) - Week 2

- [ ] Database Query Generator Service
- [ ] Database Query Executor Service

### Phase 5 (API Layer) - Week 3

- [ ] Controller Methods
- [ ] Route Updates
- [ ] API Documentation

### Phase 6 (Chat Integration) - Week 3

- [ ] Database Chat Integration Service
- [ ] Chat Service Updates

### Phase 7 (Testing) - Week 4

- [ ] Unit Tests
- [ ] Integration Tests
- [ ] End-to-End Test Scripts

---

## 📋 Next Steps

**Ready for atomic implementation!** Each phase builds on existing patterns and can be implemented incrementally.

**Starting Point**: Phase 1, Step 1.1 - Create Table Schema Service

This approach ensures **consistency with existing codebase architecture** while keeping the solution **simple and focused**.
