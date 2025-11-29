// Represents a website source entity in the system
export interface WebsiteSource {
  // Fields from sources table
  id: number;
  agent_id: number;
  source_type: string;
  name: string;
  description?: string;
  status: "pending" | "processing" | "completed" | "failed";
  is_embedded: boolean;
  created_by: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: Date;

  // Fields from website_sources table
  source_id: number;
  url: string;
  crawl_depth: number;

  // Content fields (website-specific only)
  scraped_content?: string;

  // Status fields
  scraping_status: "pending" | "processing" | "completed" | "failed";
  scraping_error?: string;
  scraped_at?: Date;

  // Metrics
  content_length?: number;
  word_count?: number;
  pages_scraped: number;

  // Extracted data
  extracted_links?: string[];
}

// Input interface for creating a website source
export interface WebsiteSourceInput {
  source_id: number;
  url: string;
  crawl_depth?: number;
}

// Input interface for updating a website source
export interface WebsiteSourceUpdateInput {
  name?: string;
  description?: string;
  url?: string;
  crawl_depth?: number;
}
// Represents a QA source entity in the system
export interface QASource {
  id: number;
  source_id: number;
  question: string;
  answer: string;
}

export interface QAPair {
  question: string;
  answer: string;
}

// Input interface for creating a QA source
export interface QASourceInput {
  source_id: number;
  question: string;
  answer: string;
}

// Input interface for updating a QA source
export interface QASourceUpdateInput {
  question?: string;
  answer?: string;
}
// Represents a text source entity in the system
export interface TextSource {
  // Fields from sources table
  id: number;
  agent_id: number;
  source_type: string;
  name: string;
  description?: string;
  status: "pending" | "processing" | "completed" | "failed";
  is_embedded: boolean;
  created_by: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  // Fields from text_sources table
  source_id: number;
  content: string;
}

// Input interface for creating a text source
export interface TextSourceInput {
  source_id: number;
  content: string;
}

// Input interface for updating a text source
export interface TextSourceUpdateInput {
  content?: string;
}
// Represents a database source entity in the system
export interface DatabaseSource {
  id: number;
  source_id: number;
  db_host: string;
  db_port: number;
  db_user: string;
  db_password: string;
  db_name: string;
  connection_string: string;
  schema_name?: string;
}

// Input interface for creating a database source
export interface DatabaseSourceInput {
  source_id: number;
  db_host: string;
  db_port: number;
  db_user: string;
  db_password: string;
  db_name: string;
  connection_string: string;
  schema_name?: string;
}

// Input interface for updating a database source
export interface DatabaseSourceUpdateInput {
  name?: string;
  description?: string;
  db_host?: string;
  db_port?: number;
  db_user?: string;
  db_password?: string;
  db_name?: string;
  connection_string?: string;
  schema_name?: string;
}
// Represents a file source entity in the system
export interface FileSource {
  id: number;
  source_id: number;
  file_url: string;
  mime_type?: string;
  file_size: number;
  text_content?: string;
}
// Input interface for creating a file source
export interface FileSourceInput {
  source_id: number;
  file_url: string;
  mime_type?: string;
  file_size?: number;
  text_content?: string;
}

// Input interface for updating a file source
export interface FileSourceUpdateInput {
  file_url?: string;
  mime_type?: string;
  file_size?: number;
  text_content?: string;
}
export interface Source {
  id: number;
  agent_id: number;
  source_type: "file" | "text" | "website" | "database" | "qa";
  name: string;
  description?: string;
  status: "pending" | "processing" | "completed" | "failed";
  is_embedded: boolean;
  created_by: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: Date;
}

// Input interface for creating a base source
export interface SourceInput {
  agent_id: number;
  source_type: "file" | "text" | "website" | "database" | "qa";
  name: string;
  description?: string;
}

// Input interface for updating a base source
export interface SourceUpdateInput {
  name?: string;
  description?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  is_embedded?: boolean;
}
