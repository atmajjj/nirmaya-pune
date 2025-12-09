/// Water Quality Index (WQI) Calculator
/// 
/// Calculates the Water Quality Index based on Brown et al. (1972) method.
/// 
/// ============================================================================
/// FORMULAS (Brown et al., 1972)
/// ============================================================================
/// 
/// Step 1: Calculate 1/Sn for each parameter:
///     invSn_i = 1 / Sn_i
/// 
/// Step 2: Calculate sum of all invSn:
///     sumInvSn = Σ invSn_i
/// 
/// Step 3: Calculate constant K:
///     K = 1 / sumInvSn
/// 
/// Step 4: Calculate relative weight Wi for each parameter:
///     Wi_i = K * invSn_i
///     Note: Σ Wi_i = 1 (normalized weights)
/// 
/// Step 5: Calculate quality rating Qi for each parameter:
///     Qi_i = ((Vn_i - Vo_i) / (Sn_i - Vo_i)) * 100
/// 
/// Step 6: Calculate contribution WiQi:
///     WiQi_i = Wi_i * Qi_i
/// 
/// Step 7: Calculate overall WQI:
///     WQI = Σ WiQi_i
/// 
/// Where:
///   - Sn = BIS standard (permissible/max value)
///   - Vo = Ideal value (7 for pH, 0 for others)
///   - Vn = Measured mean value
///   - Wi = Relative weight
///   - Qi = Quality rating / sub-index
/// 
/// ============================================================================
/// WQI CLASSIFICATION (Brown et al., 1972)
/// ============================================================================
/// 
/// 0 – 25      → "Excellent"
/// 26 – 50     → "Good"
/// 51 – 75     → "Poor"
/// 76 – 100    → "Very Poor"
/// > 100       → "Unfit for consumption"

import 'models.dart';
import 'default_standards.dart';

/// Water Quality Index Calculator
/// 
/// Provides methods to calculate WQI for water samples using Brown method.
class WQICalculator {
  
  /// Compute weights for all parameters
  /// 
  /// Steps:
  /// 1. Calculate invSn = 1/Sn for each parameter
  /// 2. Calculate sumInvSn = Σ(1/Sn)
  /// 3. Calculate K = 1/sumInvSn
  /// 4. Calculate Wi = K * invSn for each parameter
  /// 
  /// @param parameters List of WQIParameter with Sn values
  /// @return Map with 'sumInvSn', 'k', and updated parameters
  static Map<String, dynamic> computeWeights(List<WQIParameter> parameters) {
    // Step 1: Calculate 1/Sn for each parameter
    for (final param in parameters) {
      param.calculateInvSn();
    }
    
    // Step 2: Calculate sum of all invSn
    double sumInvSn = 0.0;
    for (final param in parameters) {
      sumInvSn += param.invSn!;
    }
    
    // Step 3: Calculate constant K
    double k = 1.0 / sumInvSn;
    
    // Step 4: Calculate relative weight Wi for each parameter
    for (final param in parameters) {
      param.wi = k * param.invSn!;
    }
    
    return {
      'sumInvSn': sumInvSn,
      'k': k,
      'parameters': parameters,
    };
  }
  
  /// Compute quality rating Qi for a single parameter
  /// 
  /// Formula: Qi = ((Vn - Vo) / (Sn - Vo)) * 100
  /// 
  /// @param parameter WQIParameter with Vn, Vo, Sn values
  /// @return Qi value
  static double computeQi(WQIParameter parameter) {
    return parameter.calculateQi();
  }
  
  /// Compute WQI for a set of parameters with measured values
  /// 
  /// @param parameters List of WQIParameter with Vn values set
  /// @param sampleId Sample/Site identifier
  /// @return WQIResult with full calculation breakdown
  static WQIResult computeWQI(List<WQIParameter> parameters, {String sampleId = 'SAMPLE'}) {
    // Step 1-4: Compute weights
    final weightsResult = computeWeights(parameters);
    final double sumInvSn = weightsResult['sumInvSn'];
    final double k = weightsResult['k'];
    
    // Step 5-6: Compute Qi and WiQi for each parameter
    double sumWiQi = 0.0;
    double sumWeights = 0.0;
    
    for (final param in parameters) {
      if (param.vn == null) {
        throw StateError('Measured value (Vn) not set for parameter: ${param.name}');
      }
      
      // Calculate Qi
      param.calculateQi();
      
      // Calculate WiQi
      param.calculateWiQi();
      
      sumWiQi += param.wiQi!;
      sumWeights += param.wi!;
    }
    
    // Step 7: WQI is sum of WiQi
    double wqi = sumWiQi;
    
    // Classify WQI
    String classification = classifyWQI(wqi);
    
    return WQIResult(
      sampleId: sampleId,
      wqi: wqi,
      classification: classification,
      parameterResults: parameters,
      sumInvSn: sumInvSn,
      k: k,
      sumWeights: sumWeights,
      parameterCount: parameters.length,
    );
  }
  
