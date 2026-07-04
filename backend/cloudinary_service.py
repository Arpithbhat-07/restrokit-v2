import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_BYTES = 10 * 1024 * 1024

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True,
)


def _validate(file: UploadFile, content: bytes) -> None:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"File type '{ext}' not allowed. Use: jpg, jpeg, png, webp")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"MIME type '{file.content_type}' not allowed")
    if len(content) > MAX_BYTES:
        raise HTTPException(400, "File too large. Maximum 10 MB")


def sanitize_filename(filename: str) -> str:
    if not filename:
        return "image"
    name, ext = os.path.splitext(filename)
    sanitized = re.sub(r"[^a-zA-Z0-9._-]+", "-", name).strip(".-") or "image"
    return f"{sanitized}{ext.lower()}"


async def upload_image(file: UploadFile, folder: str = "restrokit") -> dict:
    content = await file.read()
    _validate(file, content)
    if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
        raise HTTPException(500, "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env")
    try:
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            resource_type="image",
            public_id=sanitize_filename(file.filename or "image").rsplit(".", 1)[0],
            transformation=[{"quality": "auto:good"}, {"fetch_format": "auto"}, {"width": 1400, "crop": "limit"}],
        )
        return {
            "url": result["secure_url"],
            "imageUrl": result["secure_url"],
            "public_id": result["public_id"],
            "publicId": result["public_id"],
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "uploadedAt": datetime.now(timezone.utc).isoformat(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Cloudinary upload failed: {str(exc)}") from exc


def upload_local_image(path: str | Path, folder: str = "restrokit", public_id: Optional[str] = None) -> dict:
    file_path = Path(path)
    if not file_path.exists():
        raise HTTPException(404, f"Local image not found: {file_path}")
    ext = file_path.suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"File type '{ext}' not allowed. Use: jpg, jpeg, png, webp")
    if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
        raise HTTPException(500, "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env")

    try:
        result = cloudinary.uploader.upload(
            str(file_path),
            folder=folder,
            resource_type="image",
            public_id=public_id or sanitize_filename(file_path.name).rsplit(".", 1)[0],
            transformation=[{"quality": "auto:good"}, {"fetch_format": "auto"}, {"width": 1400, "crop": "limit"}],
        )
        uploaded_at = datetime.now(timezone.utc).isoformat()
        return {
            "url": result["secure_url"],
            "imageUrl": result["secure_url"],
            "public_id": result["public_id"],
            "publicId": result["public_id"],
            "uploaded_at": uploaded_at,
            "uploadedAt": uploaded_at,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Cloudinary upload failed: {str(exc)}") from exc


def delete_image(public_id: str) -> bool:
    if not public_id:
        return False
    try:
        res = cloudinary.uploader.destroy(public_id)
        return res.get("result") == "ok"
    except Exception:
        return False
