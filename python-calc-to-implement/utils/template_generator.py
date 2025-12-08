"""
Template Generator Module

Generates CSV/Excel templates for water quality data input.
"""

from typing import List, Dict, Any, Optional
from pathlib import Path
import pandas as pd
import json
import logging

logger = logging.getLogger(__name__)

# Metadata columns
METADATA_COLUMNS = [
    ('S.No', 'Sample number'),
    ('State', 'State name'),
    ('District', 'District name'),
    ('Location', 'Location/Site name'),
    ('Longitude', 'Longitude coordinate'),
    ('Latitude', 'Latitude coordinate'),
    ('Year', 'Year of sampling')
]


def load_bis_standards(config_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """
    Load BIS standards from configuration file.
    
    Args:
        config_path: Path to bis_standards.json (optional)
    
    Returns:
        List of parameter dictionaries
    """
    if config_path is None:
        config_path = Path(__file__).parent.parent / 'config' / 'bis_standards.json'
    
    try:
        with open(config_path, 'r') as f:
            data = json.load(f)
            return data.get('parameters', [])
    except FileNotFoundError:
        logger.error(f"BIS standards file not found: {config_path}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing BIS standards: {e}")
        return []


def generate_template_dataframe(standards: Optional[List[Dict[str, Any]]] = None) -> pd.DataFrame:
    """
    Generate a template DataFrame with all columns.
    
    Args:
        standards: List of BIS standard dictionaries (optional, will load if not provided)
    
    Returns:
        DataFrame with template structure (one example row)
    """
    if standards is None:
        standards = load_bis_standards()
    
    # Create column list
    columns = [col[0] for col in METADATA_COLUMNS]
    
    # Add parameter symbols
    for param in standards:
        columns.append(param['symbol'])
    
    # Create DataFrame with one example row
    example_data = {
        'S.No': [1],
        'State': ['Example State'],
        'District': ['Example District'],
        'Location': ['Example Location'],
        'Longitude': [77.5946],
        'Latitude': [12.9716],
        'Year': [2024]
    }
    
    # Add empty values for parameters
    for param in standards:
        example_data[param['symbol']] = [None]
    
    df = pd.DataFrame(example_data)
    
    return df


def generate_template_with_info(standards: Optional[List[Dict[str, Any]]] = None) -> pd.DataFrame:
    """
    Generate a template DataFrame with parameter information row.
    
    Args:
        standards: List of BIS standard dictionaries
    
    Returns:
        DataFrame with template structure and info row
    """
    if standards is None:
        standards = load_bis_standards()
    
    # Create info row (parameter full names and units)
    info_row = {col[0]: col[1] for col in METADATA_COLUMNS}
    
    for param in standards:
        info_row[param['symbol']] = f"{param['parameter']} ({param['unit']})"
    
    # Create example row
    example_row = {
        'S.No': 1,
        'State': 'Tamil Nadu',
        'District': 'Chennai',
        'Location': 'Sample Site 1',
        'Longitude': 80.2707,
        'Latitude': 13.0827,
        'Year': 2024
    }
    
    # Add example values for some parameters
    example_values = {
        'Hg': 0.5, 'Cd': 1.0, 'As': 5.0, 'Pb': 3.0, 'Se': 2.0,
        'Ni': 5.0, 'Cr': 10.0, 'Fe': 200, 'Cu': 50, 'Zn': 1000,
        'F': 1.0, 'Cl': 100, 'NO3': 20, 'SO4': 150
    }
    
    for param in standards:
        symbol = param['symbol']
        example_row[symbol] = example_values.get(symbol, '')
    
    # Create DataFrame
    df = pd.DataFrame([info_row, example_row])
    
    return df


def save_template(
    output_path: Path, 
    standards: Optional[List[Dict[str, Any]]] = None,
    include_info: bool = False
) -> None:
    """
    Save template to file (CSV or Excel).
    
    Args:
        output_path: Path to save the template
        standards: List of BIS standard dictionaries
        include_info: Whether to include info row
    """
    if include_info:
        df = generate_template_with_info(standards)
    else:
        df = generate_template_dataframe(standards)
    
    extension = output_path.suffix.lower()
    
    if extension == '.csv':
        df.to_csv(output_path, index=False)
    elif extension in ['.xlsx', '.xls']:
        df.to_excel(output_path, index=False)
    else:
        raise ValueError(f"Unsupported format: {extension}")
    
    logger.info(f"Template saved to: {output_path}")


def get_template_bytes(format: str = 'csv') -> bytes:
    """
    Get template as bytes for download.
    
    Args:
        format: Output format ('csv' or 'xlsx')
    
    Returns:
        Bytes containing the template file
    """
    from io import BytesIO, StringIO
    
    df = generate_template_dataframe()
    
    if format.lower() == 'csv':
        return df.to_csv(index=False).encode('utf-8')
    elif format.lower() in ['xlsx', 'excel']:
        buffer = BytesIO()
        df.to_excel(buffer, index=False, engine='openpyxl')
        buffer.seek(0)
        return buffer.read()
    else:
        raise ValueError(f"Unsupported format: {format}")
