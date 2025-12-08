"""
Water Quality Index (WQI) Calculation Module

WQI provides a comprehensive assessment of overall water quality
using all available parameters (heavy metals, ions, physical, chemical).
Formula:
    WQI = Σ(Wi × qi) / Σ(Wi)
    
Where:
    Wi = k / Si  (Weight factor)
    k = 1 / Σ(1/Si)  (Proportionality constant)
    qi = [(Vi - Ii) / (Si - Ii)] × 100  (Quality rating)
    Vi = Observed value
    Ii = Ideal value
    Si = Standard permissible limit
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


def calculate_wqi(data_row: Dict[str, float], standards: List[Dict[str, Any]]) -> float:
    """
    Calculate Water Quality Index (WQI).
    
    Args:
        data_row: Dictionary containing parameter symbols as keys and 
                  observed values (in ppb) as values.
        standards: List of BIS standard dictionaries containing 
                   'symbol', 'Ii', 'Si' keys.
    
    Returns:
        float: Calculated WQI value.
        
    Interpretation:
        - WQI < 50: Excellent
        - WQI 50-100: Good
        - WQI 100-200: Poor
        - WQI > 200: Very Poor
    """
    if not standards:
        logger.warning("No standards provided")
        return 0.0
    
    # Filter standards with valid Si values
    valid_standards = [s for s in standards if s.get('Si', 0) > 0]
    
    if not valid_standards:
        logger.warning("No valid standards with Si > 0")
        return 0.0
    
    # Calculate proportionality constant k
    # k = 1 / Σ(1/Si)
    sum_inverse_si = sum(1 / s['Si'] for s in valid_standards)
    
    if sum_inverse_si == 0:
        logger.warning("Sum of inverse Si is zero")
        return 0.0
    
    k = 1 / sum_inverse_si
    
    wqi_sum = 0.0
    weight_sum = 0.0
    params_processed = 0
    
    for param in valid_standards:
        symbol = param['symbol']
        
        # Check if parameter exists in data and is not None
        if symbol not in data_row or data_row[symbol] is None:
            continue
            
        try:
            vi = float(data_row[symbol])  # Observed value
            ii = float(param['Ii'])        # Ideal value
            si = float(param['Si'])        # Standard permissible limit
            
            # Calculate weight factor
            wi = k / si
            
            # Calculate quality rating (avoid division by zero)
            if (si - ii) != 0:
                qi = ((vi - ii) / (si - ii)) * 100
            else:
                # If Si equals Ii, use simple ratio
                qi = (vi / si) * 100 if si > 0 else 0
            
            wqi_sum += wi * qi
            weight_sum += wi
            params_processed += 1
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Error processing {symbol}: {e}")
            continue
    
    if weight_sum == 0:
        logger.warning("No valid parameters processed for WQI calculation")
        return 0.0
    
    wqi = wqi_sum / weight_sum
    logger.debug(f"WQI calculated: {wqi:.2f} (processed {params_processed} parameters)")
    
    return wqi


def get_wqi_classification(wqi: float) -> str:
    """
    Get water quality classification based on WQI value.
    
    Args:
        wqi: Calculated WQI value
        
    Returns:
        str: Classification string
    """
    if wqi < 50:
        return "Excellent"
    elif wqi < 100:
        return "Good"
    elif wqi < 200:
        return "Poor"
    else:
        return "Very Poor"
