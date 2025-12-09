/// HPI Calculator Core
/// 
/// Heavy Metal Pollution Index Calculator implementation.
/// 
/// Implements the EXACT formulas from the specification:
/// - Wi = 1 / Si  (Unit weight)
/// - Qi = (|Mi - Ii| / (Si - Ii)) × 100  (Sub-index)
/// - WiQi = Wi × Qi  (Contribution)
/// - HPI = Σ(WiQi) / Σ(Wi)  (Final HPI)
/// 
/// HPI Classification:
/// - HPI < 25: Excellent - Low pollution
/// - HPI 25-50: Good - Low to medium pollution
/// - HPI 50-75: Poor - Medium pollution
/// - HPI 75-100: Very Poor - High pollution
/// - HPI > 100: Unsuitable - Critical pollution

import 'concentration_unit.dart';
import 'models.dart';
import 'default_metals.dart';

/// Heavy Metal Pollution Index Calculator
/// 
/// Provides methods to calculate HPI for water samples.
class HPICalculator {
  
  /// Compute Unit Weight (Wi)
  /// Formula: Wi = 1 / Si
  /// 
  /// @param Si Standard permissible limit (ppb)
  /// @param Ii Ideal value (ppb) - NOT USED in Wi calculation per specification
  /// @return Wi unit weight
  static double computeWi(double Si, double Ii) {
    if (Si <= 0) {
      throw ArgumentError('Si must be greater than 0. Si=$Si');
    }
    // Wi = 1 / Si (as per specification expected values)
    return 1.0 / Si;
  }
  
  /// Compute Sub-index (Qi)
  /// Formula: Qi = (|Mi - Ii| / (Si - Ii)) × 100
  /// 
  /// @param Mi Monitored concentration (ppb)
  /// @param Ii Ideal value (ppb)
  /// @param Si Standard permissible limit (ppb)
  /// @return Qi sub-index value
  static double computeQi(double Mi, double Ii, double Si) {
    if (Si <= Ii) {
      throw ArgumentError('Si must be greater than Ii. Si=$Si, Ii=$Ii');
    }
    final double Di = (Mi - Ii).abs(); // Absolute difference
    return (Di / (Si - Ii)) * 100.0;
  }
  
  /// Compute contribution (WiQi)
  /// Formula: WiQi = Wi × Qi
  /// 
  /// @param Wi Unit weight
  /// @param Qi Sub-index value
  /// @return WiQi contribution
  static double computeWiQi(double Wi, double Qi) {
    return Wi * Qi;
  }
  
  /// Compute HPI from array of heavy metals
  /// Formula: HPI = Σ(WiQi) / Σ(Wi)
  /// 
  /// @param metalsArray Array of HeavyMetalData objects
  /// @return HPIResult with full calculation breakdown
  static HPIResult computeHPI(List<HeavyMetalData> metalsArray) {
    double sumWi = 0.0;
    double sumWiQi = 0.0;
    
    Map<String, double> subIndices = {};
    Map<String, double> unitWeights = {};
    Map<String, double> contributions = {};
    Map<String, double> measuredValues = {};
    
    for (final metal in metalsArray) {
      // Validate input
      if (metal.Si <= metal.Ii) {
        print('Warning: Skipping ${metal.symbol} - Si (${metal.Si}) must be > Ii (${metal.Ii})');
        continue;
      }
      
      // Calculate Wi = 1 / (Si - Ii)
      final double Wi = computeWi(metal.Si, metal.Ii);
      
      // Calculate Qi = (|Mi - Ii| / (Si - Ii)) × 100
      final double Qi = computeQi(metal.Mi, metal.Ii, metal.Si);
      
      // Calculate WiQi = Wi × Qi
      final double WiQi = computeWiQi(Wi, Qi);
      
      // Store calculated values
      metal.Wi = Wi;
      metal.Qi = Qi;
      metal.WiQi = WiQi;
      
      // Accumulate sums
      sumWi += Wi;
      sumWiQi += WiQi;
      
      // Store for result
      subIndices[metal.symbol] = Qi;
      unitWeights[metal.symbol] = Wi;
      contributions[metal.symbol] = WiQi;
      measuredValues[metal.symbol] = metal.Mi;
    }
    
    // Calculate final HPI = Σ(WiQi) / Σ(Wi)
    double hpi = 0.0;
    if (sumWi > 0) {
      hpi = sumWiQi / sumWi;
    }
    
    return HPIResult(
      sampleId: 'CALCULATED',
      hpi: hpi,
      classification: classifyHPI(hpi),
      subIndices: subIndices,
      unitWeights: unitWeights,
      contributions: contributions,
      measuredValues: measuredValues,
      sumWi: sumWi,
      sumWiQi: sumWiQi,
      originalUnit: ConcentrationUnit.ppb,
    );
  }
  
