/// Supported concentration units
enum ConcentrationUnit {
  mgL,   // mg/L (milligrams per liter) - same as ppm
  ugL,   // µg/L (micrograms per liter) - same as ppb
  ppb,   // parts per billion - same as µg/L
  ppm,   // parts per million - same as mg/L
}

/// Unit conversion utility class
class UnitConverter {
  /// Convert concentration value to ppb (µg/L)
  /// 
  /// Conversion factors:
  /// - 1 mg/L = 1 ppm = 1000 ppb = 1000 µg/L
  /// - 1 µg/L = 1 ppb
  static double toPpb(double value, ConcentrationUnit unit) {
    switch (unit) {
      case ConcentrationUnit.mgL:
      case ConcentrationUnit.ppm:
        return value * 1000.0; // Convert mg/L to µg/L
      case ConcentrationUnit.ugL:
      case ConcentrationUnit.ppb:
        return value; // Already in ppb/µg/L
    }
  }

  /// Convert concentration value to mg/L
  /// 
  /// Conversion factors:
  /// - 1 mg/L = 1 ppm
  /// - 1 µg/L = 1 ppb = 0.001 mg/L
  static double toMgL(double value, ConcentrationUnit unit) {
    switch (unit) {
      case ConcentrationUnit.mgL:
      case ConcentrationUnit.ppm:
        return value; // Already in mg/L equivalent
      case ConcentrationUnit.ugL:
      case ConcentrationUnit.ppb:
        return value / 1000.0; // Convert µg/L to mg/L
    }
  }

  /// Get display string for unit
  static String getUnitString(ConcentrationUnit unit) {
    switch (unit) {
      case ConcentrationUnit.mgL:
        return 'mg/L';
      case ConcentrationUnit.ugL:
        return 'µg/L';
      case ConcentrationUnit.ppb:
        return 'ppb';
      case ConcentrationUnit.ppm:
        return 'ppm';
    }
  }

  /// Parse unit from string (case-insensitive)
  static ConcentrationUnit? parseUnit(String unitStr) {
    final normalized = unitStr.toLowerCase().replaceAll(' ', '').replaceAll('/', '');
    if (normalized.contains('mgl') || normalized == 'mg/l') {
      return ConcentrationUnit.mgL;
    } else if (normalized.contains('ugl') || normalized.contains('µgl') || normalized == 'ug/l' || normalized == 'µg/l') {
      return ConcentrationUnit.ugL;
    } else if (normalized.contains('ppb')) {
      return ConcentrationUnit.ppb;
    } else if (normalized.contains('ppm')) {
      return ConcentrationUnit.ppm;
    }
    return null;
  }

  /// Get conversion info text
  static String getConversionInfo(ConcentrationUnit from) {
    switch (from) {
      case ConcentrationUnit.mgL:
      case ConcentrationUnit.ppm:
        return 'Values in ${getUnitString(from)} (converted to ppb ×1000)';
      case ConcentrationUnit.ugL:
      case ConcentrationUnit.ppb:
        return 'Values in ${getUnitString(from)} (no conversion needed)';
    }
  }
}