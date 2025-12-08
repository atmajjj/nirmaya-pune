"""
Pollution Index of Groundwater (PIG) Calculation Module

PIG is a composite index that combines HPI and HEI to provide
a comprehensive pollution assessment.
Formula:
    PIG = √[(HPI/100)² + (HEI)²] / √2
"""

from typing import Optional
import logging
import math

logger = logging.getLogger(__name__)


def calculate_pig(hpi: float, hei: float) -> float:
    """
    Calculate Pollution Index of Groundwater (PIG).
    
    Args:
        hpi: Heavy Metal Pollution Index value
        hei: Heavy Metal Evaluation Index value
    
    Returns:
        float: Calculated PIG value.
        
    Note:
        PIG is a composite index that combines HPI and HEI.
        Higher values indicate greater pollution.
    """
    try:
        # Validate inputs
        if hpi is None or hei is None:
            logger.warning("HPI or HEI is None, returning 0")
            return 0.0
        
        # Calculate PIG using composite method
        # PIG = √[(HPI/100)² + (HEI)²] / √2
        hpi_normalized = hpi / 100  # Normalize HPI
        
        pig = math.sqrt((hpi_normalized ** 2) + (hei ** 2)) / math.sqrt(2)
        
        logger.debug(f"PIG calculated: {pig:.4f} (HPI={hpi:.2f}, HEI={hei:.2f})")
        
        return pig
        
    except (ValueError, TypeError) as e:
        logger.error(f"Error calculating PIG: {e}")
        return 0.0


def get_pig_classification(pig: float) -> str:
    """
    Get pollution classification based on PIG value.
    
    Args:
        pig: Calculated PIG value
        
    Returns:
        str: Classification string
    """
    if pig < 1:
        return "Low pollution"
    elif pig < 2:
        return "Moderate pollution"
    elif pig < 5:
        return "High pollution"
    else:
        return "Very high pollution"
