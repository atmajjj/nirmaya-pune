/// Heavy Metal Pollution Index (HPI) Calculator
/// 
/// HPI is a rating model that provides the composite influence of individual
/// heavy metal on the overall water quality. It is a **dimensionless** index that
/// indicates the relative importance of individual quality considerations.
/// 
/// ============================================================================
/// MODULAR STRUCTURE
/// ============================================================================
/// 
/// This file re-exports all HPI calculator components from the modular structure:
/// - hpi/concentration_unit.dart - Unit conversion utilities
/// - hpi/models.dart - Data models (HeavyMetalData, MetalDefinition, WaterSample, HPIResult)
/// - hpi/default_metals.dart - BIS/WHO metal standards
/// - hpi/calculator.dart - Core HPICalculator class
/// - hpi/test_cases.dart - Test case verification
/// 
/// ============================================================================
/// FORMULAS (FOLLOWED EXACTLY AS PER SPECIFICATION)
/// ============================================================================
/// 
/// 1. Unit Weight (Wi):
///    Wi = 1 / Si
/// 
/// 2. Absolute Difference (Di):
///    Di = |Mi - Ii|
/// 
/// 3. Sub-index (Qi):
///    Qi = (Di / (Si - Ii)) x 100
///    Simplified: Qi = (|Mi - Ii| / (Si - Ii)) x 100
/// 
/// 4. Contribution (WiQi):
///    WiQi = Wi x Qi
/// 
/// 5. Final HPI:
///    HPI = Sum(WiQi) / Sum(Wi)
/// 
/// Where:
///   - Mi = Monitored/measured concentration (ug/L or ppb)
///   - Si = Standard permissible limit (ug/L or ppb)
///   - Ii = Ideal value (ug/L or ppb)
/// 
/// **IMPORTANT**: All concentration units are in ppb (ug/L).
/// The resulting HPI is dimensionless.
/// 
/// HPI Classification:
///   - HPI < 25: Excellent - Low pollution
///   - HPI 25-50: Good - Low to medium pollution
///   - HPI 50-75: Poor - Medium pollution
///   - HPI 75-100: Very Poor - High pollution
///   - HPI > 100: Unsuitable - Critical pollution

// =============================================================================
// MODULAR EXPORTS
// =============================================================================

export 'hpi/concentration_unit.dart';
export 'hpi/models.dart';
export 'hpi/default_metals.dart';
export 'hpi/calculator.dart';
export 'hpi/test_cases.dart';
