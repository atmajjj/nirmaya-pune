/**
 * Unit tests for CSV Preview Service
 */

import { CSVPreviewService } from '../../services/csv-preview.service';

describe('CSVPreviewService', () => {
  describe('previewCSV', () => {
    it('should detect all available indices when CSV has all parameters', () => {
      const csvContent = Buffer.from(
        `station_id,latitude,longitude,state,city,As,Cu,Zn,Pb,Fe,pH,TDS,TH
Station1,28.5,77.2,Delhi,NewDelhi,15,50,100,5,200,7.5,300,250
Station2,28.6,77.3,Delhi,Gurgaon,20,60,120,8,180,7.2,350,280`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'test.csv');

      expect(result.filename).toBe('test.csv');
      expect(result.total_rows).toBe(2);
      expect(result.valid_rows).toBe(2);
      expect(result.can_proceed).toBe(true);
      
      // HPI should be available (5 metals detected)
      expect(result.available_calculations.hpi.available).toBe(true);
      expect(result.available_calculations.hpi.detected_count).toBe(5);
      
      // MI should be available (5 metals detected)
      expect(result.available_calculations.mi.available).toBe(true);
      
      // WQI should be available (Fe is shared between metals and WQI, so 4 params: pH, TDS, TH, Fe)
      expect(result.available_calculations.wqi.available).toBe(true);
      expect(result.available_calculations.wqi.detected_count).toBeGreaterThanOrEqual(3);
    });

    it('should detect only metal indices when CSV has only metal columns', () => {
      const csvContent = Buffer.from(
        `station,arsenic,copper,zinc,lead,cadmium
Site1,10,45,90,4,2
Site2,15,55,110,6,3`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'metals_only.csv');

      expect(result.available_calculations.hpi.available).toBe(true);
      expect(result.available_calculations.mi.available).toBe(true);
      expect(result.available_calculations.wqi.available).toBe(false);
      expect(result.can_proceed).toBe(true);
    });

    it('should detect only WQI when CSV has only WQI parameters', () => {
      const csvContent = Buffer.from(
        `location,ph,tds,total_hardness,calcium,magnesium
Sample1,7.0,400,300,80,35
Sample2,7.5,350,280,70,30`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'wqi_only.csv');

      expect(result.available_calculations.hpi.available).toBe(false);
      expect(result.available_calculations.mi.available).toBe(false);
      expect(result.available_calculations.wqi.available).toBe(true);
      expect(result.can_proceed).toBe(true);
    });

    it('should return can_proceed=false when no parameters detected', () => {
      const csvContent = Buffer.from(
        `name,value,category
Item1,100,A
Item2,200,B`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'invalid.csv');

      expect(result.available_calculations.hpi.available).toBe(false);
      expect(result.available_calculations.mi.available).toBe(false);
      expect(result.available_calculations.wqi.available).toBe(false);
      expect(result.can_proceed).toBe(false);
      expect(result.validation_warnings.length).toBeGreaterThan(0);
    });

    it('should detect location fields correctly', () => {
      const csvContent = Buffer.from(
        `station_id,lat,lng,state,district,As,Cu,Pb
S1,28.5,77.2,Delhi,Central,10,50,5
S2,28.6,77.3,UP,Noida,15,60,8`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'with_location.csv');

      expect(result.location_fields.station_id).toBe('station_id');
      expect(result.location_fields.latitude).toBe('lat');
      expect(result.location_fields.longitude).toBe('lng');
      expect(result.location_fields.state).toBe('state');
      expect(result.location_fields.city).toBe('district');
    });

    it('should warn when location fields are missing', () => {
      const csvContent = Buffer.from(
        `As,Cu,Pb,Zn
10,50,5,100
15,60,8,120`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'no_location.csv');

      const warnings = result.validation_warnings;
      expect(warnings.some(w => w.type === 'missing_location')).toBe(true);
    });

    it('should handle empty CSV', () => {
      const csvContent = Buffer.from('');

      const result = CSVPreviewService.previewCSV(csvContent, 'empty.csv');

      expect(result.total_rows).toBe(0);
      expect(result.can_proceed).toBe(false);
    });

    it('should handle CSV with headers only', () => {
      const csvContent = Buffer.from('station_id,As,Cu,Pb');

      const result = CSVPreviewService.previewCSV(csvContent, 'headers_only.csv');

      expect(result.total_rows).toBe(0);
      expect(result.can_proceed).toBe(false);
    });

    it('should detect metals with different naming conventions', () => {
      const csvContent = Buffer.from(
        `station,Arsenic,copper,Pb,chromium,NICKEL
S1,10,50,5,20,30
S2,15,60,8,25,35`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'mixed_names.csv');

      expect(result.available_calculations.hpi.available).toBe(true);
      expect(result.available_calculations.hpi.detected_count).toBe(5);
      
      // Check that detected parameters have correct info
      const hpiParams = result.available_calculations.hpi.parameters_detected;
      expect(hpiParams.some(p => p.symbol === 'As')).toBe(true);
      expect(hpiParams.some(p => p.symbol === 'Cu')).toBe(true);
      expect(hpiParams.some(p => p.symbol === 'Pb')).toBe(true);
      expect(hpiParams.some(p => p.symbol === 'Cr')).toBe(true);
      expect(hpiParams.some(p => p.symbol === 'Ni')).toBe(true);
    });

    it('should count valid rows correctly', () => {
      const csvContent = Buffer.from(
        `station,As,Cu,Pb
S1,10,50,5
S2,,,
S3,15,60,8
S4,N/A,invalid,text`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'partial_data.csv');

      expect(result.total_rows).toBe(4);
      expect(result.valid_rows).toBe(2); // Only S1 and S3 have valid numeric data
    });

    it('should report missing parameters', () => {
      const csvContent = Buffer.from(
        `station,As,Cu,Pb
S1,10,50,5`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'few_metals.csv');

      const hpiMissing = result.available_calculations.hpi.parameters_missing;
      expect(hpiMissing.length).toBeGreaterThan(0);
      expect(hpiMissing.some(m => m.includes('Zinc'))).toBe(true);
      expect(hpiMissing.some(m => m.includes('Mercury'))).toBe(true);
    });

    it('should warn when few parameters are detected', () => {
      const csvContent = Buffer.from(
        `station,As,Cu
S1,10,50`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'very_few.csv');

      expect(result.available_calculations.hpi.available).toBe(false);
      expect(result.validation_warnings.some(w => 
        w.type === 'few_parameters' && w.message.includes('metal')
      )).toBe(true);
    });

    it('should detect WQI parameters with aliases', () => {
      const csvContent = Buffer.from(
        `station,ph,electrical_conductivity,total_dissolved_solids,total_hardness,fluoride
S1,7.5,250,400,300,1.2`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'wqi_aliases.csv');

      expect(result.available_calculations.wqi.available).toBe(true);
      expect(result.available_calculations.wqi.detected_count).toBe(5);
      
      const wqiParams = result.available_calculations.wqi.parameters_detected;
      expect(wqiParams.some(p => p.symbol === 'pH')).toBe(true);
      expect(wqiParams.some(p => p.symbol === 'EC')).toBe(true);
      expect(wqiParams.some(p => p.symbol === 'TDS')).toBe(true);
      expect(wqiParams.some(p => p.symbol === 'TH')).toBe(true);
      expect(wqiParams.some(p => p.symbol === 'F')).toBe(true);
    });

    it('should return all detected columns', () => {
      const csvContent = Buffer.from(
        `station_id,custom_field,As,Cu,notes,pH
S1,abc,10,50,test,7.5`
      );

      const result = CSVPreviewService.previewCSV(csvContent, 'custom_columns.csv');

      expect(result.detected_columns).toContain('station_id');
      expect(result.detected_columns).toContain('custom_field');
      expect(result.detected_columns).toContain('As');
      expect(result.detected_columns).toContain('Cu');
      expect(result.detected_columns).toContain('notes');
      expect(result.detected_columns).toContain('pH');
    });

    it('should handle malformed CSV gracefully', () => {
      const csvContent = Buffer.from('this is not a valid csv file {{{{');

      const result = CSVPreviewService.previewCSV(csvContent, 'malformed.csv');

      // Should not throw, should return empty result
      expect(result.can_proceed).toBe(false);
    });

    it('should provide minimum required count for each index', () => {
      const csvContent = Buffer.from(`station,As\nS1,10`);

      const result = CSVPreviewService.previewCSV(csvContent, 'test.csv');

      expect(result.available_calculations.hpi.min_required).toBe(3);
      expect(result.available_calculations.mi.min_required).toBe(3);
      expect(result.available_calculations.wqi.min_required).toBe(3);
    });
  });
});
