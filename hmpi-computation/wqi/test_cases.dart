/// Test Cases for Water Quality Index (WQI) Calculator
/// 
/// Verification test cases to ensure WQI calculations match expected values
/// from the Brown et al. (1972) method.

import 'models.dart';
import 'calculator.dart';
import 'default_standards.dart';

/// Run the verification test case for Site 1
/// 
/// Site 1 MEAN values (Vn):
/// - pH        = 7.9
/// - EC        = 100.33
/// - TDS       = 67.22
/// - TH        = 40.67
/// - Calcium   = 55.61
/// - Magnesium = 6.48
/// - Iron      = 0.05
/// - Fluoride  = 0.02
/// - Turbidity = 1.3
/// 
/// Expected WQI ≈ 15.24 (Classification: "Excellent")
void runWQITestCase() {
  print('=' * 70);
  print('WATER QUALITY INDEX (WQI) CALCULATION TEST CASE');
  print('Brown et al. (1972) Method');
  print('=' * 70);
  print('');
  
  // Site 1 measured values
  final site1Values = {
    'pH': 7.9,
    'EC': 100.33,
    'TDS': 67.22,
    'TH': 40.67,
    'Ca': 55.61,
    'Mg': 6.48,
    'Fe': 0.05,
    'F': 0.02,
    'Turb': 1.3,
  };
  
  // Expected values for verification
  final expectedInvSn = {
    'pH': 0.117647059,
    'EC': 0.003333333,
    'TDS': 0.002,
    'TH': 0.003333333,
    'Ca': 0.013333333,
    'Mg': 0.033333333,
    'Fe': 3.333333333,
    'F': 1.0,
    'Turb': 0.2,
  };
  
  final expectedSumInvSn = 4.706313725;
  final expectedK = 0.21248052;
  
  final expectedWi = {
    'pH': 0.02499771,
    'EC': 0.00070827,
    'TDS': 0.00042496,
    'TH': 0.00070827,
    'Ca': 0.00283307,
    'Mg': 0.00708285,
    'Fe': 0.70826841,
    'F': 0.21248052,
    'Turb': 0.04249610,
  };
  
  final expectedQi = {
    'pH': 60.0,
    'EC': 33.443333,
    'TDS': 13.444,
    'TH': 13.556667,
    'Ca': 74.146667,
    'Mg': 21.6,
    'Fe': 16.666667,
    'F': 2.0,
    'Turb': 26.0,
  };
  
  final expectedWiQi = {
    'pH': 1.499862513,
    'EC': 0.023686856,
    'TDS': 0.005713176,
    'TH': 0.009601759,
    'Ca': 0.210062966,
    'Mg': 0.152895796,
    'Fe': 11.80447348,
    'F': 0.424961045,
    'Turb': 1.104898718,
  };
  
  final expectedWQI = 15.24;
  
  print('INPUT DATA (Site 1):');
  print('-' * 70);
  print('Parameter\t\tSn\t\tVo\t\tVn (measured)');
  for (final std in DEFAULT_WQI_STANDARDS) {
    final vn = site1Values[std.symbol];
    print('${std.name.padRight(20)}\t${std.sn}\t\t${std.vo}\t\t$vn');
  }
  print('');
  
  // Calculate WQI
  final result = WQICalculator.computeWQIFromMap(site1Values, sampleId: 'Site 1');
  
  // Print step-by-step calculations
  print('STEP 1: Calculate 1/Sn for each parameter:');
  print('-' * 70);
  print('Parameter\t\t1/Sn (calc)\t\t1/Sn (expected)\t\tMatch?');
  bool allInvSnMatch = true;
  for (final param in result.parameterResults) {
    final expected = expectedInvSn[param.symbol];
    final calculated = param.invSn!;
    final diff = (calculated - expected!).abs();
    final match = diff < 0.0001 ? '✓' : '✗';
    if (diff >= 0.0001) allInvSnMatch = false;
    print('${param.name.padRight(20)}\t${calculated.toStringAsFixed(9)}\t${expected.toStringAsFixed(9)}\t$match');
  }
  print('');
  
  print('STEP 2: Sum of 1/Sn:');
  print('-' * 70);
  print('Calculated sumInvSn = ${result.sumInvSn.toStringAsFixed(9)}');
  print('Expected sumInvSn   = ${expectedSumInvSn.toStringAsFixed(9)}');
  final sumInvSnDiff = (result.sumInvSn - expectedSumInvSn).abs();
  print('Match: ${sumInvSnDiff < 0.0001 ? "✓" : "✗"} (diff: ${sumInvSnDiff.toStringAsFixed(12)})');
  print('');
  
  print('STEP 3: Calculate K = 1/sumInvSn:');
  print('-' * 70);
  print('Calculated K = ${result.k.toStringAsFixed(8)}');
  print('Expected K   = ${expectedK.toStringAsFixed(8)}');
  final kDiff = (result.k - expectedK).abs();
  print('Match: ${kDiff < 0.0001 ? "✓" : "✗"} (diff: ${kDiff.toStringAsFixed(12)})');
  print('');
  
  print('STEP 4: Calculate Relative Weights (Wi = K × 1/Sn):');
  print('-' * 70);
  print('Parameter\t\tWi (calc)\t\tWi (expected)\t\tMatch?');
  bool allWiMatch = true;
  for (final param in result.parameterResults) {
    final expected = expectedWi[param.symbol];
    final calculated = param.wi!;
    final diff = (calculated - expected!).abs();
    final match = diff < 0.0001 ? '✓' : '✗';
    if (diff >= 0.0001) allWiMatch = false;
    print('${param.name.padRight(20)}\t${calculated.toStringAsFixed(8)}\t${expected.toStringAsFixed(8)}\t$match');
  }
  print('');
  print('Sum of Wi = ${result.sumWeights.toStringAsFixed(10)} (should be ≈ 1.0)');
  print('');
  
  print('STEP 5: Calculate Quality Rating (Qi = ((Vn - Vo) / (Sn - Vo)) × 100):');
  print('-' * 70);
  print('Parameter\t\tQi (calc)\t\tQi (expected)\t\tMatch?');
  bool allQiMatch = true;
  for (final param in result.parameterResults) {
    final expected = expectedQi[param.symbol];
    final calculated = param.qi!;
    final diff = (calculated - expected!).abs();
    final match = diff < 0.01 ? '✓' : '✗';
    if (diff >= 0.01) allQiMatch = false;
    print('${param.name.padRight(20)}\t${calculated.toStringAsFixed(6)}\t\t${expected.toStringAsFixed(6)}\t\t$match');
  }
  print('');
  
  print('STEP 6: Calculate Contributions (WiQi = Wi × Qi):');
  print('-' * 70);
  print('Parameter\t\tWiQi (calc)\t\tWiQi (expected)\t\tMatch?');
  bool allWiQiMatch = true;
  for (final param in result.parameterResults) {
    final expected = expectedWiQi[param.symbol];
    final calculated = param.wiQi!;
    final diff = (calculated - expected!).abs();
    final match = diff < 0.001 ? '✓' : '✗';
    if (diff >= 0.001) allWiQiMatch = false;
    print('${param.name.padRight(20)}\t${calculated.toStringAsFixed(9)}\t${expected.toStringAsFixed(9)}\t$match');
  }
  print('');
  
  print('STEP 7: Calculate WQI = Σ(WiQi):');
  print('-' * 70);
  print('');
  
  print('RESULTS:');
  print('-' * 70);
  print('Calculated WQI = ${result.wqi.toStringAsFixed(2)}');
  print('Expected WQI   = ${expectedWQI.toStringAsFixed(2)}');
  print('');
  print('Classification: ${result.classification}');
  print('Expected:       Excellent');
  print('');
  
  // Verification summary
  print('VERIFICATION SUMMARY:');
  print('-' * 70);
  
  final wqiDiff = (result.wqi - expectedWQI).abs();
  if (wqiDiff < 0.1) {
    print('✓ WQI calculation PASSED (difference: ${wqiDiff.toStringAsFixed(4)})');
  } else {
    print('✗ WQI calculation FAILED (difference: ${wqiDiff.toStringAsFixed(4)})');
  }
  
  if (allInvSnMatch) {
    print('✓ All 1/Sn values PASSED');
  } else {
    print('✗ Some 1/Sn values FAILED');
  }
  
  if (allWiMatch) {
    print('✓ All Wi (weights) PASSED');
  } else {
    print('✗ Some Wi (weights) FAILED');
  }
  
  if (allQiMatch) {
    print('✓ All Qi (quality ratings) PASSED');
  } else {
    print('✗ Some Qi (quality ratings) FAILED');
  }
  
  if (allWiQiMatch) {
    print('✓ All WiQi (contributions) PASSED');
  } else {
    print('✗ Some WiQi (contributions) FAILED');
  }
  
  if (result.classification == 'Excellent') {
    print('✓ Classification PASSED');
  } else {
    print('✗ Classification FAILED');
  }
  
  print('');
  print('=' * 70);
  print('TEST COMPLETE');
  print('=' * 70);
}

