import os
import subprocess
import gzip
import shutil
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models.models import Backup

BACKUP_DIR = "backups"

def ensure_backup_dir():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

def create_database_backup(db: Session) -> str:
    ensure_backup_dir()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    database_url = os.environ.get("DATABASE_URL", "")
    
    if database_url:
        try:
            result = subprocess.run(
                ["pg_dump", database_url, "-f", filepath],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                gzip_filepath = filepath + ".gz"
                with open(filepath, 'rb') as f_in:
                    with gzip.open(gzip_filepath, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                os.remove(filepath)
                
                file_size = os.path.getsize(gzip_filepath)
                
                backup_record = Backup(
                    filename=filename + ".gz",
                    file_path=gzip_filepath,
                    file_size=file_size,
                    backup_type="daily",
                    status="completed"
                )
                db.add(backup_record)
                db.commit()
                
                return gzip_filepath
        except Exception as e:
            backup_record = Backup(
                filename=filename,
                backup_type="daily",
                status="failed"
            )
            db.add(backup_record)
            db.commit()
            raise e
    
    return ""

def cleanup_old_backups(days_to_keep: int = 30):
    ensure_backup_dir()
    
    cutoff_date = datetime.now().timestamp() - (days_to_keep * 24 * 60 * 60)
    
    for filename in os.listdir(BACKUP_DIR):
        filepath = os.path.join(BACKUP_DIR, filename)
        if os.path.isfile(filepath):
            if os.path.getmtime(filepath) < cutoff_date:
                os.remove(filepath)

def get_backup_list():
    ensure_backup_dir()
    
    backups = []
    for filename in sorted(os.listdir(BACKUP_DIR), reverse=True):
        filepath = os.path.join(BACKUP_DIR, filename)
        if os.path.isfile(filepath):
            backups.append({
                "filename": filename,
                "path": filepath,
                "size": os.path.getsize(filepath),
                "created": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat()
            })
    return backups
