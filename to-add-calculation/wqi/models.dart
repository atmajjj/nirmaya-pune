/// Data Models for Water Quality Index (WQI) Calculator
/// 
/// Based on Brown et al. (1972) method.
/// 
/// Contains all data model classes for WQI calculation:
/// - WQIParameter: Parameter definition with Sn, Vo, and computed values
/// - WQIResult: Calculation result with detailed breakdown

/// Water quality parameter for WQI calculation
/// 
/// Contains:
/// - Sn: BIS standard (permissible/max value)
/// - Vo: Ideal value
/// - Vn: Measured mean value
/// - Wi: Relative weight (computed)
/// - Qi: Quality rating/sub-index (computed)
/// - WiQi: Contribution to WQI (computed)
class WQIParameter {
  /// Parameter name (e.g., "pH", "TDS", "Turbidity")
  final String name;
  
  /// Parameter symbol/abbreviation
  final String symbol;
  
  /// BIS Standard value (Sn) - permissible/max value
  final double sn;
  
  /// Ideal value (Vo)
  final double vo;
  
  /// Measured mean value (Vn) for a site
  double? vn;
  
  /// Unit of measurement
  final String unit;
  
  /// Inverse of Sn (1/Sn) - computed
  double? invSn;
  
  /// Relative weight (Wi) - computed
  double? wi;
  
  /// Quality rating / sub-index (Qi) - computed
  double? qi;
  
  /// Contribution to WQI (Wi * Qi) - computed
  double? wiQi;

  WQIParameter({
    required this.name,
    required this.symbol,
    required this.sn,
    required this.vo,
    this.vn,
    required this.unit,
    this.invSn,
    this.wi,
    this.qi,
    this.wiQi,
  });

  /// Calculate 1/Sn
  double calculateInvSn() {
    invSn = 1.0 / sn;
    return invSn!;
  }

  /// Calculate quality rating Qi
  /// Formula: Qi = ((Vn - Vo) / (Sn - Vo)) * 100
  /// 
  /// Special handling for pH:
  /// - For pH, when Vn < Vo (acidic), use absolute deviation
  /// - Qi = |Vn - Vo| / |Sn - Vo| * 100
  double calculateQi() {
    if (vn == null) {
      throw StateError('Vn (measured value) must be set before calculating Qi');
    }
    
    // Special handling for pH parameter
    if (symbol.toLowerCase() == 'ph') {
      // Use absolute deviation for pH to handle both acidic and alkaline values
      qi = ((vn! - vo).abs() / (sn - vo).abs()) * 100.0;
    } else {
      // Standard formula for other parameters
      qi = ((vn! - vo) / (sn - vo)) * 100.0;
    }
    return qi!;
  }

  /// Calculate contribution WiQi
  double calculateWiQi() {
    if (wi == null || qi == null) {
      throw StateError('Wi and Qi must be calculated before WiQi');
    }
    wiQi = wi! * qi!;
    return wiQi!;
  }

  /// Create a copy with measured value
  WQIParameter withMeasuredValue(double measuredValue) {
    return WQIParameter(
      name: name,
      symbol: symbol,
      sn: sn,
      vo: vo,
      vn: measuredValue,
      unit: unit,
    );
  }

  @override
  String toString() {
    return 'WQIParameter(name: $name, Sn: $sn, Vo: $vo, Vn: $vn, Wi: ${wi?.toStringAsFixed(8)}, Qi: ${qi?.toStringAsFixed(6)}, WiQi: ${wiQi?.toStringAsFixed(9)})';
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'symbol': symbol,
      'sn': sn,
      'vo': vo,
      'vn': vn,
      'unit': unit,
      'invSn': invSn,
      'wi': wi,
      'qi': qi,
      'wiQi': wiQi,
    };
  }
}

/// Standard definition for a WQI parameter
/// 
/// Contains reference Sn and Vo values from BIS standards.
class WQIStandardDefinition {
  /// Parameter name
  final String name;
  
  /// Parameter symbol
  final String symbol;
  
  /// BIS Standard value (Sn)
  final double sn;
  
  /// Ideal value (Vo)
  final double vo;
  
  /// Unit of measurement
  final String unit;
  
  /// Source of standard
  final String? source;

  const WQIStandardDefinition({
    required this.name,
    required this.symbol,
    required this.sn,
    required this.vo,
    required this.unit,
    this.source,
  });

  /// Create a WQIParameter from this standard definition
  WQIParameter toParameter({double? vn}) {
    return WQIParameter(
      name: name,
      symbol: symbol,
      sn: sn,
      vo: vo,
      vn: vn,
      unit: unit,
    );
  }

  @override
  String toString() {
    return 'WQIStandardDefinition(name: $name, Sn: $sn, Vo: $vo)';
  }
}

/// Result of WQI calculation with detailed breakdown
class WQIResult {
  /// Sample/Site identifier
  final String sampleId;
  
  /// Calculated Water Quality Index value
  final double wqi;
  
  /// Classification based on WQI value (Brown et al., 1972)
  final String classification;
  
  /// Individual parameter results with all computed values
  final List<WQIParameter> parameterResults;
  
  /// Sum of inverse Sn values (Σ 1/Sn)
  final double sumInvSn;
  
  /// Constant K (1 / Σ(1/Sn))
  final double k;
  
  /// Sum of weights (should be ≈ 1.0)
  final double sumWeights;
  
  /// Number of parameters used in calculation
  final int parameterCount;
  
  /// Timestamp of calculation
  final DateTime calculatedAt;

  WQIResult({
    required this.sampleId,
    required this.wqi,
    required this.classification,
    required this.parameterResults,
    required this.sumInvSn,
    required this.k,
    required this.sumWeights,
    required this.parameterCount,
    DateTime? calculatedAt,
  }) : calculatedAt = calculatedAt ?? DateTime.now();

  /// Check if water quality is Excellent
  bool get isExcellent => wqi <= 25;

  /// Check if water quality is Good
  bool get isGood => wqi > 25 && wqi <= 50;

  /// Check if water quality is Poor
  bool get isPoor => wqi > 50 && wqi <= 75;

  /// Check if water quality is Very Poor
  bool get isVeryPoor => wqi > 75 && wqi <= 100;

  /// Check if water is Unfit for consumption
  bool get isUnfit => wqi > 100;

  /// Get quality level (1-5, where 1 is best)
  int get qualityLevel {
    if (isExcellent) return 1;
    if (isGood) return 2;
    if (isPoor) return 3;
    if (isVeryPoor) return 4;
    return 5;
  }

  Map<String, dynamic> toJson() {
    return {
      'sampleId': sampleId,
      'wqi': wqi,
      'classification': classification,
      'parameterResults': parameterResults.map((p) => p.toJson()).toList(),
      'sumInvSn': sumInvSn,
      'k': k,
      'sumWeights': sumWeights,
      'parameterCount': parameterCount,
      'calculatedAt': calculatedAt.toIso8601String(),
    };
  }

  @override
  String toString() {
    return 'WQIResult(sampleId: $sampleId, WQI: ${wqi.toStringAsFixed(2)}, classification: $classification)';
  }
}
