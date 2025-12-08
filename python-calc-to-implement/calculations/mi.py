"""
Metal Index (MI) Calculation Module

MI provides an average assessment of metal contamination including both
heavy metals and other metals.
Formula:
    MI = Σ(Vi / Si) / n
    
Where:
    Vi = Observed value
    Si = Standard permissible limit
    n = Number of metals present
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


def calculate_mi(data_row: Dict[str, float], standards: List[Dict[str, Any]]) -> float:
    """
    Calculate Metal Index (MI).
    
    Args:
        data_row: Dictionary containing parameter symbols as keys and 
                  observed values (in ppb) as values.
        standards: List of BIS standard dictionaries containing 
                   'symbol', 'Si', and 'category' keys.
    
    Returns:
        float: Calculated MI value.
        
    Interpretation:
        - MI < 1: Acceptable water quality
        - MI > 1: Above permissible limits (contaminated)
    """
    # Filter for all metals (heavy metals + other metals)
    all_metals = [s for s in standards if s.get('category') in ['heavy_metal', 'metal']]
    
    if not all_metals:
        logger.warning("No metal standards found")
        return 0.0
    
    mi_sum = 0.0
    count = 0
    
    for metal in all_metals:
        symbol = metal['symbol']
        
        # Check if parameter exists in data and is not None
        if symbol not in data_row or data_row[symbol] is None:
            continue
            
        try:
            vi = float(data_row[symbol])  # Observed value
            si = float(metal['Si'])        # Standard permissible limit
            
            # Add ratio to sum (avoid division by zero)
            if si > 0:
                mi_sum += vi / si
                count += 1
            else:
                logger.warning(f"Si is zero for {symbol}, skipping")
                
        except (ValueError, TypeError) as e:
            logger.warning(f"Error processing {symbol}: {e}")
            continue
    
    if count == 0:
        logger.warning("No valid metals processed for MI calculation")
        return 0.0
    
    mi = mi_sum / count
    logger.debug(f"MI calculated: {mi:.4f} (processed {count} metals)")
    
    return mi


def get_mi_classification(mi: float) -> str:
    """
    Get water quality classification based on MI value.
    
    Args:
        mi: Calculated MI value
        
    Returns:
        str: Classification string
    """
    if mi < 1:
        return "Acceptable"
    else:
        return "Above permissible limits"
