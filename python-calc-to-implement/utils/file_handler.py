"""
File Handler Module

Handles reading and validation of uploaded CSV/Excel files.
"""

from typing import List, Tuple, Optional, BinaryIO
from pathlib import Path
import pandas as pd
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

# Metadata columns that are required
METADATA_COLUMNS = ['S.No', 'State', 'District', 'Location', 'Longitude', 'Latitude', 'Year']


def read_uploaded_file(file: BinaryIO, filename: str) -> pd.DataFrame:
    """
    Read uploaded CSV or Excel file into a pandas DataFrame.
    
    Args:
        file: File-like object containing the uploaded data
        filename: Name of the uploaded file (for extension detection)
    
    Returns:
        pd.DataFrame: DataFrame containing the file data
        
    Raises:
        ValueError: If file format is not supported or file is empty
    """
    try:
        # Get file extension
        extension = Path(filename).suffix.lower()
        
        # Read file content into BytesIO
        content = file.read() if hasattr(file, 'read') else file
        if isinstance(content, bytes):
            file_buffer = BytesIO(content)
        else:
            file_buffer = BytesIO(content.encode() if isinstance(content, str) else content)
        
        # Read based on extension
        if extension == '.csv':
            df = pd.read_csv(file_buffer)
        elif extension in ['.xlsx', '.xls']:
            df = pd.read_excel(file_buffer)
        else:
            raise ValueError(f"Unsupported file format: {extension}. Please upload CSV or Excel file.")
        
        # Validate dataframe is not empty
        if df.empty:
            raise ValueError("Uploaded file is empty")
        
        logger.info(f"Successfully read file: {filename} with {len(df)} rows and {len(df.columns)} columns")
        
        return df
        
    except pd.errors.EmptyDataError:
        raise ValueError("Uploaded file is empty or has no valid data")
    except pd.errors.ParserError as e:
        raise ValueError(f"Error parsing file: {str(e)}")
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise ValueError(f"Error reading file: {str(e)}")


def validate_columns(df: pd.DataFrame, required_metadata: Optional[List[str]] = None) -> Tuple[bool, List[str]]:
    """
    Validate that the DataFrame contains required metadata columns.
    
    Args:
        df: DataFrame to validate
        required_metadata: List of required column names (defaults to METADATA_COLUMNS)
    
    Returns:
        Tuple of (is_valid, missing_columns)
    """
    if required_metadata is None:
        required_metadata = METADATA_COLUMNS
    
    df_columns = [col.strip() for col in df.columns]
    missing = [col for col in required_metadata if col not in df_columns]
    
    if missing:
        logger.warning(f"Missing columns: {missing}")
        return False, missing
    
    return True, []


def get_parameter_columns(df: pd.DataFrame) -> List[str]:
    """
    Get list of parameter columns (non-metadata columns).
    
    Args:
        df: DataFrame to analyze
    
    Returns:
        List of parameter column names
    """
    return [col for col in df.columns if col not in METADATA_COLUMNS]


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the DataFrame by:
    - Stripping whitespace from column names
    - Converting numeric columns to float
    - Handling missing values
    
    Args:
        df: DataFrame to clean
    
    Returns:
        Cleaned DataFrame
    """
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    
    # Get parameter columns
    param_cols = get_parameter_columns(df)
    
    # Convert parameter columns to numeric
    for col in param_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    logger.info(f"Cleaned DataFrame with {len(param_cols)} parameter columns")
    
    return df
