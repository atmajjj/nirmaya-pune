import 'package:flutter/material.dart';

/// Helper functions for result classification, colors, and descriptions

class ResultHelpers {
  // HPI Helpers
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

  static String getHPIDescription(double hpi) {
    if (hpi < 25) return 'Water quality is excellent with minimal heavy metal pollution.';
    if (hpi < 50) return 'Water quality is good but shows some heavy metal presence.';
    if (hpi < 75) return 'Water quality is moderate with noticeable heavy metal levels.';
    if (hpi < 100) return 'Water quality is poor with significant heavy metal contamination.';
    return 'Water quality is critical with severe heavy metal pollution requiring immediate attention.';
  }

  // WQI Helpers
  static Color getWQIColor(double wqi) {
    if (wqi < 50) return const Color(0xFF4CAF50); // Green
    if (wqi < 100) return const Color(0xFF8BC34A); // Light Green
    if (wqi < 200) return const Color(0xFFFFC107); // Amber
    if (wqi < 300) return const Color(0xFFFF9800); // Orange
    return const Color(0xFFF44336); // Red
  }

  static String getWQIClassification(double wqi) {
    if (wqi < 50) return 'Excellent';
    if (wqi < 100) return 'Good';
    if (wqi < 200) return 'Poor';
    if (wqi < 300) return 'Very Poor';
    return 'Unsuitable';
  }

  static String getWQIDescription(double wqi) {
    if (wqi < 50) return 'Water quality is excellent and safe for all purposes.';
    if (wqi < 100) return 'Water quality is good and generally safe for use.';
    if (wqi < 200) return 'Water quality is poor and may require treatment before use.';
    if (wqi < 300) return 'Water quality is very poor with significant contamination.';
    return 'Water quality is unsuitable for use and requires extensive treatment.';
  }

  // MI Helpers
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
    if (mi < 2) return 'Slight';
    if (mi < 4) return 'Moderate';
    if (mi < 6) return 'Strong';
    return 'Serious';
  }

  static String getMIDescription(double mi) {
    if (mi < 0.3) return 'Water is very pure with minimal metal contamination.';
    if (mi < 1) return 'Water is pure with acceptable metal levels.';
    if (mi < 2) return 'Water is slightly affected by metal pollution.';
    if (mi < 4) return 'Water is moderately affected by metal contamination.';
    if (mi < 6) return 'Water is strongly affected by metal pollution.';
    return 'Water is seriously affected by heavy metal pollution requiring immediate remediation.';
  }
}
