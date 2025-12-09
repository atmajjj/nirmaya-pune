/// Default MAC (Maximum Allowable Concentration) Values for MI Calculator
/// 
/// Reference MAC values from drinking water standards.
/// All values are in ppb (µg/L).
/// 
/// Note: Original values in mg/L are converted to ppb by multiplying by 1000.
/// 
/// Sources:
/// - WHO Guidelines for Drinking-water Quality
/// - BIS 10500:2012

import 'models.dart';

/// Default MAC values for heavy metals
/// All values in ppb (µg/L)
const List<MACDefinition> DEFAULT_MAC_VALUES = [
  // High toxicity metals (low MAC)
  MACDefinition(
    symbol: 'Hg',
    name: 'Mercury',
    mac: 1,        // 0.001 mg/L = 1 ppb (WHO)
    source: 'WHO',
  ),
  MACDefinition(
    symbol: 'Cd',
    name: 'Cadmium',
    mac: 3,        // 0.003 mg/L = 3 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'As',
    name: 'Arsenic',
    mac: 50,       // 0.05 mg/L = 50 ppb (BIS relaxation limit)
    source: 'BIS',
  ),
  MACDefinition(
    symbol: 'Pb',
    name: 'Lead',
    mac: 10,       // 0.01 mg/L = 10 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Se',
    name: 'Selenium',
    mac: 10,       // 0.01 mg/L = 10 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Ni',
    name: 'Nickel',
    mac: 20,       // 0.02 mg/L = 20 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Cr',
    name: 'Chromium',
    mac: 50,       // 0.05 mg/L = 50 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Mo',
    name: 'Molybdenum',
    mac: 70,       // 0.07 mg/L = 70 ppb
    source: 'WHO',
  ),
  MACDefinition(
    symbol: 'Ag',
    name: 'Silver',
    mac: 100,      // 0.1 mg/L = 100 ppb
    source: 'WHO',
  ),
  MACDefinition(
    symbol: 'Mn',
    name: 'Manganese',
    mac: 100,      // 0.1 mg/L = 100 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Al',
    name: 'Aluminum',
    mac: 200,      // 0.2 mg/L = 200 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Fe',
    name: 'Iron',
    mac: 300,      // 0.3 mg/L = 300 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Cu',
    name: 'Copper',
    mac: 1500,     // 1.5 mg/L = 1500 ppb
    source: 'BIS',
  ),
  MACDefinition(
    symbol: 'F',
    name: 'Fluoride',
    mac: 1500,     // 1.5 mg/L = 1500 ppb
    source: 'WHO/BIS',
  ),
  MACDefinition(
    symbol: 'Zn',
    name: 'Zinc',
    mac: 15000,    // 15 mg/L = 15000 ppb
    source: 'BIS',
  ),
  
  // Additional metals (using reference values from test case)
  MACDefinition(
    symbol: 'B',
    name: 'Boron',
    mac: 1000,     // 1 mg/L = 1000 ppb
    source: 'BIS',
  ),
  MACDefinition(
    symbol: 'Ba',
    name: 'Barium',
    mac: 700,      // 0.7 mg/L = 700 ppb
    source: 'BIS',
  ),
  MACDefinition(
    symbol: 'Co',
    name: 'Cobalt',
    mac: 50,       // Reference value
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'V',
    name: 'Vanadium',
    mac: 100,      // Reference value
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'U',
    name: 'Uranium',
    mac: 30,       // 0.03 mg/L = 30 ppb
    source: 'WHO',
  ),
  MACDefinition(
    symbol: 'Sb',
    name: 'Antimony',
    mac: 20,       // 0.02 mg/L = 20 ppb
    source: 'WHO',
  ),
  MACDefinition(
    symbol: 'Tl',
    name: 'Thallium',
    mac: 2,        // Highly toxic
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'Be',
    name: 'Beryllium',
    mac: 4,        // 0.004 mg/L = 4 ppb
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'Bi',
    name: 'Bismuth',
    mac: 50,       // Reference value
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'Sn',
    name: 'Tin',
    mac: 100,      // Reference value
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'Ti',
    name: 'Titanium',
    mac: 100,      // Reference value
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'Sr',
    name: 'Strontium',
    mac: 4000,     // 4 mg/L = 4000 ppb
    source: 'WHO',
  ),
  MACDefinition(
    symbol: 'Li',
    name: 'Lithium',
    mac: 40,       // Reference value
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'Ga',
    name: 'Gallium',
    mac: 100,      // Reference value (not commonly regulated)
    source: 'Reference',
  ),
  MACDefinition(
    symbol: 'Te',
    name: 'Tellurium',
    mac: 10,       // Reference value
    source: 'Reference',
  ),
];

/// Get MAC definition by symbol (case-insensitive)
MACDefinition? getMACBySymbol(String symbol) {
  try {
    return DEFAULT_MAC_VALUES.firstWhere(
      (m) => m.symbol.toLowerCase() == symbol.toLowerCase(),
    );
  } catch (_) {
    return null;
  }
}

/// Get MAC definition by name (case-insensitive)
MACDefinition? getMACByName(String name) {
  try {
    return DEFAULT_MAC_VALUES.firstWhere(
      (m) => m.name.toLowerCase() == name.toLowerCase(),
    );
  } catch (_) {
    return null;
  }
}

/// Get MAC value for a metal symbol
/// Returns null if metal not found
double? getMACValue(String symbolOrName) {
  final bySymbol = getMACBySymbol(symbolOrName);
  if (bySymbol != null) return bySymbol.mac;
  
  final byName = getMACByName(symbolOrName);
  return byName?.mac;
}

/// Get all metal symbols with MAC values
List<String> get macMetalSymbols => DEFAULT_MAC_VALUES.map((m) => m.symbol).toList();

/// Get all metal names with MAC values
List<String> get macMetalNames => DEFAULT_MAC_VALUES.map((m) => m.name).toList();

/// Create a map of symbol to MAC value
Map<String, double> get macValuesMap => Map.fromEntries(
  DEFAULT_MAC_VALUES.map((m) => MapEntry(m.symbol, m.mac))
);
