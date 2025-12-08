"""
Heavy Metal Pollution Index (HPI) Calculation Module

HPI is used to evaluate the combined effect of heavy metals on water quality.
Formula:
    HPI = Σ(Wi × Qi) / Σ(Wi)
    
Where:
    Wi = Si / Σ(Si)  (Weight factor)
    Qi = [(Vi - Ii) / (Si - Ii)] × 100  (Sub-index)
    Vi = Observed value (in ppb)
    Ii = Ideal value (from BIS standards)
    Si = Standard permissible limit (from BIS standards)
"""

from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


def calculate_hpi(data_row: Dict[str, float], standards: List[Dict[str, Any]]) -> float:
    """
    Calculate Heavy Metal Pollution Index (HPI).
    
    Args:
        data_row: Dictionary containing parameter symbols as keys and 
                  observed values (in ppb) as values.
        standards: List of BIS standard dictionaries containing 
                   'symbol', 'Ii', 'Si', and 'category' keys.
    
    Returns:
        float: Calculated HPI value.
        
    Interpretation:
        - HPI < 100: Low pollution
        - HPI 100-200: Medium pollution
        - HPI > 200: High pollution
    """
    # Filter for heavy metals only
    heavy_metals = [s for s in standards if s.get('category') == 'heavy_metal']
    
    if not heavy_metals:
        logger.warning("No heavy metal standards found")
        return 0.0
    
    # Calculate total Si for weight calculation
    total_si = sum(s['Si'] for s in heavy_metals if s['Si'] > 0)
    
    if total_si == 0:
        logger.warning("Total Si is zero, cannot calculate weights")
        return 0.0
    
    hpi_sum = 0.0
    weight_sum = 0.0
    metals_processed = 0
    
    for metal in heavy_metals:
        symbol = metal['symbol']
        
        # Check if parameter exists in data and is not None
        if symbol not in data_row or data_row[symbol] is None:
            continue
            
        try:
            vi = float(data_row[symbol])  # Observed value
            ii = float(metal['Ii'])        # Ideal value
            si = float(metal['Si'])        # Standard permissible limit
            
            # Calculate weight factor
            wi = si / total_si
            
            # Calculate sub-index (avoid division by zero)
            if (si - ii) != 0:
                qi = ((vi - ii) / (si - ii)) * 100
            else:
                # If Si equals Ii, use simple ratio
                qi = (vi / si) * 100 if si > 0 else 0
            
            hpi_sum += wi * qi
            weight_sum += wi
            metals_processed += 1
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Error processing {symbol}: {e}")
            continue
    
    if weight_sum == 0:
        logger.warning("No valid metals processed for HPI calculation")
        return 0.0
    
    hpi = hpi_sum / weight_sum
    logger.debug(f"HPI calculated: {hpi:.2f} (processed {metals_processed} metals)")
    
    return hpi


def get_hpi_classification(hpi: float) -> str:
    """
    Get pollution classification based on HPI value.
    
    Args:
        hpi: Calculated HPI value
        
    Returns:
        str: Classification string ('Low', 'Medium', 'High')
    """
    if hpi < 100:
        return "Low pollution"
    elif hpi < 200:
        return "Medium pollution"
    else:
        return "High pollution"
