"""
Unit Converter Module

Handles conversion of measurement units to ppb (parts per billion).
All BIS standards are in ppb, so input values must be converted.
"""

from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Valid input units
VALID_UNITS = ["mg/L", "µg/L", "ug/L", "ppb", "ppm"]

# Conversion factors to ppb
CONVERSION_FACTORS = {
    "mg/L": 1000,      # mg/L to µg/L (ppb)
    "ppm": 1000,       # ppm is equivalent to mg/L
    "µg/L": 1,         # Already in ppb
    "ug/L": 1,         # Alternative notation for µg/L
    "ppb": 1           # Already in ppb
}


def convert_to_ppb(value: float, input_unit: str) -> float:
    """
    Convert a value from the input unit to ppb.
    
    Args:
        value: The numeric value to convert
        input_unit: The unit of the input value ("mg/L" or "µg/L")
    
    Returns:
        float: Value converted to ppb
        
    Raises:
        ValueError: If input_unit is not valid
    """
    # Normalize unit string
    unit = input_unit.strip()
    
    if unit not in CONVERSION_FACTORS:
        raise ValueError(f"Invalid unit: {unit}. Valid units are: {list(CONVERSION_FACTORS.keys())}")
    
    conversion_factor = CONVERSION_FACTORS[unit]
    converted_value = value * conversion_factor
    
    logger.debug(f"Converted {value} {unit} to {converted_value} ppb")
    
    return converted_value


def convert_row_to_ppb(
    data_row: Dict[str, Any], 
    input_unit: str, 
    exclude_columns: Optional[list] = None
) -> Dict[str, float]:
    """
    Convert all numeric values in a data row to ppb.
    
    Args:
        data_row: Dictionary with parameter names as keys and values
        input_unit: The unit of the input values
        exclude_columns: List of column names to exclude from conversion
    
    Returns:
        Dictionary with converted values
    """
    if exclude_columns is None:
        exclude_columns = []
    
    converted = {}
    
    for key, value in data_row.items():
        # Skip excluded columns
        if key in exclude_columns:
            continue
            
        # Skip None or NaN values
        if value is None or (isinstance(value, float) and value != value):  # NaN check
            continue
        
        try:
            # Convert to float first
            numeric_value = float(value)
            # Convert to ppb
            converted[key] = convert_to_ppb(numeric_value, input_unit)
        except (ValueError, TypeError) as e:
            logger.warning(f"Could not convert value for {key}: {value} - {e}")
            continue
    
    return converted


def validate_unit(unit: str) -> bool:
    """
    Validate if the provided unit is supported.
    
    Args:
        unit: Unit string to validate
    
    Returns:
        bool: True if valid, False otherwise
    """
    return unit.strip() in CONVERSION_FACTORS


def get_conversion_info() -> str:
    """
    Get information about supported units and conversions.
    
    Returns:
        String with conversion information
    """
    info = "Supported units and conversion factors to ppb:\n"
    for unit, factor in CONVERSION_FACTORS.items():
        info += f"  - {unit}: multiply by {factor}\n"
    return info
