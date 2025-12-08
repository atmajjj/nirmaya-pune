"""
Water Quality Index Calculation Modules

This package contains calculation functions for various water quality indices:
- HPI (Heavy Metal Pollution Index)
- HEI (Heavy Metal Evaluation Index)
- MI (Metal Index)
- Cdeg (Degree of Contamination)
- PIG (Pollution Index of Groundwater)
- WQI (Water Quality Index)
"""

from .hpi import calculate_hpi
from .hei import calculate_hei
from .mi import calculate_mi
from .cdeg import calculate_cdeg
from .pig import calculate_pig
from .wqi import calculate_wqi

__all__ = [
    'calculate_hpi',
    'calculate_hei',
    'calculate_mi',
    'calculate_cdeg',
    'calculate_pig',
    'calculate_wqi'
]
