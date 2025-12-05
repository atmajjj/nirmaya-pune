/// Water Quality Index (WQI) Calculator Module
/// 
/// Water Quality Index calculation utility for water quality assessment
/// using the Brown et al. (1972) method.
/// 
/// ============================================================================
/// METHODOLOGY (Brown et al., 1972)
/// ============================================================================
/// 
/// The WQI is calculated using relative weights based on BIS standards and
/// quality ratings for each parameter.
/// 
/// Step 1: Calculate 1/Sn for each parameter
///     invSn_i = 1 / Sn_i
/// 
/// Step 2: Calculate sum of all invSn
///     sumInvSn = Σ invSn_i
/// 
/// Step 3: Calculate constant K
///     K = 1 / sumInvSn
/// 
/// Step 4: Calculate relative weight Wi
///     Wi_i = K × (1/Sn_i)
///     Note: Σ Wi = 1 (normalized)
/// 
/// Step 5: Calculate quality rating Qi
///     Qi_i = ((Vn_i - Vo_i) / (Sn_i - Vo_i)) × 100
/// 
/// Step 6: Calculate contribution WiQi
///     WiQi_i = Wi_i × Qi_i
/// 
/// Step 7: Calculate overall WQI
///     WQI = Σ WiQi_i
/// 
/// Where:
///   - Sn = BIS standard (permissible/max value)
///   - Vo = Ideal value (7 for pH, 0 for others)
///   - Vn = Measured mean value
///   - Wi = Relative weight
///   - Qi = Quality rating
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
/// 
/// ============================================================================
/// PARAMETERS
/// ============================================================================
/// 
/// Parameter        Symbol    Sn (BIS)    Vo (Ideal)    Unit
/// ----------------------------------------------------------
/// pH               pH        8.5         7             -
/// Electrical Cond  EC        300         0             µS/cm
/// TDS              TDS       500         0             mg/L
/// Total Hardness   TH        300         0             mg/L
/// Calcium          Ca        75          0             mg/L
/// Magnesium        Mg        30          0             mg/L
/// Iron             Fe        0.3         0             mg/L
/// Fluoride         F         1           0             mg/L
/// Turbidity        Turb      5           0             NTU
/// 
/// ============================================================================
/// Usage Example
/// ============================================================================
/// 
/// ```dart
/// import 'package:your_app/utils/wqi_calculator.dart';
/// 
/// // Calculate WQI from measured values
/// final result = WQICalculator.computeWQIFromMap({
///   'pH': 7.9,
///   'EC': 100.33,
///   'TDS': 67.22,
///   'TH': 40.67,
///   'Ca': 55.61,
///   'Mg': 6.48,
///   'Fe': 0.05,
///   'F': 0.02,
///   'Turb': 1.3,
/// }, sampleId: 'Site 1');
/// 
/// print('WQI: ${result.wqi}');                    // WQI: 15.24
/// print('Classification: ${result.classification}'); // Classification: Excellent
/// ```

// =============================================================================
// MODULAR EXPORTS
// =============================================================================

export 'wqi/models.dart';
export 'wqi/default_standards.dart';
export 'wqi/calculator.dart';
export 'wqi/test_cases.dart';