  /// Compute WQI from a map of measured values
  /// 
  /// @param measuredValues Map of parameter symbol/name to measured value (Vn)
  /// @param sampleId Sample/Site identifier
  /// @param customStandards Optional custom standards (Sn, Vo values)
  /// @return WQIResult with full calculation breakdown
  static WQIResult computeWQIFromMap(
    Map<String, double> measuredValues, {
    String sampleId = 'SAMPLE',
    List<WQIStandardDefinition>? customStandards,
  }) {
    // Use custom standards or defaults
    final standards = customStandards ?? DEFAULT_WQI_STANDARDS;
    
    // Create parameters from standards with measured values
    List<WQIParameter> parameters = [];
    
    for (final std in standards) {
      // Find measured value by symbol or name
      double? vn = measuredValues[std.symbol] ?? measuredValues[std.name];
      
      if (vn != null) {
        parameters.add(std.toParameter(vn: vn));
      }
    }
    
    if (parameters.isEmpty) {
      throw ArgumentError('No measured values matched the standard parameters');
    }
    
    return computeWQI(parameters, sampleId: sampleId);
  }
  
  /// Compute WQI for multiple sites/stations
  /// 
  /// @param siteData Map of site ID to measured values map
  /// @param customStandards Optional custom standards
  /// @return List of WQIResult for each site
  static List<WQIResult> computeWQIForSites(
    Map<String, Map<String, double>> siteData, {
    List<WQIStandardDefinition>? customStandards,
  }) {
    return siteData.entries.map((entry) {
      return computeWQIFromMap(
        entry.value,
        sampleId: entry.key,
        customStandards: customStandards,
      );
    }).toList();
  }
  
  /// Classify WQI value into water quality category
  /// Based on Brown et al. (1972)
  /// 
  /// @param wqi Water Quality Index value
  /// @return Classification string
  static String classifyWQI(double wqi) {
    if (wqi <= 25) {
      return 'Excellent';
    } else if (wqi <= 50) {
      return 'Good';
    } else if (wqi <= 75) {
      return 'Poor';
    } else if (wqi <= 100) {
      return 'Very Poor';
    } else {
      return 'Unfit for consumption';
    }
  }
  
  /// Get color code for WQI classification (for UI display)
  static String getStatusColor(double wqi) {
    if (wqi <= 25) {
      return '#4CAF50';  // Green - Excellent
    } else if (wqi <= 50) {
      return '#8BC34A';  // Light Green - Good
    } else if (wqi <= 75) {
      return '#FFC107';  // Amber - Poor
    } else if (wqi <= 100) {
      return '#FF9800';  // Orange - Very Poor
    } else {
      return '#F44336';  // Red - Unfit
    }
  }
  
  /// Get Color object for WQI classification (for Flutter UI)
  static int getStatusColorValue(double wqi) {
    if (wqi <= 25) {
      return 0xFF4CAF50;  // Green - Excellent
    } else if (wqi <= 50) {
      return 0xFF8BC34A;  // Light Green - Good
    } else if (wqi <= 75) {
      return 0xFFFFC107;  // Amber - Poor
    } else if (wqi <= 100) {
      return 0xFFFF9800;  // Orange - Very Poor
    } else {
      return 0xFFF44336;  // Red - Unfit
    }
  }
  
  /// Get quality level (1-5, where 1 is best)
  static int getQualityLevel(double wqi) {
    if (wqi <= 25) return 1;
    if (wqi <= 50) return 2;
    if (wqi <= 75) return 3;
    if (wqi <= 100) return 4;
    return 5;
  }
  
  /// Get detailed calculation breakdown for a single parameter
  static Map<String, dynamic> getParameterCalculationDetails(WQIParameter param) {
    return {
      'name': param.name,
      'symbol': param.symbol,
      'Sn': param.sn,
      'Vo': param.vo,
      'Vn': param.vn,
      'unit': param.unit,
      'invSn': param.invSn,
      'Wi': param.wi,
      'Qi': param.qi,
      'WiQi': param.wiQi,
      'qiFormula': '((${param.vn} - ${param.vo}) / (${param.sn} - ${param.vo})) * 100 = ${param.qi}',
    };
  }
  
  /// Calculate WQI with detailed step-by-step breakdown
  static Map<String, dynamic> computeWQIWithDetails(
    Map<String, double> measuredValues, {
    String sampleId = 'SAMPLE',
  }) {
    final result = computeWQIFromMap(measuredValues, sampleId: sampleId);
    final detailedCalculations = result.parameterResults
        .map((p) => getParameterCalculationDetails(p))
        .toList();
    
    return {
      'result': result.toJson(),
      'calculations': detailedCalculations,
      'methodology': 'Brown et al. (1972)',
      'formula': 'WQI = Σ(Wi × Qi)',
      'totalParameters': result.parameterCount,
      'sumInvSn': result.sumInvSn,
      'K': result.k,
      'sumWeights': result.sumWeights,
      'wqi': result.wqi,
      'classification': result.classification,
    };
  }
}