/// Example WQI calculation with multiple sites
void exampleWQICalculation() {
  print('');
  print('=' * 70);
  print('EXAMPLE: MULTI-SITE WQI CALCULATION');
  print('=' * 70);
  print('');
  
  // Example site data
  final siteData = {
    'Site 1': {
      'pH': 7.9,
      'EC': 100.33,
      'TDS': 67.22,
      'TH': 40.67,
      'Ca': 55.61,
      'Mg': 6.48,
      'Fe': 0.05,
      'F': 0.02,
      'Turb': 1.3,
    },
    'Site 2': {
      'pH': 8.2,
      'EC': 200.0,
      'TDS': 150.0,
      'TH': 100.0,
      'Ca': 60.0,
      'Mg': 15.0,
      'Fe': 0.15,
      'F': 0.5,
      'Turb': 3.0,
    },
    'Site 3': {
      'pH': 7.5,
      'EC': 350.0,
      'TDS': 400.0,
      'TH': 250.0,
      'Ca': 80.0,
      'Mg': 25.0,
      'Fe': 0.4,
      'F': 1.2,
      'Turb': 6.0,
    },
  };
  
  final results = WQICalculator.computeWQIForSites(siteData);
  
  print('Results Summary:');
  print('-' * 70);
  print('Site\t\tWQI\t\tClassification');
  for (final result in results) {
    print('${result.sampleId}\t\t${result.wqi.toStringAsFixed(2)}\t\t${result.classification}');
  }
}

/// Run all WQI test cases
void runAllWQITests() {
  runWQITestCase();
  exampleWQICalculation();
}
