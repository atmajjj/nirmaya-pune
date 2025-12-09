/// Data Models for HPI Calculator
/// 
/// Contains all data model classes for HPI calculation:
/// - HeavyMetalData: Metal measurement with Si, Ii, Mi values
/// - MetalDefinition: Metal standard definitions
/// - WaterSample: Sample with concentration data
/// - HPIResult: Calculation result with detailed breakdown

import 'concentration_unit.dart';

/// Heavy metal data for HPI calculation
/// 
/// Contains all values needed for HPI computation:
/// - Si: Standard permissible limit (ppb)
/// - Ii: Ideal value (ppb)
/// - Mi: Monitored/measured concentration (ppb)
/// - Wi, Qi, WiQi: Calculated values
class HeavyMetalData {
  /// Symbol for the metal (e.g., "As", "Cu", "Zn", "Hg", "Cd", "Ni", "Pb")
  final String symbol;
  
  /// Full name of the metal (e.g., "Arsenic", "Copper", "Zinc")
  final String name;
  
  /// Standard permissible limit (Si) in ppb (µg/L)
  final double Si;
  
  /// Ideal value (Ii) in ppb (µg/L)
  final double Ii;
  
  /// Monitored/measured concentration (Mi) in ppb (µg/L)
  final double Mi;
  
  /// Unit weight (Wi) - calculated: Wi = 1 / (Si - Ii)
  double? Wi;
  
  /// Sub-index value (Qi) - calculated: Qi = (|Mi - Ii| / (Si - Ii)) × 100
  double? Qi;
  
  /// Contribution value (WiQi) - calculated: WiQi = Wi × Qi
  double? WiQi;

  HeavyMetalData({
    required this.symbol,
    required this.name,
    required this.Si,
    required this.Ii,
    required this.Mi,
    this.Wi,
    this.Qi,
    this.WiQi,
  });

  @override
  String toString() {
    return 'HeavyMetalData(symbol: $symbol, Si: $Si, Ii: $Ii, Mi: $Mi, Wi: $Wi, Qi: $Qi, WiQi: $WiQi)';
  }
}

/// Data model for a heavy metal definition with both BIS and WHO standards
/// 
/// Defines the properties of a heavy metal including its standard permissible
/// limit (Si) and ideal value (Ii) for HPI calculation.
/// All values are in ppb (µg/L)
class MetalDefinition {
  /// Unique symbol for the metal (e.g., "As", "Cu", "Zn", "Hg", "Cd", "Ni", "Pb")
  final String symbol;
  
  /// Full name of the metal (e.g., "Arsenic", "Copper", "Zinc")
  final String name;
  
  /// Standard permissible limit (Si) in ppb (µg/L)
  final double standardLimit;
  
  /// Ideal value (Ii) in ppb (µg/L)
  final double idealValue;
  
  /// BIS Standard permissible limit - BIS 10500 value in ppb (µg/L)
  final double bisLimit;
  
  /// WHO Standard permissible limit - WHO Guidelines value in ppb (µg/L)
  final double whoLimit;

  const MetalDefinition({
    required this.symbol,
    required this.name,
    required this.standardLimit,
    required this.idealValue,
    this.bisLimit = 0,
    this.whoLimit = 0,
  });

  @override
  String toString() {
    return 'MetalDefinition(symbol: $symbol, name: $name, Si: $standardLimit, Ii: $idealValue)';
  }
}

/// Data model for a water sample
/// 
/// Contains the sample identifier and a map of measured concentrations
/// for each heavy metal.
class WaterSample {
  /// Unique identifier for the sample
  final String sampleId;
  
  /// Map of metal symbol to measured concentration (Mi)
  /// e.g., {"As": 0.048, "Hg": 2.83, ...}
  /// Values are in ppb (µg/L)
  final Map<String, double> concentrations;
  
  /// Original unit of measurement (for display purposes)
  final ConcentrationUnit originalUnit;

  const WaterSample({
    required this.sampleId,
    required this.concentrations,
    this.originalUnit = ConcentrationUnit.ppb,
  });

  @override
  String toString() {
    return 'WaterSample(sampleId: $sampleId, concentrations: $concentrations, unit: $originalUnit)';
  }
}

/// Result of HPI calculation with detailed breakdown
class HPIResult {
  /// Sample identifier
  final String sampleId;
  
  /// Calculated HPI value (dimensionless)
  final double hpi;
  
  /// Water quality classification based on HPI value
  final String classification;
  
  /// Map of metal symbol to sub-index value (Qi)
  final Map<String, double> subIndices;
  
  /// Map of metal symbol to unit weight (Wi)
  final Map<String, double> unitWeights;
  
  /// Map of metal symbol to contribution (WiQi)
  final Map<String, double> contributions;
  
  /// Map of metal symbol to measured value (Mi) in ppb
  final Map<String, double> measuredValues;
  
  /// Sum of all Wi values
  final double sumWi;
  
  /// Sum of all WiQi values
  final double sumWiQi;
  
  /// Original unit used for input
  final ConcentrationUnit originalUnit;

  const HPIResult({
    required this.sampleId,
    required this.hpi,
    required this.classification,
    required this.subIndices,
    required this.unitWeights,
    required this.contributions,
    required this.measuredValues,
    required this.sumWi,
    required this.sumWiQi,
    this.originalUnit = ConcentrationUnit.ppb,
  });

  Map<String, dynamic> toJson() {
    return {
      'sampleId': sampleId,
      'hpi': hpi,
      'classification': classification,
      'subIndices': subIndices,
      'unitWeights': unitWeights,
      'contributions': contributions,
      'measuredValues': measuredValues,
      'sumWi': sumWi,
      'sumWiQi': sumWiQi,
      'originalUnit': originalUnit.toString(),
    };
  }

  @override
  String toString() {
    return 'HPIResult(sampleId: $sampleId, hpi: ${hpi.toStringAsFixed(5)}, classification: $classification)';
  }
}
