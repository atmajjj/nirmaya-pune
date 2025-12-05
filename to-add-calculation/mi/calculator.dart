/// Metal Index (MI) Calculator
/// 
/// Calculates the Metal Index for water quality assessment based on
/// heavy metal concentrations.
/// 
/// ============================================================================
/// FORMULA (Caeiro et al., 2005)
/// ============================================================================
/// 
/// For each metal:
///     ratio_i = Ci / MACi
/// 
/// Metal Index (MI):
///     MI = Σ (Ci / MACi)  for i = 1...n
/// 
/// Where:
///   - Ci = Mean concentration of metal i in ppb (µg/L)
///   - MACi = Maximum Allowable Concentration of metal i in ppb (µg/L)
///   - MI is dimensionless
/// 
/// ============================================================================
/// MI CLASSIFICATION (Caeiro et al., 2005)
/// ============================================================================
/// 
/// Class I   → Very Pure            → MI < 0.3
/// Class II  → Pure                 → 0.3 ≤ MI < 1
/// Class III → Slightly Affected    → 1 ≤ MI < 2
/// Class IV  → Moderately Affected  → 2 ≤ MI < 4
/// Class V   → Strongly Affected    → 4 ≤ MI < 6
/// Class VI  → Seriously Affected   → MI ≥ 6

import 'models.dart';
import 'default_mac.dart';

/// Metal Index Calculator
/// 
/// Provides methods to calculate MI for water samples.
class MICalculator {
  
  /// Calculate ratio for a single metal
  /// Formula: ratio = Ci / MACi
  /// 
  /// @param Ci Mean concentration in ppb
  /// @param MACi Maximum Allowable Concentration in ppb
  /// @return ratio (Ci / MACi)
  static double calculateRatio(double Ci, double MACi) {
    if (MACi <= 0) {
      throw ArgumentError('MACi must be greater than 0. MACi=$MACi');
    }
    return Ci / MACi;
  }
  
  /// Calculate Metal Index from array of metals
  /// Formula: MI = Σ (Ci / MACi)
  /// 
  /// @param metalsArray Array of MetalMIData objects with Ci and MACi
  /// @return MIResult with full calculation breakdown
  static MIResult calculateMI(List<MetalMIData> metalsArray, {String sampleId = 'SAMPLE'}) {
    double miSum = 0.0;
    Map<String, double> ratios = {};
    Map<String, double> concentrations = {};
    
    for (final metal in metalsArray) {
      // Validate input
      if (metal.MACi <= 0) {
        print('Warning: Skipping ${metal.symbol} - MACi (${metal.MACi}) must be > 0');
        continue;
      }
      
      // Calculate ratio: Ci / MACi
      final ratio = metal.calculateRatio();
      
      // Accumulate sum
      miSum += ratio;
      
      // Store for result
      ratios[metal.symbol] = ratio;
      concentrations[metal.symbol] = metal.Ci;
    }
    
    // Classify MI
    final classification = classifyMI(miSum);
    
    return MIResult(
      sampleId: sampleId,
      mi: miSum,
      classification: classification['classification']!,
      classNumber: classification['classNumber']!,
      riskLevel: int.parse(classification['riskLevel']!),
      metalResults: metalsArray,
      ratios: ratios,
      concentrations: concentrations,
      metalCount: metalsArray.length,
    );
  }
  
  /// Calculate MI from a map of concentrations using default MAC values
  /// 
  /// @param concentrations Map of metal symbol to concentration (Ci) in ppb
  /// @param sampleId Optional sample identifier
  /// @return MIResult with full calculation breakdown
  static MIResult calculateMIFromMap(
    Map<String, double> concentrations, {
    String sampleId = 'SAMPLE',
    Map<String, double>? customMAC,
  }) {
    List<MetalMIData> metalsArray = [];
    
    concentrations.forEach((symbol, ci) {
      // Get MAC value (custom or default)
      double? mac;
      if (customMAC != null && customMAC.containsKey(symbol)) {
        mac = customMAC[symbol];
      } else {
        mac = getMACValue(symbol);
      }
      
      if (mac == null) {
        print('Warning: No MAC value found for $symbol, skipping');
        return;
      }
      
      final macDef = getMACBySymbol(symbol);
      metalsArray.add(MetalMIData(
        symbol: symbol,
        name: macDef?.name ?? symbol,
        Ci: ci,
        MACi: mac,
      ));
    });
    
    return calculateMI(metalsArray, sampleId: sampleId);
  }
  
