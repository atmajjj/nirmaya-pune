/// Default Standards for Water Quality Index (WQI) Calculator
/// 
/// BIS (Bureau of Indian Standards) standard values (Sn) and ideal values (Vo)
/// for water quality parameters.
/// 
/// Reference: BIS 10500:2012 and Brown et al. (1972)

import 'models.dart';

/// Default WQI parameter standards
/// 
/// Parameters included:
/// 1. pH
/// 2. EC (Electrical Conductivity)
/// 3. TDS (Total Dissolved Solids)
/// 4. TH (Total Hardness)
/// 5. Calcium
/// 6. Magnesium
/// 7. Iron
/// 8. Fluoride
/// 9. Turbidity
const List<WQIStandardDefinition> DEFAULT_WQI_STANDARDS = [
  // pH - special case with Vo = 7
  WQIStandardDefinition(
    name: 'pH',
    symbol: 'pH',
    sn: 8.5,        // BIS permissible limit
    vo: 7.0,        // Ideal pH (neutral)
    unit: '',
    source: 'BIS 10500:2012',
  ),
  
  // Electrical Conductivity
  WQIStandardDefinition(
    name: 'Electrical Conductivity',
    symbol: 'EC',
    sn: 300.0,      // µS/cm
    vo: 0.0,
    unit: 'µS/cm',
    source: 'BIS 10500:2012',
  ),
  
  // Total Dissolved Solids
  WQIStandardDefinition(
    name: 'Total Dissolved Solids',
    symbol: 'TDS',
    sn: 500.0,      // mg/L
    vo: 0.0,
    unit: 'mg/L',
    source: 'BIS 10500:2012',
  ),
  
  // Total Hardness
  WQIStandardDefinition(
    name: 'Total Hardness',
    symbol: 'TH',
    sn: 300.0,      // mg/L as CaCO3
    vo: 0.0,
    unit: 'mg/L',
    source: 'BIS 10500:2012',
  ),
  
  // Calcium
  WQIStandardDefinition(
    name: 'Calcium',
    symbol: 'Ca',
    sn: 75.0,       // mg/L
    vo: 0.0,
    unit: 'mg/L',
    source: 'BIS 10500:2012',
  ),
  
  // Magnesium
  WQIStandardDefinition(
    name: 'Magnesium',
    symbol: 'Mg',
    sn: 30.0,       // mg/L
    vo: 0.0,
    unit: 'mg/L',
    source: 'BIS 10500:2012',
  ),
  
  // Iron
  WQIStandardDefinition(
    name: 'Iron',
    symbol: 'Fe',
    sn: 0.3,        // mg/L
    vo: 0.0,
    unit: 'mg/L',
    source: 'BIS 10500:2012',
  ),
  
  // Fluoride
  WQIStandardDefinition(
    name: 'Fluoride',
    symbol: 'F',
    sn: 1.0,        // mg/L
    vo: 0.0,
    unit: 'mg/L',
    source: 'BIS 10500:2012',
  ),
  
  // Turbidity
  WQIStandardDefinition(
    name: 'Turbidity',
    symbol: 'Turb',
    sn: 5.0,        // NTU
    vo: 0.0,
    unit: 'NTU',
    source: 'BIS 10500:2012',
  ),
];

/// Get standard definition by symbol (case-insensitive)
WQIStandardDefinition? getWQIStandardBySymbol(String symbol) {
  try {
    return DEFAULT_WQI_STANDARDS.firstWhere(
      (s) => s.symbol.toLowerCase() == symbol.toLowerCase(),
    );
  } catch (_) {
    return null;
  }
}

/// Get standard definition by name (case-insensitive)
WQIStandardDefinition? getWQIStandardByName(String name) {
  try {
    return DEFAULT_WQI_STANDARDS.firstWhere(
      (s) => s.name.toLowerCase() == name.toLowerCase(),
    );
  } catch (_) {
    return null;
  }
}

/// Get Sn (BIS standard) value for a parameter
double? getWQISn(String symbolOrName) {
  final bySymbol = getWQIStandardBySymbol(symbolOrName);
  if (bySymbol != null) return bySymbol.sn;
  
  final byName = getWQIStandardByName(symbolOrName);
  return byName?.sn;
}

/// Get Vo (ideal value) for a parameter
double? getWQIVo(String symbolOrName) {
  final bySymbol = getWQIStandardBySymbol(symbolOrName);
  if (bySymbol != null) return bySymbol.vo;
  
  final byName = getWQIStandardByName(symbolOrName);
  return byName?.vo;
}

/// Get all parameter symbols
List<String> get wqiParameterSymbols => 
    DEFAULT_WQI_STANDARDS.map((s) => s.symbol).toList();

/// Get all parameter names
List<String> get wqiParameterNames => 
    DEFAULT_WQI_STANDARDS.map((s) => s.name).toList();

/// Create a map of symbol to Sn value
Map<String, double> get wqiSnMap => Map.fromEntries(
  DEFAULT_WQI_STANDARDS.map((s) => MapEntry(s.symbol, s.sn))
);

/// Create a map of symbol to Vo value
Map<String, double> get wqiVoMap => Map.fromEntries(
  DEFAULT_WQI_STANDARDS.map((s) => MapEntry(s.symbol, s.vo))
);

/// Create parameters list from standards with optional measured values
List<WQIParameter> createWQIParameters({Map<String, double>? measuredValues}) {
  return DEFAULT_WQI_STANDARDS.map((std) {
    double? vn;
    if (measuredValues != null) {
      // Try to find by symbol or name
      vn = measuredValues[std.symbol] ?? measuredValues[std.name];
    }
    return std.toParameter(vn: vn);
  }).toList();
}
