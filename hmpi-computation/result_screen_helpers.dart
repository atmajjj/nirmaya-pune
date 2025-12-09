import 'package:flutter/material.dart';

/// Common color helper functions for HPI, WQI, and MI
class ColorHelpers {
  // HPI Colors
  static Color getHPIColor(double hpi) {
    if (hpi < 25) return const Color(0xFF4CAF50); // Green
    if (hpi < 50) return const Color(0xFF8BC34A); // Light Green
    if (hpi < 75) return const Color(0xFFFFC107); // Amber
    if (hpi < 100) return const Color(0xFFFF9800); // Orange
    return const Color(0xFFF44336); // Red
  }

  static String getHPIClassification(double hpi) {
    if (hpi < 25) return 'Excellent';
    if (hpi < 50) return 'Good';
    if (hpi < 75) return 'Moderate';
    if (hpi < 100) return 'Poor';
    return 'Critical';
  }

  // WQI Colors
  static Color getWQIColor(double wqi) {
    if (wqi <= 25) return const Color(0xFF4CAF50); // Green
    if (wqi <= 50) return const Color(0xFF8BC34A); // Light Green
    if (wqi <= 75) return const Color(0xFFFFC107); // Amber
    if (wqi <= 100) return const Color(0xFFFF9800); // Orange
    return const Color(0xFFF44336); // Red
  }

  static String getWQIClassification(double wqi) {
    if (wqi <= 25) return 'Excellent';
    if (wqi <= 50) return 'Good';
    if (wqi <= 75) return 'Poor';
    if (wqi <= 100) return 'Very Poor';
    return 'Unfit';
  }

  // MI Colors
  static Color getMIColor(double mi) {
    if (mi < 0.3) return const Color(0xFF2196F3); // Blue
    if (mi < 1) return const Color(0xFF4CAF50); // Green
    if (mi < 2) return const Color(0xFF8BC34A); // Light Green
    if (mi < 4) return const Color(0xFFFFC107); // Amber
    if (mi < 6) return const Color(0xFFFF9800); // Orange
    return const Color(0xFFF44336); // Red
  }

  static String getMIClassification(double mi) {
    if (mi < 0.3) return 'Very Pure';
    if (mi < 1) return 'Pure';
    if (mi < 2) return 'Slightly Affected';
    if (mi < 4) return 'Moderately Affected';
    if (mi < 6) return 'Strongly Affected';
    return 'Seriously Affected';
  }
}

/// Pagination helper for large datasets
class PaginationHelper {
  /// Get total number of pages
  static int getTotalPages(int totalItems, int itemsPerPage) {
    return (totalItems / itemsPerPage).ceil();
  }

  /// Get items for current page
  static List<T> getPageItems<T>(List<T> items, int currentPage, int itemsPerPage) {
    final startIndex = currentPage * itemsPerPage;
    final endIndex = (startIndex + itemsPerPage).clamp(0, items.length);
    
    if (startIndex >= items.length) return [];
    return items.sublist(startIndex, endIndex);
  }

  /// Check if can go to next page
  static bool canGoNext(int currentPage, int totalPages) => currentPage < totalPages - 1;
  
  /// Check if can go to previous page
  static bool canGoPrevious(int currentPage) => currentPage > 0;
}

/// Format helper functions
class FormatHelpers {
  /// Format number to fixed decimal places
  static String formatDecimal(double value, int decimals) {
    return value.toStringAsFixed(decimals);
  }

  /// Format number to fixed decimal places (alternative name)
  static String formatValue(double value, {int decimals = 2}) {
    return value.toStringAsFixed(decimals);
  }

  /// Format large numbers with commas
  static String formatLargeNumber(int value) {
    return value.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }

  /// Get ordinal suffix (1st, 2nd, 3rd, etc.)
  static String getOrdinal(int number) {
    if (number % 100 >= 11 && number % 100 <= 13) {
      return '${number}th';
    }
    
    switch (number % 10) {
      case 1:
        return '${number}st';
      case 2:
        return '${number}nd';
      case 3:
        return '${number}rd';
      default:
        return '${number}th';
    }
  }
}

/// Validation helpers
class ValidationHelpers {
  /// Check if value is valid (not null, not NaN, finite)
  static bool isValidNumber(double? value) {
    if (value == null) return false;
    if (value.isNaN) return false;
    if (value.isInfinite) return false;
    return true;
  }

  /// Get safe value or default
  static double getSafeValue(double? value, {double defaultValue = 0.0}) {
    return isValidNumber(value) ? value! : defaultValue;
  }
}