  /// Calculate MI for multiple stations/samples
  /// 
  /// @param stationData Map of station ID to concentration map
  /// @return List of MIResult for each station
  static List<MIResult> calculateMIForStations(
    Map<String, Map<String, double>> stationData, {
    Map<String, double>? customMAC,
  }) {
    return stationData.entries.map((entry) {
      return calculateMIFromMap(
        entry.value,
        sampleId: entry.key,
        customMAC: customMAC,
      );
    }).toList();
  }
  
  /// Classify MI value into water quality category
  /// Based on Caeiro et al., 2005
  /// 
  /// @param mi Metal Index value
  /// @return Map with classification, classNumber, and riskLevel
  static Map<String, String> classifyMI(double mi) {
    if (mi < 0.3) {
      return {
        'classification': 'Very Pure',
        'classNumber': 'Class I',
        'riskLevel': '1',
        'description': 'Water quality is excellent with very low metal contamination.',
      };
    } else if (mi < 1) {
      return {
        'classification': 'Pure',
        'classNumber': 'Class II',
        'riskLevel': '2',
        'description': 'Water quality is good with low metal levels.',
      };
    } else if (mi < 2) {
      return {
        'classification': 'Slightly Affected',
        'classNumber': 'Class III',
        'riskLevel': '3',
        'description': 'Water shows slight metal contamination. Monitoring recommended.',
      };
    } else if (mi < 4) {
      return {
        'classification': 'Moderately Affected',
        'classNumber': 'Class IV',
        'riskLevel': '4',
        'description': 'Water is moderately contaminated. Treatment may be required.',
      };
    } else if (mi < 6) {
      return {
        'classification': 'Strongly Affected',
        'classNumber': 'Class V',
        'riskLevel': '5',
        'description': 'Water is strongly contaminated. Treatment required before use.',
      };
    } else {
      return {
        'classification': 'Seriously Affected',
        'classNumber': 'Class VI',
        'riskLevel': '6',
        'description': 'Water is seriously contaminated. Not suitable for use without extensive treatment.',
      };
    }
  }
  
  /// Get color code for MI classification (for UI display)
  static String getStatusColor(double mi) {
    if (mi < 0.3) {
      return '#2196F3';  // Blue - Very Pure
    } else if (mi < 1) {
      return '#4CAF50';  // Green - Pure
    } else if (mi < 2) {
      return '#8BC34A';  // Light Green - Slightly Affected
    } else if (mi < 4) {
      return '#FFC107';  // Amber - Moderately Affected
    } else if (mi < 6) {
      return '#FF9800';  // Orange - Strongly Affected
    } else {
      return '#F44336';  // Red - Seriously Affected
    }
  }
  
  /// Get risk level (1-6) for MI value
  static int getRiskLevel(double mi) {
    if (mi < 0.3) return 1;
    if (mi < 1) return 2;
    if (mi < 2) return 3;
    if (mi < 4) return 4;
    if (mi < 6) return 5;
    return 6;
  }
  
  /// Get detailed calculation breakdown for a single metal
  static Map<String, dynamic> getMetalCalculationDetails(MetalMIData metal) {
    final ratio = metal.ratio ?? metal.calculateRatio();
    
    return {
      'symbol': metal.symbol,
      'name': metal.name,
      'Ci': metal.Ci,
      'MACi': metal.MACi,
      'ratio': ratio,
      'formula': '${metal.Ci} / ${metal.MACi} = $ratio',
      'unit': 'ppb',
    };
  }
  
  /// Calculate MI with detailed step-by-step breakdown
  static Map<String, dynamic> calculateMIWithDetails(
    Map<String, double> concentrations, {
    String sampleId = 'SAMPLE',
  }) {
    final result = calculateMIFromMap(concentrations, sampleId: sampleId);
    final detailedCalculations = result.metalResults
        .map((m) => getMetalCalculationDetails(m))
        .toList();
    
    return {
      'result': result.toJson(),
      'calculations': detailedCalculations,
      'formula': 'MI = Σ(Ci / MACi)',
      'totalMetals': result.metalCount,
      'sumOfRatios': result.mi,
      'classification': {
        'class': result.classNumber,
        'category': result.classification,
        'riskLevel': result.riskLevel,
      },
    };
  }
}
