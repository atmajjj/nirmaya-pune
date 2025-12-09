/// Test Case Verification for HPI Calculator
/// 
/// Run the test case and verify results match expected values.
/// This is separated from the core calculator for modularity.

import 'models.dart';
import 'calculator.dart';

/// Run the test case and verify results match expected values
void runTestCase() {
  print('=' * 60);
  print('HPI CALCULATION TEST CASE');
  print('=' * 60);
  print('');
  
  // Test case metals with exact values from specification
  final testMetals = [
    HeavyMetalData(symbol: 'As', name: 'Arsenic', Si: 50, Ii: 10, Mi: 0.048),
    HeavyMetalData(symbol: 'Cu', name: 'Copper', Si: 1500, Ii: 50, Mi: 2.54),
    HeavyMetalData(symbol: 'Zn', name: 'Zinc', Si: 15000, Ii: 5000, Mi: 43.89),
    HeavyMetalData(symbol: 'Hg', name: 'Mercury', Si: 2, Ii: 1, Mi: 2.83),
    HeavyMetalData(symbol: 'Cd', name: 'Cadmium', Si: 5, Ii: 3, Mi: 0.06),
    HeavyMetalData(symbol: 'Ni', name: 'Nickel', Si: 70, Ii: 20, Mi: 0.095),
    HeavyMetalData(symbol: 'Pb', name: 'Lead', Si: 10, Ii: 0, Mi: 0.215),
  ];
  
  // Expected values from specification
  final expectedWi = {
    'As': 0.025,           // 1/(50-10) = 0.025
    'Cu': 0.000689655,     // 1/(1500-50) = 0.000689655...
    'Zn': 0.0001,          // 1/(15000-5000) = 0.0001
    'Hg': 1.0,             // 1/(2-1) = 1.0
    'Cd': 0.5,             // 1/(5-3) = 0.5
    'Ni': 0.02,            // 1/(70-20) = 0.02
    'Pb': 0.1,             // 1/(10-0) = 0.1
  };
  
  final expectedQi = {
    'As': 24.88,           // (|0.048-10|/40)*100 = 24.88
    'Cu': 3.273103,        // (|2.54-50|/1450)*100 = 3.273103...
    'Zn': 49.561,          // (|43.89-5000|/10000)*100 = 49.5611
    'Hg': 183.0,           // (|2.83-1|/1)*100 = 183
    'Cd': 147.0,           // (|0.06-3|/2)*100 = 147
    'Ni': 39.81,           // (|0.095-20|/50)*100 = 39.81
    'Pb': 2.15,            // (|0.215-0|/10)*100 = 2.15
  };
  
  print('Input Data:');
  print('-' * 60);
  print('Metal\tSi\tIi\tMi');
  for (final m in testMetals) {
    print('${m.symbol}\t${m.Si}\t${m.Ii}\t${m.Mi}');
  }
  print('');
  
  // Calculate HPI
  final result = HPICalculator.computeHPI(testMetals);
  
  print('Calculated Values:');
  print('-' * 60);
  print('Metal\tWi\t\t\tQi\t\t\tWiQi');
  for (final m in testMetals) {
    print('${m.symbol}\t${m.Wi?.toStringAsFixed(9)}\t${m.Qi?.toStringAsFixed(9)}\t${m.WiQi?.toStringAsFixed(9)}');
  }
  print('');
  
  print('Sums:');
  print('-' * 60);
  print('SUM Wi   = ${result.sumWi}');
  print('SUM WiQi = ${result.sumWiQi}');
  print('');
  
  print('Final HPI:');
  print('-' * 60);
  print('HPI = SUM(WiQi) / SUM(Wi)');
  print('HPI = ${result.sumWiQi} / ${result.sumWi}');
  print('HPI = ${result.hpi.toStringAsFixed(5)}');
  print('');
  
  print('Classification: ${result.classification}');
  print('');
  
  // Verification
  print('VERIFICATION:');
  print('-' * 60);
  print('Expected HPI ≈ 146.33519');
  print('Calculated HPI = ${result.hpi.toStringAsFixed(5)}');
}

/// Example demonstrating HPI calculation with sample data
void exampleHPICalculation() {
  print('=== HPI Calculation Example ===\n');
  
  // Run the verification test case
  runTestCase();
  
  print('\n');
  print('=' * 60);
  print('ADDITIONAL EXAMPLE');
  print('=' * 60);
  
  // Example using WaterSample with DEFAULT_METALS
  final sample = WaterSample(
    sampleId: 'TEST_001',
    concentrations: {
      'As': 0.048,
      'Cu': 2.54,
      'Zn': 43.89,
      'Hg': 2.83,
      'Cd': 0.06,
      'Ni': 0.095,
      'Pb': 0.215,
    },
  );
  
  final result = HPICalculator.calculateHPI(sample.concentrations);
  print('\nSample: ${result.sampleId}');
  print('HPI: ${result.hpi.toStringAsFixed(5)}');
  print('Classification: ${result.classification}');
}
