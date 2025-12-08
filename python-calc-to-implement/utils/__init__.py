"""
Utility Modules for Water Quality Index Calculator

This package contains utility functions for:
- File handling (CSV/Excel reading)
- Unit conversion
- Template generation
"""

from .file_handler import read_uploaded_file, validate_columns
from .unit_converter import convert_to_ppb, convert_row_to_ppb

__all__ = [
    'read_uploaded_file',
    'validate_columns',
    'convert_to_ppb',
    'convert_row_to_ppb'
]
