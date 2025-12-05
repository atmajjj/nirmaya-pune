import 'models/metal_models.dart';

/// Default metal definitions based on BIS 10500:2012 and WHO Guidelines
/// All values are in ppb (µg/L)
/// 
/// Sources:
/// - BIS 10500:2012 (Indian Standard for Drinking Water)
/// - WHO Guidelines for Drinking-water Quality (4th Edition)
/// 
/// Heavy metals included:
/// 1. Arsenic (As)      2. Copper (Cu)       3. Zinc (Zn)
/// 4. Mercury (Hg)      5. Cadmium (Cd)      6. Nickel (Ni)
/// 7. Lead (Pb)         8. Chromium (Cr)     9. Iron (Fe)
/// 10. Manganese (Mn)   11. Aluminum (Al)    12. Barium (Ba)
/// 13. Boron (B)        14. Selenium (Se)    15. Silver (Ag)
/// 16. Molybdenum (Mo)  17. Antimony (Sb)    18. Cobalt (Co)
/// 19. Vanadium (V)     20. Uranium (U)
const List<MetalDefinition> DEFAULT_METALS = [
  // ===== PRIMARY HEAVY METALS (Original 7 from test case) =====
  MetalDefinition(
    symbol: 'As',
    name: 'Arsenic',
    standardLimit: 50,    // Si = 50 ppb (BIS relaxation limit)
    idealValue: 10,       // Ii = 10 ppb
    bisLimit: 50,
    whoLimit: 10,
  ),
  MetalDefinition(
    symbol: 'Cu',
    name: 'Copper',
    standardLimit: 1500,  // Si = 1500 ppb
    idealValue: 50,       // Ii = 50 ppb
    bisLimit: 1500,
    whoLimit: 2000,
  ),
  MetalDefinition(
    symbol: 'Zn',
    name: 'Zinc',
    standardLimit: 15000, // Si = 15000 ppb
    idealValue: 5000,     // Ii = 5000 ppb
    bisLimit: 15000,
    whoLimit: 3000,
  ),
  MetalDefinition(
    symbol: 'Hg',
    name: 'Mercury',
    standardLimit: 2,     // Si = 2 ppb
    idealValue: 1,        // Ii = 1 ppb
    bisLimit: 1,
    whoLimit: 6,
  ),
  MetalDefinition(
    symbol: 'Cd',
    name: 'Cadmium',
    standardLimit: 5,     // Si = 5 ppb
    idealValue: 3,        // Ii = 3 ppb
    bisLimit: 3,
    whoLimit: 3,
  ),
  MetalDefinition(
    symbol: 'Ni',
    name: 'Nickel',
    standardLimit: 70,    // Si = 70 ppb
    idealValue: 20,       // Ii = 20 ppb
    bisLimit: 20,
    whoLimit: 70,
  ),
  MetalDefinition(
    symbol: 'Pb',
    name: 'Lead',
    standardLimit: 10,    // Si = 10 ppb
    idealValue: 0,        // Ii = 0 ppb (no safe level)
    bisLimit: 10,
    whoLimit: 10,
  ),
  
  // ===== SECONDARY HEAVY METALS =====
  MetalDefinition(
    symbol: 'Cr',
    name: 'Chromium',
    standardLimit: 50,    // Si = 50 ppb (total Cr)
    idealValue: 0,        // Ii = 0 ppb
    bisLimit: 50,
    whoLimit: 50,
  ),
  MetalDefinition(
    symbol: 'Fe',
    name: 'Iron',
    standardLimit: 300,   // Si = 300 ppb
    idealValue: 100,      // Ii = 100 ppb
    bisLimit: 300,
    whoLimit: 300,
  ),
  MetalDefinition(
    symbol: 'Mn',
    name: 'Manganese',
    standardLimit: 300,   // Si = 300 ppb
    idealValue: 100,      // Ii = 100 ppb
    bisLimit: 300,
    whoLimit: 400,
  ),
  
  // ===== ADDITIONAL HEAVY METALS =====
  MetalDefinition(
    symbol: 'Al',
    name: 'Aluminum',
    standardLimit: 200,   // Si = 200 ppb
    idealValue: 30,       // Ii = 30 ppb
    bisLimit: 200,        // BIS: 0.2 mg/L = 200 ppb
    whoLimit: 200,        // WHO: 0.2 mg/L = 200 ppb (practical)
  ),
  MetalDefinition(
    symbol: 'Ba',
    name: 'Barium',
    standardLimit: 700,   // Si = 700 ppb
    idealValue: 100,      // Ii = 100 ppb
    bisLimit: 700,        // BIS: 0.7 mg/L = 700 ppb
    whoLimit: 1300,       // WHO: 1.3 mg/L = 1300 ppb
  ),
  MetalDefinition(
    symbol: 'B',
    name: 'Boron',
    standardLimit: 1000,  // Si = 1000 ppb
    idealValue: 500,      // Ii = 500 ppb
    bisLimit: 1000,       // BIS: 1.0 mg/L = 1000 ppb
    whoLimit: 2400,       // WHO: 2.4 mg/L = 2400 ppb
  ),
  MetalDefinition(
    symbol: 'Se',
    name: 'Selenium',
    standardLimit: 40,    // Si = 40 ppb
    idealValue: 10,       // Ii = 10 ppb
    bisLimit: 10,         // BIS: 0.01 mg/L = 10 ppb
    whoLimit: 40,         // WHO: 0.04 mg/L = 40 ppb
  ),
  MetalDefinition(
    symbol: 'Ag',
    name: 'Silver',
    standardLimit: 100,   // Si = 100 ppb
    idealValue: 10,       // Ii = 10 ppb
    bisLimit: 100,        // BIS: 0.1 mg/L = 100 ppb
    whoLimit: 100,        // WHO: Not established (aesthetic)
  ),
  MetalDefinition(
    symbol: 'Mo',
    name: 'Molybdenum',
    standardLimit: 70,    // Si = 70 ppb
    idealValue: 10,       // Ii = 10 ppb
    bisLimit: 70,         // BIS: 0.07 mg/L = 70 ppb
    whoLimit: 70,         // WHO: 0.07 mg/L = 70 ppb
  ),
  MetalDefinition(
    symbol: 'Sb',
    name: 'Antimony',
    standardLimit: 20,    // Si = 20 ppb
    idealValue: 5,        // Ii = 5 ppb
    bisLimit: 20,         // BIS: 0.02 mg/L = 20 ppb (proposed)
    whoLimit: 20,         // WHO: 0.02 mg/L = 20 ppb
  ),
  MetalDefinition(
    symbol: 'Co',
    name: 'Cobalt',
    standardLimit: 50,    // Si = 50 ppb
    idealValue: 10,       // Ii = 10 ppb
    bisLimit: 50,         // BIS: Not specified, using common value
    whoLimit: 50,         // WHO: Not established
  ),
  MetalDefinition(
    symbol: 'V',
    name: 'Vanadium',
    standardLimit: 100,   // Si = 100 ppb
    idealValue: 15,       // Ii = 15 ppb
    bisLimit: 100,        // BIS: Not specified
    whoLimit: 100,        // WHO: Provisional
  ),
  MetalDefinition(
    symbol: 'U',
    name: 'Uranium',
    standardLimit: 30,    // Si = 30 ppb
    idealValue: 2,        // Ii = 2 ppb
    bisLimit: 30,         // BIS: 0.03 mg/L = 30 ppb
    whoLimit: 30,         // WHO: 0.03 mg/L = 30 ppb
  ),
  
  // ===== ADDITIONAL TOXIC METALS =====
  MetalDefinition(
    symbol: 'Sn',
    name: 'Tin',
    standardLimit: 100,   // Si = 100 ppb (inorganic)
    idealValue: 10,       // Ii = 10 ppb
    bisLimit: 100,        // BIS: Not specified
    whoLimit: 100,        // WHO: Not health-based
  ),
  MetalDefinition(
    symbol: 'Ti',
    name: 'Titanium',
    standardLimit: 100,   // Si = 100 ppb
    idealValue: 10,       // Ii = 10 ppb
    bisLimit: 100,        // BIS: Not specified
    whoLimit: 100,        // WHO: Not established
  ),
  MetalDefinition(
    symbol: 'Tl',
    name: 'Thallium',
    standardLimit: 2,     // Si = 2 ppb (highly toxic)
    idealValue: 0,        // Ii = 0 ppb
    bisLimit: 2,          // BIS: Not specified
    whoLimit: 2,          // WHO: Provisional
  ),
  MetalDefinition(
    symbol: 'Be',
    name: 'Beryllium',
    standardLimit: 4,     // Si = 4 ppb
    idealValue: 0,        // Ii = 0 ppb
    bisLimit: 4,          // BIS: Not specified
    whoLimit: 4,          // WHO: Provisional
  ),
  MetalDefinition(
    symbol: 'Bi',
    name: 'Bismuth',
    standardLimit: 50,    // Si = 50 ppb
    idealValue: 5,        // Ii = 5 ppb
    bisLimit: 50,         // BIS: Not specified
    whoLimit: 50,         // WHO: Not established
  ),
];