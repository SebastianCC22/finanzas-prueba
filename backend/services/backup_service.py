import os
import subprocess
import gzip
import logging
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from backend.models.models import Backup

logger = logging.getLogger(__name__)

BACKUP_DIR = Path("backups")

def ensure_backup_dir():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def create_backup(db: Session, user_id: int = None, backup_type: str = "manual") -> Backup:
    ensure_backup_dir()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql.gz"
    filepath = BACKUP_DIR / filename
    
    backup_record = Backup(
        filename=filename,
        filepath=str(filepath),
        backup_type=backup_type,
        status="in_progress",
        user_id=user_id
    )
    db.add(backup_record)
    db.commit()
    db.refresh(backup_record)
    
    database_url = os.environ.get("DATABASE_URL", "")
    
    if not database_url:
        backup_record.status = "failed"
        backup_record.error_message = "DATABASE_URL no configurada"
        db.commit()
        raise ValueError("DATABASE_URL no configurada")
    
    try:
        temp_file = filepath.with_suffix("")
        
        result = subprocess.run(
            ["pg_dump", database_url, "-f", str(temp_file)],
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            backup_record.status = "failed"
            backup_record.error_message = f"pg_dump error: {result.stderr}"
            db.commit()
            raise RuntimeError(f"pg_dump falló: {result.stderr}")
        
        with open(temp_file, 'rb') as f_in:
            with gzip.open(filepath, 'wb') as f_out:
                f_out.writelines(f_in)
        
        temp_file.unlink()
        
        file_size = filepath.stat().st_size
        backup_record.status = "success"
        backup_record.file_size = file_size
        db.commit()
        db.refresh(backup_record)
        
        return backup_record
        
    except subprocess.TimeoutExpired:
        backup_record.status = "failed"
        backup_record.error_message = "Timeout: el backup tardó más de 5 minutos"
        db.commit()
        raise RuntimeError("Timeout durante el backup")
    except FileNotFoundError as e:
        backup_record.status = "failed"
        backup_record.error_message = f"pg_dump no encontrado: {str(e)}"
        db.commit()
        raise RuntimeError(f"pg_dump no disponible: {str(e)}")
    except OSError as e:
        backup_record.status = "failed"
        backup_record.error_message = f"Error de sistema: {str(e)}"
        db.commit()
        raise RuntimeError(f"Error de sistema: {str(e)}")

def get_latest_backup(db: Session) -> Backup:
    backup = db.query(Backup).filter(
        Backup.status == "success"
    ).order_by(Backup.created_at.desc()).first()
    return backup

def get_all_backups(db: Session, skip: int = 0, limit: int = 50):
    backups = db.query(Backup).order_by(Backup.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(Backup).count()
    return backups, total

def cleanup_old_backups(db: Session, keep_count: int = 30):
    backups = db.query(Backup).filter(
        Backup.status == "success"
    ).order_by(Backup.created_at.desc()).all()
    
    deleted_count = 0
    errors = []
    for backup in backups[keep_count:]:
        filepath = Path(backup.filepath)
        if filepath.exists():
            try:
                filepath.unlink()
                deleted_count += 1
            except OSError as e:
                error_msg = f"Error eliminando {backup.filename}: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)
        db.delete(backup)
    
    db.commit()
    
    if errors:
        logger.warning(f"Limpieza completada con {len(errors)} errores: {errors}")
    
    return deleted_count
