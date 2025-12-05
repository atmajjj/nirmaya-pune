/// Test Cases for Metal Index (MI) Calculator
/// 
/// Verification test cases to ensure MI calculations match expected values.

import 'models.dart';
import 'calculator.dart';

/// Run the verification test case from the specification
/// 
/// Station 1 values:
/// - Arsenic (As):   Ci = 269.58, MAC = 50
/// - Cadmium (Cd):   Ci = 6.22,   MAC = 3
/// - Copper (Cu):    Ci = 554.98, MAC = 1500
/// - Lead (Pb):      Ci = 10.59,  MAC = 10
/// - Mercury (Hg):   Ci = 0.17,   MAC = 1
/// - Nickel (Ni):    Ci = 61.83,  MAC = 20
/// - Zinc (Zn):      Ci = 2587.05, MAC = 15000
/// 
/// Expected MI = 12.3292525
/// Expected Classification: "Seriously Affected" (Class VI)
void runMITestCase() {
  print('=' * 60);
  print('METAL INDEX (MI) CALCULATION TEST CASE');
  print('=' * 60);
  print('');
  
  // Test case metals with exact values from specification
  // NOTE: Using MAC values from the test case (As MAC = 50, not 10)
  final testMetals = [
    MetalMIData(symbol: 'As', name: 'Arsenic', Ci: 269.58, MACi: 50),
    MetalMIData(symbol: 'Cd', name: 'Cadmium', Ci: 6.22, MACi: 3),
    MetalMIData(symbol: 'Cu', name: 'Copper', Ci: 554.98, MACi: 1500),
    MetalMIData(symbol: 'Pb', name: 'Lead', Ci: 10.59, MACi: 10),
    MetalMIData(symbol: 'Hg', name: 'Mercury', Ci: 0.17, MACi: 1),
    MetalMIData(symbol: 'Ni', name: 'Nickel', Ci: 61.83, MACi: 20),
    MetalMIData(symbol: 'Zn', name: 'Zinc', Ci: 2587.05, MACi: 15000),
  ];
  
  // Expected ratios from specification
  final expectedRatios = {
    'As': 5.3916,
    'Cd': 2.071666667,
    'Cu': 0.369986667,
    'Pb': 1.059,
    'Hg': 0.17,
    'Ni': 3.0915,
    'Zn': 0.172469867,
  };
  
  print('Input Data (Station 1):');
  print('-' * 60);
  print('Metal\tCi (ppb)\tMAC (ppb)');
  for (final m in testMetals) {
    print('${m.symbol}\t${m.Ci}\t\t${m.MACi}');
  }
  print('');
  
  // Calculate MI
  final result = MICalculator.calculateMI(testMetals, sampleId: 'Station 1');
  
  print('Calculated Ratios (Ci / MACi):');
  print('-' * 60);
  print('Metal\tCalculated\t\tExpected');
  for (final m in testMetals) {
    final expected = expectedRatios[m.symbol];
    print('${m.symbol}\t${m.ratio?.toStringAsFixed(9)}\t${expected?.toStringAsFixed(9)}');
  }
  print('');
  
  print('Metal Index Calculation:');
  print('-' * 60);
  print('MI = Σ(Ci / MACi)');
  print('');
  
  // Show sum breakdown
  final ratioSum = testMetals.map((m) => m.ratio ?? 0).toList();
  print('MI = ${ratioSum.join(' + ')}');
  print('');
  
  print('Results:');
  print('-' * 60);
  print('Calculated MI = ${result.mi.toStringAsFixed(7)}');
  print('Expected MI   = 12.3292525');
  print('');
  print('Classification: ${result.classNumber} - ${result.classification}');
  print('Expected:       Class VI - Seriously Affected');
  print('');
  
  // Verification
  print('VERIFICATION:');
  print('-' * 60);
  final diff = (result.mi - 12.3292525).abs();
  if (diff < 0.0001) {
    print('✓ MI calculation PASSED (difference: ${diff.toStringAsFixed(10)})');
  } else {
    print('✗ MI calculation FAILED (difference: ${diff.toStringAsFixed(10)})');
  }
  
  if (result.classification == 'Seriously Affected') {
    print('✓ Classification PASSED');
  } else {
    print('✗ Classification FAILED');
  }
}

/// Example MI calculation with multiple stations
void exampleMICalculation() {
  print('');
  print('=' * 60);
  print('EXAMPLE: MULTI-STATION MI CALCULATION');
  print('=' * 60);
  print('');
  
  // Example station data
  final stationData = {
    'Station 1': {
      'As': 269.58,
      'Cd': 6.22,
      'Cu': 554.98,
      'Pb': 10.59,
      'Hg': 0.17,
      'Ni': 61.83,
      'Zn': 2587.05,
    },
    'Station 2': {
      'As': 150.0,
      'Cd': 2.5,
      'Cu': 300.0,
      'Pb': 5.0,
      'Hg': 0.5,
      'Ni': 30.0,
      'Zn': 1000.0,
    },
  };
  
  // Custom MAC values matching test case
  final customMAC = {
    'As': 50.0,
    'Cd': 3.0,
    'Cu': 1500.0,
    'Pb': 10.0,
    'Hg': 1.0,
    'Ni': 20.0,
    'Zn': 15000.0,
  };
  
  final results = MICalculator.calculateMIForStations(stationData, customMAC: customMAC);
  
  print('Results Summary:');
  print('-' * 60);
  print('Station\t\tMI\t\tClass\t\tClassification');
  for (final result in results) {
    print('${result.sampleId}\t${result.mi.toStringAsFixed(4)}\t\t${result.classNumber}\t\t${result.classification}');
  }
}

/// Run all MI test cases
void runAllMITests() {
  runMITestCase();
  exampleMICalculation();
}
