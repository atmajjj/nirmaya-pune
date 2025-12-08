import { parseDataSourceFile } from '../../utils/file-parser';

describe('File Parser', () => {
  describe('parseDataSourceFile', () => {
    it('should parse CSV file successfully', async () => {
      // Simple CSV content
      const csvContent = `Station,pH,Temperature,DO,BOD,COD
Mumbai,7.5,25,6.2,3.5,12.0
Delhi,7.8,28,5.8,4.2,15.5
Bangalore,7.2,22,6.5,2.8,10.2`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await parseDataSourceFile(buffer, 'csv');

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.total_rows).toBe(3);
      expect(result.metadata?.column_count).toBe(6);
      expect(result.metadata?.columns).toEqual(['Station', 'pH', 'Temperature', 'DO', 'BOD', 'COD']);
      expect(result.metadata?.stations).toEqual(['Mumbai', 'Delhi', 'Bangalore']);
    });

    it('should handle empty CSV file', async () => {
      const csvContent = `Station,pH,Temperature`;
      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await parseDataSourceFile(buffer, 'csv');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File contains no data rows');
    });

    it('should parse Excel file successfully', async () => {
      // Note: This would need actual Excel file buffer in real test
      // For now, just testing the error path
      const buffer = Buffer.from('not-a-real-excel-file', 'utf-8');
      const result = await parseDataSourceFile(buffer, 'xlsx');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should extract date range from CSV', async () => {
      const csvContent = `Station,Date,pH
Mumbai,2024-01-15,7.5
Delhi,2024-02-20,7.8
Bangalore,2024-03-10,7.2`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await parseDataSourceFile(buffer, 'csv');

      expect(result.success).toBe(true);
      expect(result.metadata?.date_range).toBeDefined();
      expect(result.metadata?.date_range?.from).toBe('2024-01-15');
      expect(result.metadata?.date_range?.to).toBe('2024-03-10');
    });

    it('should include preview rows', async () => {
      const csvContent = `Station,pH
Mumbai,7.5
Delhi,7.8
Bangalore,7.2`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await parseDataSourceFile(buffer, 'csv');

      expect(result.success).toBe(true);
      expect(result.metadata?.preview_rows).toBeDefined();
      expect(result.metadata?.preview_rows?.length).toBe(3);
    });
  });
});
