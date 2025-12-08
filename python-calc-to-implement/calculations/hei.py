"""
Heavy Metal Evaluation Index (HEI) Calculation Module

HEI provides a simple cumulative assessment of heavy metal contamination.
Formula:
    HEI = Σ(Vi / Si)
    
Where:
    Vi = Observed value
    Si = Standard permissible limit
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


def calculate_hei(data_row: Dict[str, float], standards: List[Dict[str, Any]]) -> float:
    """
    Calculate Heavy Metal Evaluation Index (HEI).
    
    Args:
        data_row: Dictionary containing parameter symbols as keys and 
                  observed values (in ppb) as values.
        standards: List of BIS standard dictionaries containing 
                   'symbol', 'Si', and 'category' keys.
    
    Returns:
        float: Calculated HEI value.
        
    Interpretation:
        - HEI < 10: Low contamination
        - HEI 10-20: Medium contamination
        - HEI > 20: High contamination
    """
    # Filter for heavy metals only
    heavy_metals = [s for s in standards if s.get('category') == 'heavy_metal']
    
    if not heavy_metals:
        logger.warning("No heavy metal standards found")
        return 0.0
    
    hei = 0.0
    metals_processed = 0
    
    for metal in heavy_metals:
        symbol = metal['symbol']
        
        # Check if parameter exists in data and is not None
        if symbol not in data_row or data_row[symbol] is None:
            continue
            
        try:
            vi = float(data_row[symbol])  # Observed value
            si = float(metal['Si'])        # Standard permissible limit
            
            # Add ratio to HEI (avoid division by zero)
            if si > 0:
                hei += vi / si
                metals_processed += 1
            else:
                logger.warning(f"Si is zero for {symbol}, skipping")
                
        except (ValueError, TypeError) as e:
            logger.warning(f"Error processing {symbol}: {e}")
            continue
    
    logger.debug(f"HEI calculated: {hei:.2f} (processed {metals_processed} metals)")
    
    return hei


def get_hei_classification(hei: float) -> str:
    """
    Get contamination classification based on HEI value.
    
    Args:
        hei: Calculated HEI value
        
    Returns:
        str: Classification string
    """
    if hei < 10:
        return "Low contamination"
    elif hei < 20:
        return "Medium contamination"
    else:
        return "High contamination"
