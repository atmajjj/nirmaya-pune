/// Metal Index (MI) Calculator Module
/// 
/// Metal Index calculation utility for water quality assessment.
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
/// 
/// ============================================================================
/// Usage Example
/// ============================================================================
/// 
/// ```dart
/// import 'package:your_app/utils/mi_calculator.dart';
/// 
/// // Calculate MI from concentration map
/// final result = MICalculator.calculateMIFromMap({
///   'As': 269.58,
///   'Cd': 6.22,
///   'Cu': 554.98,
///   'Pb': 10.59,
///   'Hg': 0.17,
///   'Ni': 61.83,
///   'Zn': 2587.05,
/// }, customMAC: {
///   'As': 50.0,
///   'Cd': 3.0,
///   'Cu': 1500.0,
///   'Pb': 10.0,
///   'Hg': 1.0,
///   'Ni': 20.0,
///   'Zn': 15000.0,
/// });
/// 
/// print('MI: ${result.mi}');           // MI: 12.3292525
/// print('Class: ${result.classNumber}'); // Class: Class VI
/// print('Classification: ${result.classification}'); // Seriously Affected
/// ```

// =============================================================================
// MODULAR EXPORTS
// =============================================================================

export 'mi/models.dart';
export 'mi/default_mac.dart';
export 'mi/calculator.dart';
export 'mi/test_cases.dart';