  /// Calculate HPI for a water sample using metal definitions
  /// 
  /// @param metals List of MetalDefinition with Si and Ii
  /// @param sample WaterSample with measured concentrations
  /// @return HPIResult with full calculation breakdown
  static HPIResult calculateHPIWithDetails(
    List<MetalDefinition> metals,
    WaterSample sample,
  ) {
    // Convert sample to HeavyMetalData array
    List<HeavyMetalData> metalsArray = [];
    
    for (final metal in metals) {
      if (!sample.concentrations.containsKey(metal.symbol)) {
        continue;
      }
      
      metalsArray.add(HeavyMetalData(
        symbol: metal.symbol,
        name: metal.name,
        Si: metal.standardLimit,
        Ii: metal.idealValue,
        Mi: sample.concentrations[metal.symbol]!,
      ));
    }
    
    final result = computeHPI(metalsArray);
    
    // Update sample ID in result
    return HPIResult(
      sampleId: sample.sampleId,
      hpi: result.hpi,
      classification: result.classification,
      subIndices: result.subIndices,
      unitWeights: result.unitWeights,
      contributions: result.contributions,
      measuredValues: result.measuredValues,
      sumWi: result.sumWi,
      sumWiQi: result.sumWiQi,
      originalUnit: sample.originalUnit,
    );
  }
  
  /// Calculate HPI for a single water sample (simple version)
  static double calculateHPIForSample(
    List<MetalDefinition> metals,
    WaterSample sample, {
    bool useBISLimits = false,
    bool useWHOLimits = false,
    bool useAverageLimits = true,
  }) {
    final result = calculateHPIWithDetails(metals, sample);
    return result.hpi;
  }
  
  /// Calculate HPI for multiple water samples
  static List<Map<String, dynamic>> calculateHPIForSamples(
    List<MetalDefinition> metals,
    List<WaterSample> samples,
  ) {
    return samples.map((sample) {
      final result = calculateHPIWithDetails(metals, sample);
      return {
        'sampleId': sample.sampleId,
        'hpi': result.hpi,
      };
    }).toList();
  }
  
  /// Calculate HPI with full results for multiple samples
  static List<HPIResult> calculateHPIResultsForSamples(
    List<MetalDefinition> metals,
    List<WaterSample> samples,
  ) {
    return samples.map((sample) => calculateHPIWithDetails(metals, sample)).toList();
  }
  
  /// Classify HPI value into water quality category
  static String classifyHPI(double hpi) {
    if (hpi < 25) {
      return 'Excellent - Low pollution';
    } else if (hpi < 50) {
      return 'Good - Low to medium pollution';
    } else if (hpi < 75) {
      return 'Poor - Medium pollution';
    } else if (hpi < 100) {
      return 'Very Poor - High pollution';
    } else {
      return 'Unsuitable - Critical pollution (HPI > 100)';
    }
  }
  
  /// Get color code for HPI classification (for UI display)
  static String getStatusColor(double hpi) {
    if (hpi < 25) {
      return '#4CAF50';  // Green - Excellent
    } else if (hpi < 50) {
      return '#8BC34A';  // Light Green - Good
    } else if (hpi < 75) {
      return '#FFC107';  // Amber - Poor
    } else if (hpi < 100) {
      return '#FF9800';  // Orange - Very Poor
    } else {
      return '#F44336';  // Red - Unsuitable
    }
  }
  
  // =========================================================================
  // Legacy API for backward compatibility with existing screens
  // =========================================================================
  
  /// Get metal definition by symbol
  static MetalDefinition? getMetalDefinition(String symbol) {
    try {
      return DEFAULT_METALS.firstWhere((m) => m.symbol == symbol);
    } catch (e) {
      return null;
    }
  }
  
  /// Legacy BIS standard values map (for backward compatibility)
  static Map<String, double> get bisStandardValues {
    return Map.fromEntries(
      DEFAULT_METALS.map((m) => MapEntry(m.symbol, m.bisLimit))
    );
  }
  
  /// Legacy WHO standard values map
  static Map<String, double> get whoStandardValues {
    return Map.fromEntries(
      DEFAULT_METALS.map((m) => MapEntry(m.symbol, m.whoLimit))
    );
  }
  
  /// Legacy standard values map
  static Map<String, double> get standardValues {
    return Map.fromEntries(
      DEFAULT_METALS.map((m) => MapEntry(m.symbol, m.standardLimit))
    );
  }
  
  /// Legacy ideal values map (for backward compatibility)
  static Map<String, double> get idealValues {
    return Map.fromEntries(
      DEFAULT_METALS.map((m) => MapEntry(m.symbol, m.idealValue))
    );
  }
  
  /// Legacy calculateHPI method (for backward compatibility with existing screens)
  /// Takes a map of measured values in ppb and returns HPIResult
  static HPIResult calculateHPI(
    Map<String, double> measuredValues, {
    ConcentrationUnit inputUnit = ConcentrationUnit.ppb,
  }) {
    // Convert values to ppb if needed
    Map<String, double> convertedValues = {};
    measuredValues.forEach((key, value) {
      convertedValues[key] = UnitConverter.toPpb(value, inputUnit);
    });
    
    final sample = WaterSample(
      sampleId: 'SAMPLE',
      concentrations: convertedValues,
      originalUnit: inputUnit,
    );
    return calculateHPIWithDetails(DEFAULT_METALS, sample);
  }
}
