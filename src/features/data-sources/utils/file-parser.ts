import * as XLSX from 'xlsx';
import { logger } from '../../../utils/logger';

export interface ParsedFileMetadata {
  total_rows: number;
  column_count: number;
  columns: string[];
  stations?: string[];
  date_range?: {
    from?: string;
    to?: string;
  };
  preview_rows?: any[];
}

export interface FileParseResult {
  success: boolean;
  metadata?: ParsedFileMetadata;
  error?: string;
}

/**
 * Parse CSV file using native approach (no external library dependency)
 */
async function parseCSV(buffer: Buffer): Promise<ParsedFileMetadata> {
  try {
    logger.info('Starting CSV parse with native parser...');
    const csvString = buffer.toString('utf-8');
    
    // Split into lines and filter empty
    const lines = csvString.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse header (first line)
    const headerLine = lines[0];
    const columns = parseCSVLine(headerLine);
    
    if (columns.length === 0) {
      throw new Error('CSV file has no columns');
    }
    
    logger.info(`Parsed ${columns.length} columns from CSV header`);
    
    // Parse data rows
    const dataRows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length > 0 && values.some(v => v)) {
        const row: any = {};
        columns.forEach((col, idx) => {
          row[col] = values[idx] || '';
        });
        dataRows.push(row);
      }
    }
    
    logger.info(`Parsed ${dataRows.length} data rows from CSV`);
    
    // Extract stations
    let stations: string[] | undefined;
    const stationCol = columns.find(col => 
      col.toLowerCase() === 'station' || 
      col.toLowerCase() === 'station_name' ||
      col.toLowerCase() === 'station_id'
    );
    
    if (stationCol && dataRows.length > 0) {
      const stationSet = new Set<string>();
      dataRows.forEach(row => {
        if (row[stationCol]) {
          stationSet.add(String(row[stationCol]).trim());
        }
      });
      stations = Array.from(stationSet);
      logger.info(`Extracted ${stations.length} unique stations`);
    }
    
    // Extract date range
    let dateRange: { from?: string; to?: string } | undefined;
    const dateCol = columns.find(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase() === 'timestamp'
    );
    
    if (dateCol && dataRows.length > 0) {
      const dates = dataRows
        .map(row => row[dateCol])
        .filter(d => d)
        .sort();
      
      if (dates.length > 0) {
        dateRange = {
          from: dates[0],
          to: dates[dates.length - 1]
        };
        logger.info(`Date range: ${dateRange.from} to ${dateRange.to}`);
      }
    }
    
    // Get preview rows (first 5)
    const preview_rows = dataRows.slice(0, 5);
    
    return {
      total_rows: dataRows.length,
      column_count: columns.length,
      columns,
      stations,
      date_range: dateRange,
      preview_rows
    };
  } catch (error: any) {
    logger.error('CSV parsing error:', error);
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

/**
 * Parse Excel file (.xls or .xlsx) and extract metadata
 */
async function parseExcel(buffer: Buffer): Promise<ParsedFileMetadata> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }
    
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (data.length === 0) {
      throw new Error('Excel sheet is empty');
    }
    
    // First row is headers
    const headers = data[0] as string[];
    const columns = headers.map(h => String(h || '').trim()).filter(h => h);
    
    // Data rows (excluding header)
    const dataRows = data.slice(1).filter(row => 
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );
    
    // Convert to object format for easier processing
    const objectData = dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        if (header) {
          obj[header] = row[index];
        }
      });
      return obj;
    });
    
    // Extract stations
    let stations: string[] | undefined;
    const stationCol = headers.find(col => 
      col.toLowerCase() === 'station' || col.toLowerCase() === 'station_name'
    );
    
    if (stationCol && objectData.length > 0) {
      const stationSet = new Set<string>();
      objectData.forEach(row => {
        if (row[stationCol]) {
          stationSet.add(String(row[stationCol]).trim());
        }
      });
      stations = Array.from(stationSet);
    }
    
    // Extract date range
    let dateRange: { from?: string; to?: string } | undefined;
    const dateCol = headers.find(col => 
      col.toLowerCase().includes('date') || col.toLowerCase() === 'timestamp'
    );
    
    if (dateCol && objectData.length > 0) {
      const dates = objectData
        .map(row => row[dateCol])
        .filter(d => d)
        .map(d => {
          // Handle Excel date serial numbers
          if (typeof d === 'number') {
            const date = XLSX.SSF.parse_date_code(d);
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          }
          return String(d);
        })
        .sort();
      
      if (dates.length > 0) {
        dateRange = {
          from: dates[0],
          to: dates[dates.length - 1]
        };
      }
    }
    
    // Get preview rows (first 5)
    const preview_rows = objectData.slice(0, 5);
    
    return {
      total_rows: dataRows.length,
      column_count: columns.length,
      columns,
      stations,
      date_range: dateRange,
      preview_rows
    };
  } catch (error: any) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Parse uploaded file (CSV or Excel) and extract metadata
 */
export async function parseDataSourceFile(
  buffer: Buffer,
  fileType: 'csv' | 'xlsx' | 'xls'
): Promise<FileParseResult> {
  try {
    logger.info(`Parsing ${fileType} file...`);
    
    let metadata: ParsedFileMetadata;
    
    if (fileType === 'csv') {
      metadata = await parseCSV(buffer);
    } else {
      // Both .xls and .xlsx use the same parser
      metadata = await parseExcel(buffer);
    }
    
    // Validate parsed data
    if (metadata.total_rows === 0) {
      return {
        success: false,
        error: 'File contains no data rows'
      };
    }
    
    if (metadata.column_count === 0) {
      return {
        success: false,
        error: 'File contains no columns'
      };
    }
    
    logger.info(`Successfully parsed file: ${metadata.total_rows} rows, ${metadata.column_count} columns`);
    
    return {
      success: true,
      metadata
    };
  } catch (error: any) {
    logger.error(`File parsing error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to parse file'
    };
  }
}

/**
 * Validate that file has required columns for HMPI calculations
 * This is optional validation - can be used before marking file as 'available'
 */
export function validateHMPIColumns(columns: string[]): { valid: boolean; missing?: string[] } {
  // Common required parameters for water quality analysis
  const requiredParams = ['Station', 'pH', 'Temperature', 'DO', 'BOD', 'COD'];
  
  const normalizedColumns = columns.map(c => c.toLowerCase().trim());
  const missing: string[] = [];
  
  for (const param of requiredParams) {
    const found = normalizedColumns.some(col => 
      col === param.toLowerCase() || 
      col.includes(param.toLowerCase())
    );
    
    if (!found) {
      missing.push(param);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined
  };
}
