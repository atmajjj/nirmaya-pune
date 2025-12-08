"""
Degree of Contamination (Cdeg) Calculation Module

Cdeg provides a cumulative measure of contamination by summing
contamination factors for each heavy metal.
Formula:
    Cdeg = Σ(Cfi)
    
Where:
    Cfi = (Vi / Si) - 1  (Contamination factor)
    Vi = Observed value
    Si = Standard permissible limit
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


def calculate_cdeg(data_row: Dict[str, float], standards: List[Dict[str, Any]]) -> float:
    """
    Calculate Degree of Contamination (Cdeg).
    
    Args:
        data_row: Dictionary containing parameter symbols as keys and 
                  observed values (in ppb) as values.
        standards: List of BIS standard dictionaries containing 
                   'symbol', 'Si', and 'category' keys.
    
    Returns:
        float: Calculated Cdeg value.
        
    Interpretation:
        - Cdeg < 1: Low contamination
        - Cdeg 1-3: Medium contamination
        - Cdeg > 3: High contamination
    """
    # Filter for heavy metals only
    heavy_metals = [s for s in standards if s.get('category') == 'heavy_metal']
    
    if not heavy_metals:
        logger.warning("No heavy metal standards found")
        return 0.0
    
    cdeg = 0.0
    metals_processed = 0
    
    for metal in heavy_metals:
        symbol = metal['symbol']
        
        # Check if parameter exists in data and is not None
        if symbol not in data_row or data_row[symbol] is None:
            continue
            
        try:
            vi = float(data_row[symbol])  # Observed value
            si = float(metal['Si'])        # Standard permissible limit
            
            # Calculate contamination factor (avoid division by zero)
            if si > 0:
                cfi = (vi / si) - 1
                cdeg += cfi
                metals_processed += 1
            else:
                logger.warning(f"Si is zero for {symbol}, skipping")
                
        except (ValueError, TypeError) as e:
            logger.warning(f"Error processing {symbol}: {e}")
            continue
    
    logger.debug(f"Cdeg calculated: {cdeg:.2f} (processed {metals_processed} metals)")
    
    return cdeg


def get_cdeg_classification(cdeg: float) -> str:
    """
    Get contamination classification based on Cdeg value.
    
    Args:
        cdeg: Calculated Cdeg value
        
    Returns:
        str: Classification string
    """
    if cdeg < 1:
        return "Low contamination"
    elif cdeg < 3:
        return "Medium contamination"
    else:
        return "High contamination"
