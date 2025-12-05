/// Data Models for Metal Index (MI) Calculator
/// 
/// Contains all data model classes for MI calculation:
/// - MetalMIData: Metal measurement with Ci and MACi values
/// - MACDefinition: Maximum Allowable Concentration definitions
/// - MIResult: Calculation result with detailed breakdown

/// Metal data for MI calculation
/// 
/// Contains:
/// - Ci: Mean concentration (ppb)
/// - MACi: Maximum Allowable Concentration (ppb)
/// - ratio: Ci / MACi (computed)
class MetalMIData {
  /// Chemical symbol (e.g., "As", "Cd", "Cu")
  final String symbol;
  
  /// Full name of the metal
  final String name;
  
  /// Mean concentration (Ci) in ppb (µg/L)
  final double Ci;
  
  /// Maximum Allowable Concentration (MACi) in ppb (µg/L)
  final double MACi;
  
  /// Computed ratio: Ci / MACi
  double? ratio;

  MetalMIData({
    required this.symbol,
    required this.name,
    required this.Ci,
    required this.MACi,
    this.ratio,
  });

  /// Calculate and store the ratio
  double calculateRatio() {
    ratio = Ci / MACi;
    return ratio!;
  }

  @override
  String toString() {
    return 'MetalMIData(symbol: $symbol, Ci: $Ci, MACi: $MACi, ratio: ${ratio?.toStringAsFixed(9)})';
  }

  Map<String, dynamic> toJson() {
    return {
      'symbol': symbol,
      'name': name,
      'Ci': Ci,
      'MACi': MACi,
      'ratio': ratio,
    };
  }
}

/// Maximum Allowable Concentration (MAC) definition for a metal
/// 
/// Contains reference MAC values from standards.
/// All values are in ppb (µg/L).
class MACDefinition {
  /// Chemical symbol
  final String symbol;
  
  /// Full name
  final String name;
  
  /// Maximum Allowable Concentration in ppb (µg/L)
  final double mac;
  
  /// Source/reference for the MAC value
  final String? source;

  const MACDefinition({
    required this.symbol,
    required this.name,
    required this.mac,
    this.source,
  });

  @override
  String toString() {
    return 'MACDefinition(symbol: $symbol, name: $name, MAC: $mac ppb)';
  }
}

/// Result of MI calculation with detailed breakdown
class MIResult {
  /// Sample/Station identifier
  final String sampleId;
  
  /// Calculated Metal Index value (dimensionless)
  final double mi;
  
  /// Classification based on MI value (Caeiro et al., 2005)
  final String classification;
  
  /// Classification class number (I-VI)
  final String classNumber;
  
  /// Risk/quality level (1-6)
  final int riskLevel;
  
  /// Individual metal results with ratios
  final List<MetalMIData> metalResults;
  
  /// Map of metal symbol to ratio (Ci/MACi)
  final Map<String, double> ratios;
  
  /// Map of metal symbol to measured concentration (Ci)
  final Map<String, double> concentrations;
  
  /// Number of metals used in calculation
  final int metalCount;
  
  /// Timestamp of calculation
  final DateTime calculatedAt;

  MIResult({
    required this.sampleId,
    required this.mi,
    required this.classification,
    required this.classNumber,
    required this.riskLevel,
    required this.metalResults,
    required this.ratios,
    required this.concentrations,
    required this.metalCount,
    DateTime? calculatedAt,
  }) : calculatedAt = calculatedAt ?? DateTime.now();

  /// Check if water is safe (Classes I-II)
  bool get isSafe => riskLevel <= 2;

  /// Check if water is affected (Classes III+)
  bool get isAffected => riskLevel >= 3;

  /// Check if water is seriously affected (Class VI)
  bool get isSeriouslyAffected => riskLevel >= 6;

  Map<String, dynamic> toJson() {
    return {
      'sampleId': sampleId,
      'mi': mi,
      'classification': classification,
      'classNumber': classNumber,
      'riskLevel': riskLevel,
      'metalResults': metalResults.map((m) => m.toJson()).toList(),
      'ratios': ratios,
      'concentrations': concentrations,
      'metalCount': metalCount,
      'calculatedAt': calculatedAt.toIso8601String(),
    };
  }

  @override
  String toString() {
    return 'MIResult(sampleId: $sampleId, MI: ${mi.toStringAsFixed(7)}, class: $classNumber - $classification)';
  }
}
