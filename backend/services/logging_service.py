import os
import logging
import traceback
from logging.handlers import RotatingFileHandler
from datetime import datetime
import pytz

LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

BOGOTA_TZ = pytz.timezone("America/Bogota")

class BogotaFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        ct = datetime.fromtimestamp(record.created, tz=BOGOTA_TZ)
        if datefmt:
            return ct.strftime(datefmt)
        return ct.strftime("%Y-%m-%d %H:%M:%S")

def setup_logging():
    error_handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, "errors.log"),
        maxBytes=10*1024*1024,
        backupCount=5,
        encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_formatter = BogotaFormatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s\n%(exc_text)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    error_handler.setFormatter(error_formatter)
    
    app_handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, "app.log"),
        maxBytes=10*1024*1024,
        backupCount=5,
        encoding="utf-8"
    )
    app_handler.setLevel(logging.INFO)
    app_formatter = BogotaFormatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    app_handler.setFormatter(app_formatter)
    
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter("%(levelname)s: %(message)s")
    console_handler.setFormatter(console_formatter)
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(error_handler)
    root_logger.addHandler(app_handler)
    root_logger.addHandler(console_handler)
    
    return root_logger

def log_error(logger: logging.Logger, message: str, exc: Exception = None):
    if exc:
        stack = traceback.format_exc()
        logger.error(f"{message}\nException: {type(exc).__name__}: {str(exc)}\nStacktrace:\n{stack}")
    else:
        logger.error(message)

def log_critical(logger: logging.Logger, message: str, exc: Exception = None):
    if exc:
        stack = traceback.format_exc()
        logger.critical(f"{message}\nException: {type(exc).__name__}: {str(exc)}\nStacktrace:\n{stack}")
    else:
        logger.critical(message)

logger = setup_logging()
