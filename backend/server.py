import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
FRONTEND_PUBLIC_DIR = ROOT_DIR.parent / "frontend" / "public"
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
import uuid
import csv
import io
import re
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator, model_validator
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import jwt, JWTError
from fastapi.responses import StreamingResponse

from cloudinary_service import upload_image, upload_local_image, delete_image
from validation import validate_menu_payload, validate_offer_payload, validate_contact_payload, validate_reservation_payload, validate_restaurant_payload
from authz import require_branding_access, get_profile_updatable_fields, can_manage_users
from audit import log_admin_action
from email_service import send_reservation_email

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "restrokit")

JWT_SECRET = os.environ.get("JWT_SECRET", "restrokit-secret-change-in-prod")
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 72

app = FastAPI(title="RestroKit CMS API")
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FallbackCursor:
    def __init__(self, docs, filter_query=None, projection=None):
        self._docs = list(docs)
        self._filter_query = filter_query or {}
        self._projection = projection or {}
        self._sorted = False

    def _matches(self, doc):
        query = self._filter_query or {}
        for key, condition in query.items():
            if isinstance(condition, dict):
                if "$ne" in condition and doc.get(key) == condition["$ne"]:
                    return False
                continue
            if doc.get(key) != condition:
                return False
        return True

    def _apply_projection(self, doc):
        if not self._projection:
            return dict(doc)
        projected = {}
        for key, value in doc.items():
            if key == "_id":
                continue
            if value is None:
                continue
            if self._projection.get(key, 1) != 0:
                projected[key] = value
        return projected

    def sort(self, field, direction=1):
        if field:
            self._docs = sorted(self._docs, key=lambda doc: doc.get(field) or "", reverse=direction != 1)
        self._sorted = True
        return self

    def skip(self, count):
        self._docs = self._docs[count:]
        return self

    def limit(self, count):
        if count is not None:
            self._docs = self._docs[:count]
        return self

    async def to_list(self, length=None):
        docs = [self._apply_projection(doc) for doc in self._docs if self._matches(doc)]
        if length is not None:
            docs = docs[:length]
        return docs


class FallbackCollection:
    def __init__(self, name):
        self.name = name
        self._docs = []

    async def insert_one(self, document):
        self._docs.append(dict(document))
        return type("InsertResult", (), {"inserted_id": str(len(self._docs))})()

    async def find_one(self, filter_query=None, projection=None):
        cursor = FallbackCursor(self._docs, filter_query, projection)
        docs = await cursor.to_list(1)
        return docs[0] if docs else None

    def find(self, filter_query=None, projection=None):
        return FallbackCursor(self._docs, filter_query, projection)

    async def update_one(self, filter_query=None, update=None):
        update = update or {}
        set_payload = update.get("$set", {})
        for doc in self._docs:
            if all(doc.get(k) == v for k, v in (filter_query or {}).items() if not isinstance(v, dict)):
                for key, value in set_payload.items():
                    doc[key] = value
                return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1})()
        return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0})()

    async def delete_one(self, filter_query=None):
        for index, doc in enumerate(self._docs):
            if all(doc.get(k) == v for k, v in (filter_query or {}).items() if not isinstance(v, dict)):
                del self._docs[index]
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    async def count_documents(self, filter_query=None):
        cursor = FallbackCursor(self._docs, filter_query)
        docs = await cursor.to_list()
        return len(docs)

    async def create_index(self, *args, **kwargs):
        return None


class FallbackDatabase:
    def __init__(self):
        self._collections = {}

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = FallbackCollection(name)
        return self._collections[name]


class DatabaseProxy:
    def __init__(self):
        self._real_db = None
        self._fallback_db = FallbackDatabase()
        self._active_backend = None

    async def _ensure_backend(self):
        if self._active_backend is not None:
            return self._active_backend
        try:
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
            await client.admin.command("ping")
            self._real_db = client[db_name]
            self._active_backend = "mongo"
            logger.info("Connected to MongoDB")
        except Exception as exc:
            self._active_backend = "fallback"
            logger.warning("MongoDB unavailable; using in-memory fallback store: %s", exc)
        return self._active_backend

    def __getitem__(self, name):
        return CollectionProxy(name, self)

    async def close(self):
        if self._active_backend == "mongo" and self._real_db is not None:
            try:
                self._real_db.client.close()
            except Exception:
                pass


class CollectionProxy:
    def __init__(self, name, db_proxy):
        self.name = name
        self._db_proxy = db_proxy

    async def _get_collection(self):
        await self._db_proxy._ensure_backend()
        if self._db_proxy._active_backend == "mongo":
            return self._db_proxy._real_db[self.name]
        return self._db_proxy._fallback_db[self.name]

    async def find_one(self, filter_query=None, projection=None):
        collection = await self._get_collection()
        return await collection.find_one(filter_query, projection)

    def find(self, filter_query=None, projection=None):
        if self._db_proxy._active_backend == "mongo":
            return self._db_proxy._real_db[self.name].find(filter_query, projection)
        fallback_collection = self._db_proxy._fallback_db[self.name]
        return FallbackCursor(fallback_collection._docs, filter_query, projection)

    async def insert_one(self, document):
        collection = await self._get_collection()
        return await collection.insert_one(document)

    async def update_one(self, filter_query=None, update=None, **kwargs):
        collection = await self._get_collection()
        return await collection.update_one(filter_query, update, **kwargs)

    async def delete_one(self, filter_query=None):
        collection = await self._get_collection()
        return await collection.delete_one(filter_query)

    async def count_documents(self, filter_query=None):
        collection = await self._get_collection()
        return await collection.count_documents(filter_query)

    async def create_index(self, *args, **kwargs):
        collection = await self._get_collection()
        return await collection.create_index(*args, **kwargs)


client = None
db = DatabaseProxy()


def _id():
    return str(uuid.uuid4())


def _now():
    return datetime.now(timezone.utc)


def _strip(doc):
    if doc:
        doc.pop("_id", None)
    return doc


def _soft_delete_payload(user: Optional[Dict[str, Any]] = None):
    payload = {"isDeleted": True, "deletedAt": _now().isoformat()}
    if user:
        payload["deletedBy"] = user.get("id") or user.get("email") or "admin"
    return payload


def _active_query():
    return {"isDeleted": {"$ne": True}}


def _search_filter(search: Optional[str], fields: List[str]):
    if not search:
        return {}
    regex = {"$regex": re.escape(search), "$options": "i"}
    return {"$or": [{field: regex} for field in fields]}


def _normalize_media_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(data)
    for key in ["img", "url", "banner", "logo", "image", "photo", "avatar", "favicon"]:
        if key in normalized:
            value = normalized[key]
            if isinstance(value, dict):
                media_url = value.get("imageUrl") or value.get("url") or value.get("secure_url") or ""
                public_id = value.get("publicId") or value.get("public_id") or ""
                uploaded_at = value.get("uploadedAt") or value.get("uploaded_at") or _now().isoformat()
                
                normalized[key] = media_url
                normalized[f"{key}PublicId"] = public_id
                normalized[f"{key}UploadedAt"] = uploaded_at
                
                normalized["imageUrl"] = media_url
                normalized["publicId"] = public_id
                normalized["uploadedAt"] = uploaded_at
            elif not value:
                normalized[key] = ""
                normalized[f"{key}PublicId"] = ""
                normalized[f"{key}UploadedAt"] = ""
                
                normalized["imageUrl"] = ""
                normalized["publicId"] = ""
                normalized["uploadedAt"] = ""

    images = normalized.get("images")
    if isinstance(images, list):
        image_urls = []
        image_public_ids = []
        image_uploaded_at = []
        has_media_objects = False
        for item in images:
            if isinstance(item, dict):
                has_media_objects = True
                image_urls.append(item.get("imageUrl") or item.get("url") or item.get("secure_url") or "")
                image_public_ids.append(item.get("publicId") or item.get("public_id") or "")
                image_uploaded_at.append(item.get("uploadedAt") or item.get("uploaded_at") or _now().isoformat())
            else:
                image_urls.append(item)
                image_public_ids.append("")
                image_uploaded_at.append("")
        if has_media_objects:
            normalized["images"] = image_urls
            normalized["imagePublicIds"] = image_public_ids
            normalized["imageUploadedAt"] = image_uploaded_at
    return normalized


async def _ensure_branding_access(user: Dict[str, Any], resource: str) -> None:
    try:
        require_branding_access(user, resource)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db["users"].find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    avatar: Optional[str] = None


class RestaurantPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    tagline: Optional[str] = None
    logo: Optional[Any] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    map_embed: Optional[str] = None
    hours: Optional[List[Dict[str, Any]]] = None
    social: Optional[Dict[str, Any]] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    whatsapp: Optional[str] = None
    imageUrl: Optional[str] = None
    publicId: Optional[str] = None
    uploadedAt: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def validate_restaurant(cls, values):
        if isinstance(values, dict):
            return validate_restaurant_payload(cls, values)
        return values


class HeroPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    kicker: Optional[str] = None
    title: Optional[str] = None
    title_alt: Optional[str] = None
    subtitle: Optional[str] = None
    image: Optional[Any] = None
    cta_primary: Optional[str] = None
    cta_secondary: Optional[str] = None
    imageUrl: Optional[str] = None
    publicId: Optional[str] = None
    uploadedAt: Optional[str] = None


class AboutPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    heading: Optional[str] = None
    paragraph: Optional[str] = None
    bullets: Optional[List[str]] = None
    stats: Optional[List[Dict[str, Any]]] = None
    images: Optional[List[Any]] = None


class SettingsPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    website_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    footer_text: Optional[str] = None
    copyright: Optional[str] = None


class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    description: str = ""
    price: float
    category: str
    diet: str = "veg"
    core: str = ""
    img: Optional[Any] = ""
    popular: bool = False
    chef_special: bool = False
    available: bool = True
    spice_level: int = 0
    display_order: int = 0
    imageUrl: Optional[str] = None
    publicId: Optional[str] = None
    uploadedAt: Optional[str] = None
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    deletedBy: Optional[str] = None
    created_at: str = Field(default_factory=lambda: _now().isoformat())

    @model_validator(mode="before")
    @classmethod
    def validate_menu(cls, values):
        if isinstance(values, dict):
            return validate_menu_payload(cls, values)
        return values


class GalleryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    url: Optional[Any] = ""
    caption: str = ""
    display_order: int = 0
    tags: List[str] | None = None
    file_name: Optional[str] = None
    imageUrl: Optional[str] = None
    publicId: Optional[str] = None
    uploadedAt: Optional[str] = None
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    deletedBy: Optional[str] = None
    created_at: str = Field(default_factory=lambda: _now().isoformat())


class Offer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    title: str
    description: str = ""
    discount: int = 0
    banner: Optional[Any] = ""
    valid_from: str = ""
    valid_until: str = ""
    btn_text: str = "Order Now"
    btn_link: str = ""
    active: bool = True
    imageUrl: Optional[str] = None
    publicId: Optional[str] = None
    uploadedAt: Optional[str] = None
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    deletedBy: Optional[str] = None
    created_at: str = Field(default_factory=lambda: _now().isoformat())

    @model_validator(mode="before")
    @classmethod
    def validate_offer(cls, values):
        if isinstance(values, dict):
            return validate_offer_payload(cls, values)
        return values


class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    rating: int = 5
    review: str
    img: Optional[Any] = ""
    date: str = Field(default_factory=lambda: _now().date().isoformat())
    featured: bool = False
    imageUrl: Optional[str] = None
    publicId: Optional[str] = None
    uploadedAt: Optional[str] = None
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    deletedBy: Optional[str] = None
    created_at: str = Field(default_factory=lambda: _now().isoformat())


class ImageReference(BaseModel):
    imageUrl: str
    publicId: str
    uploadedAt: Optional[str] = None


class CategoryImagesUpdate(BaseModel):
    veg_images: List[ImageReference] = []
    nonveg_images: List[ImageReference] = []

    @model_validator(mode="after")
    def validate_counts(self):
        if len(self.veg_images) > 4:
            raise ValueError("Maximum 4 Vegetarian images allowed")
        if len(self.nonveg_images) > 4:
            raise ValueError("Maximum 4 Non-Vegetarian images allowed")
        return self


class ReservationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=6, max_length=30)
    email: EmailStr
    guests: int = Field(ge=1, le=30)
    date: str
    time: str
    message: Optional[str] = ""

    @model_validator(mode="before")
    @classmethod
    def validate_reservation(cls, values):
        if isinstance(values, dict):
            return validate_reservation_payload(cls, values)
        return values


class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    phone: str
    email: str
    guests: int
    date: str
    time: str
    message: str = ""
    status: str = "pending"
    email_status: str = "pending"
    updated_at: Optional[str] = None
    confirmed_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    deletedBy: Optional[str] = None
    created_at: str = Field(default_factory=lambda: _now().isoformat())


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    message: str = Field(min_length=2, max_length=2000)

    @model_validator(mode="before")
    @classmethod
    def validate_contact(cls, values):
        if isinstance(values, dict):
            return validate_contact_payload(cls, values)
        return values


class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    email: str
    message: str
    read: bool = False
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    deletedBy: Optional[str] = None
    created_at: str = Field(default_factory=lambda: _now().isoformat())


class NewsletterCreate(BaseModel):
    email: EmailStr


class NewsletterEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    email: str
    isDeleted: bool = False
    deletedAt: Optional[str] = None
    deletedBy: Optional[str] = None
    created_at: str = Field(default_factory=lambda: _now().isoformat())


def _collect_public_ids(value: Any) -> set[str]:
    public_ids: set[str] = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {"publicId", "public_id"} and isinstance(item, str) and item:
                public_ids.add(item)
                continue
            if key.endswith("PublicId") and isinstance(item, str) and item:
                public_ids.add(item)
                continue
            if key.endswith("PublicIds") and isinstance(item, list):
                public_ids.update({entry for entry in item if isinstance(entry, str) and entry})
                continue
            public_ids.update(_collect_public_ids(item))
    elif isinstance(value, list):
        for item in value:
            public_ids.update(_collect_public_ids(item))
    return public_ids


def _delete_replaced_media(previous: Optional[Dict[str, Any]], current: Optional[Dict[str, Any]]) -> None:
    previous_ids = _collect_public_ids(previous or {})
    current_ids = _collect_public_ids(current or {})
    for public_id in previous_ids - current_ids:
        delete_image(public_id)


def _cloudinary_configured() -> bool:
    return bool(os.environ.get("CLOUDINARY_CLOUD_NAME") and os.environ.get("CLOUDINARY_API_KEY") and os.environ.get("CLOUDINARY_API_SECRET"))


def _is_local_media_path(value: Any) -> bool:
    return isinstance(value, str) and value.startswith("/images/")


def _resolve_local_media_path(value: str) -> Optional[Path]:
    relative = value.lstrip("/").replace("/", os.sep)
    path = FRONTEND_PUBLIC_DIR / relative
    return path if path.exists() else None


def _upload_local_media_reference(value: str, folder: str, public_id_hint: str) -> Optional[Dict[str, Any]]:
    if not _cloudinary_configured() or not _is_local_media_path(value):
        return None
    local_path = _resolve_local_media_path(value)
    if not local_path:
        return None
    return upload_local_image(local_path, folder=folder, public_id=public_id_hint)


async def migrate_existing_media_to_cloudinary() -> None:
    if not _cloudinary_configured():
        return

    restaurant = await db["restaurant"].find_one({}, {"_id": 0})
    if restaurant and _is_local_media_path(restaurant.get("logo")):
        uploaded = _upload_local_media_reference(restaurant["logo"], "restrokit/restaurant", "restaurant-logo")
        if uploaded:
            await db["restaurant"].update_one({}, {"$set": {"logo": uploaded["imageUrl"], "logoPublicId": uploaded["publicId"], "logoUploadedAt": uploaded["uploadedAt"]}}, upsert=True)

    hero = await db["hero"].find_one({}, {"_id": 0})
    if hero and _is_local_media_path(hero.get("image")):
        uploaded = _upload_local_media_reference(hero["image"], "restrokit/hero", "hero-image")
        if uploaded:
            await db["hero"].update_one({}, {"$set": {"image": uploaded["imageUrl"], "imagePublicId": uploaded["publicId"], "imageUploadedAt": uploaded["uploadedAt"]}}, upsert=True)

    about = await db["about"].find_one({}, {"_id": 0})
    if about:
        next_images = []
        next_public_ids = []
        changed = False
        for index, image in enumerate(about.get("images") or []):
            if _is_local_media_path(image):
                uploaded = _upload_local_media_reference(image, "restrokit/about", f"about-image-{index + 1}")
                if uploaded:
                    next_images.append(uploaded["imageUrl"])
                    next_public_ids.append(uploaded["publicId"])
                    changed = True
                    continue
            next_images.append(image)
            existing_public_ids = about.get("imagePublicIds") or []
            next_public_ids.append(existing_public_ids[index] if index < len(existing_public_ids) else "")
        if changed:
            await db["about"].update_one({}, {"$set": {"images": next_images, "imagePublicIds": next_public_ids}}, upsert=True)

    chef = await db["chef"].find_one({}, {"_id": 0})
    chef_image = (chef or {}).get("image") or (chef or {}).get("photo")
    if chef and _is_local_media_path(chef_image):
        uploaded = _upload_local_media_reference(chef_image, "restrokit/chef", "chef-image")
        if uploaded:
            await db["chef"].update_one({}, {"$set": {"image": uploaded["imageUrl"], "imagePublicId": uploaded["publicId"], "imageUploadedAt": uploaded["uploadedAt"]}}, upsert=True)

    gallery_items = await db["gallery"].find({}, {"_id": 0}).to_list(500)
    for item in gallery_items:
        if _is_local_media_path(item.get("url")):
            uploaded = _upload_local_media_reference(item["url"], "restrokit/gallery", f"gallery-{item.get('id') or _id()}")
            if uploaded:
                await db["gallery"].update_one({"id": item["id"]}, {"$set": {"url": uploaded["imageUrl"], "publicId": uploaded["publicId"], "uploadedAt": uploaded["uploadedAt"]}})


async def get_section(col: str):
    doc = await db[col].find_one({"isDeleted": {"$ne": True}}, {"_id": 0})
    return doc or {}


async def upsert_section(col: str, data: dict):
    payload = _normalize_media_payload(data)
    await db[col].update_one({}, {"$set": payload}, upsert=True)
    return await get_section(col)


async def ensure_indexes():
    try:
        await db["menu"].create_index([("name", "text"), ("description", "text"), ("category", "text"), ("core", "text")], name="menu_search")
    except Exception as exc:
        logger.warning("Could not create menu_search index: %s", exc)
    try:
        await db["menu"].create_index([("category", 1), ("diet", 1), ("available", 1), ("popular", 1), ("chef_special", 1), ("display_order", 1)], name="menu_filters")
    except Exception as exc:
        logger.warning("Could not create menu_filters index: %s", exc)
    try:
        await db["gallery"].create_index([("caption", "text"), ("file_name", "text"), ("tags", "text")], name="gallery_search")
    except Exception as exc:
        logger.warning("Could not create gallery_search index: %s", exc)
    try:
        await db["reservations"].create_index([("name", "text"), ("phone", "text"), ("email", "text"), ("date", 1), ("status", 1)], name="reservations_search")
    except Exception as exc:
        logger.warning("Could not create reservations_search index: %s", exc)
    try:
        await db["contacts"].create_index([("name", "text"), ("email", "text"), ("message", "text")], name="contacts_search")
    except Exception as exc:
        logger.warning("Could not create contacts_search index: %s", exc)
    try:
        await db["newsletter"].create_index([("email", "text")], name="newsletter_search")
    except Exception as exc:
        logger.warning("Could not create newsletter_search index: %s", exc)
    try:
        await db["offers"].create_index([("title", "text"), ("discount", 1), ("active", 1)], name="offers_search")
    except Exception as exc:
        logger.warning("Could not create offers_search index: %s", exc)
    try:
        await db["reviews"].create_index([("name", "text"), ("review", "text")], name="reviews_search")
    except Exception as exc:
        logger.warning("Could not create reviews_search index: %s", exc)


@app.on_event("startup")
async def startup_event():
    await db._ensure_backend()
    await ensure_indexes()
    await seed_database()
    await migrate_existing_media_to_cloudinary()


@app.on_event("shutdown")
async def shutdown_db_client():
    await db.close()


@api_router.post("/auth/login")
async def login(payload: LoginPayload):
    user = await db["users"].find_one({"email": payload.email}, {"_id": 0})
    if not user or not bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token(user["id"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}


@api_router.get("/users")
async def list_users(user=Depends(get_current_user)):
    if not can_manage_users(user):
        raise HTTPException(status_code=403, detail="Only super administrators can manage users")
    docs = await db["users"].find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.post("/users")
async def create_user(payload: Dict[str, Any], user=Depends(get_current_user), request: Request = None):
    if not can_manage_users(user):
        raise HTTPException(status_code=403, detail="Only super administrators can manage users")
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if await db["users"].find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already exists")
    role = payload.get("role") or "owner"
    new_user = {
        "id": _id(),
        "name": payload.get("name") or email.split("@")[0],
        "email": email,
        "avatar": payload.get("avatar") or "",
        "role": role,
        "password_hash": bcrypt.hashpw((payload.get("password") or "welcome123").encode(), bcrypt.gensalt()).decode(),
        "created_at": _now().isoformat(),
    }
    await db["users"].insert_one(new_user)
    await log_admin_action(db, user, "create_user", "users", new_user["id"], request=request, old_values={}, new_values={"email": email, "role": role})
    return {k: v for k, v in new_user.items() if k != "password_hash"}


@api_router.put("/users/{user_id}")
async def update_user(user_id: str, payload: Dict[str, Any], user=Depends(get_current_user), request: Request = None):
    if not can_manage_users(user):
        raise HTTPException(status_code=403, detail="Only super administrators can manage users")
    update = {}
    if "name" in payload:
        update["name"] = payload["name"]
    if "email" in payload:
        update["email"] = payload["email"]
    if "avatar" in payload:
        update["avatar"] = payload["avatar"]
    if "role" in payload:
        update["role"] = payload["role"]
    if payload.get("password"):
        update["password_hash"] = bcrypt.hashpw(payload["password"].encode(), bcrypt.gensalt()).decode()
    if not update:
        raise HTTPException(status_code=400, detail="No changes provided")
    await db["users"].update_one({"id": user_id}, {"$set": update})
    await log_admin_action(db, user, "update_user", "users", user_id, request=request, old_values={}, new_values=update)
    return {"ok": True}


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(get_current_user), request: Request = None):
    if not can_manage_users(user):
        raise HTTPException(status_code=403, detail="Only super administrators can manage users")
    target = await db["users"].find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("email") == "admin@restrokit.com":
        raise HTTPException(status_code=403, detail="The primary super admin account cannot be deleted")
    await db["users"].delete_one({"id": user_id})
    await log_admin_action(db, user, "delete_user", "users", user_id, request=request, old_values=target, new_values={})
    return {"ok": True}


@api_router.put("/auth/profile")
async def update_profile(payload: UserUpdate, user=Depends(get_current_user), request: Request = None):
    allowed_fields = set(get_profile_updatable_fields(user))
    restricted_fields = []
    if payload.name is not None and "name" not in allowed_fields:
        restricted_fields.append("name")
    if payload.email is not None and "email" not in allowed_fields:
        restricted_fields.append("email")
    if payload.avatar is not None and "avatar" not in allowed_fields:
        restricted_fields.append("avatar")
    if payload.password is not None and "password" not in allowed_fields:
        restricted_fields.append("password")
    if restricted_fields:
        raise HTTPException(status_code=403, detail=f"Not permitted to update: {', '.join(restricted_fields)}")

    update = {}
    if payload.name is not None and "name" in allowed_fields:
        update["name"] = payload.name
    if payload.email is not None and "email" in allowed_fields:
        update["email"] = payload.email
    if payload.avatar is not None and "avatar" in allowed_fields:
        update["avatar"] = payload.avatar
    if payload.password:
        update["password_hash"] = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    if not update:
        raise HTTPException(status_code=400, detail="No valid profile changes provided")
    await db["users"].update_one({"id": user["id"]}, {"$set": update})
    updated = await db["users"].find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    await log_admin_action(db, user, "profile_update", "users", user["id"], request=request, old_values={}, new_values=update)
    return updated


@api_router.get("/restaurant")
async def get_restaurant():
    return await get_section("restaurant")


@api_router.put("/restaurant")
async def update_restaurant(data: Dict[str, Any], background_tasks: BackgroundTasks, user=Depends(get_current_user), request: Request = None):
    await _ensure_branding_access(user, "restaurant")
    previous = await get_section("restaurant")
    result = await upsert_section("restaurant", data)
    background_tasks.add_task(_delete_replaced_media, previous, result)
    await log_admin_action(db, user, "update_section", "restaurant", None, request=request, old_values={}, new_values=data)
    return result


@api_router.get("/hero")
async def get_hero():
    return await get_section("hero")


@api_router.put("/hero")
async def update_hero(data: Dict[str, Any], background_tasks: BackgroundTasks, user=Depends(get_current_user), request: Request = None):
    await _ensure_branding_access(user, "hero")
    previous = await get_section("hero")
    result = await upsert_section("hero", data)
    background_tasks.add_task(_delete_replaced_media, previous, result)
    await log_admin_action(db, user, "update_section", "hero", None, request=request, old_values={}, new_values=data)
    return result


@api_router.get("/about")
async def get_about():
    return await get_section("about")


@api_router.put("/about")
async def update_about(data: Dict[str, Any], background_tasks: BackgroundTasks, user=Depends(get_current_user), request: Request = None):
    await _ensure_branding_access(user, "about")
    previous = await get_section("about")
    result = await upsert_section("about", data)
    background_tasks.add_task(_delete_replaced_media, previous, result)
    await log_admin_action(db, user, "update_section", "about", None, request=request, old_values={}, new_values=data)
    return result


@api_router.get("/settings")
async def get_settings():
    return await get_section("settings")


@api_router.put("/settings")
async def update_settings(data: Dict[str, Any], background_tasks: BackgroundTasks, user=Depends(get_current_user), request: Request = None):
    await _ensure_branding_access(user, "settings")
    previous = await get_section("settings")
    result = await upsert_section("settings", data)
    background_tasks.add_task(_delete_replaced_media, previous, result)
    await log_admin_action(db, user, "update_section", "settings", None, request=request, old_values={}, new_values=data)
    return result


@api_router.post("/upload")
async def upload_media(file: UploadFile = File(...), folder: str = Form("restrokit"), _=Depends(get_current_user)):
    return await upload_image(file, folder=folder)


@api_router.delete("/media/{public_id}")
async def delete_media(public_id: str, _=Depends(get_current_user)):
    deleted = delete_image(public_id)
    return {"ok": deleted}


@api_router.get("/menu")
async def list_menu(search: Optional[str] = None, category: Optional[str] = None, diet: Optional[str] = None, available: Optional[bool] = None, popular: Optional[bool] = None, chef_special: Optional[bool] = None, price_min: Optional[float] = None, price_max: Optional[float] = None, limit: int = 100, skip: int = 0):
    query = dict(_active_query())
    if search:
        query.update(_search_filter(search, ["name", "description", "category", "core"]))
    if category:
        query["category"] = category
    if diet:
        query["diet"] = diet
    if available is not None:
        query["available"] = available
    if popular is not None:
        query["popular"] = popular
    if chef_special is not None:
        query["chef_special"] = chef_special
    if price_min is not None or price_max is not None:
        query["price"] = {}
        if price_min is not None:
            query["price"]["$gte"] = price_min
        if price_max is not None:
            query["price"]["$lte"] = price_max
    docs = await db["menu"].find(query, {"_id": 0}).sort("display_order", 1).skip(skip).limit(min(limit, 200)).to_list(length=min(limit, 200))
    return docs


@api_router.post("/menu")
async def create_menu_item(item: MenuItem, user=Depends(get_current_user), request: Request = None):
    payload = _normalize_media_payload(item.model_dump())
    await db["menu"].insert_one(payload)
    await log_admin_action(db, user, "create", "menu", payload.get("id"), request=request, old_values={}, new_values=payload)
    return _strip(payload)


@api_router.put("/menu/{item_id}")
async def update_menu_item(item_id: str, data: Dict[str, Any], background_tasks: BackgroundTasks, _=Depends(get_current_user)):
    existing = await db["menu"].find_one({"id": item_id}, {"_id": 0})
    payload = _normalize_media_payload(data)
    payload.pop("id", None)
    result = await db["menu"].update_one({"id": item_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(404, "Item not found")
    updated = _strip(await db["menu"].find_one({"id": item_id}, {"_id": 0}))
    background_tasks.add_task(_delete_replaced_media, existing, updated)
    return updated


@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, user=Depends(get_current_user), request: Request = None):
    existing = await db["menu"].find_one({"id": item_id}, {"_id": 0})
    await db["menu"].update_one({"id": item_id}, {"$set": _soft_delete_payload(user)})
    await log_admin_action(db, user, "delete", "menu", item_id, request=request, old_values=existing or {}, new_values={"isDeleted": True})
    return {"ok": True}


@api_router.get("/menu/trash")
async def menu_trash(_=Depends(get_current_user)):
    docs = await db["menu"].find({"isDeleted": True}, {"_id": 0}).sort("deletedAt", -1).to_list(100)
    return docs


@api_router.post("/menu/{item_id}/restore")
async def restore_menu_item(item_id: str, user=Depends(get_current_user), request: Request = None):
    result = await db["menu"].update_one({"id": item_id}, {"$set": {"isDeleted": False, "deletedAt": None, "deletedBy": None}})
    if result.matched_count == 0:
        raise HTTPException(404, "Item not found")
    await log_admin_action(db, user, "restore", "menu", item_id, request=request, old_values={}, new_values={"isDeleted": False})
    return {"ok": True}


@api_router.delete("/menu/{item_id}/permanent")
async def permanent_delete_menu_item(item_id: str, user=Depends(get_current_user), request: Request = None):
    doc = await db["menu"].find_one({"id": item_id}, {"_id": 0})
    if doc and doc.get("publicId"):
        delete_image(doc["publicId"])
    await db["menu"].delete_one({"id": item_id})
    await log_admin_action(db, user, "permanent_delete", "menu", item_id, request=request, old_values=doc or {}, new_values={})
    return {"ok": True}


@api_router.post("/menu/{item_id}/duplicate")
async def duplicate_menu_item(item_id: str, _=Depends(get_current_user)):
    doc = await db["menu"].find_one({"id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Item not found")
    doc["id"] = _id()
    doc["name"] = doc["name"] + " (Copy)"
    doc["created_at"] = _now().isoformat()
    doc["isDeleted"] = False
    doc["deletedAt"] = None
    doc["deletedBy"] = None
    await db["menu"].insert_one(doc)
    return doc


@api_router.get("/menu/categories/images")
async def list_category_images():
    docs = await db["category_images"].find({}, {"_id": 0}).to_list(100)
    return docs


@api_router.put("/menu/categories/images/{category}")
async def update_category_images(category: str, update: CategoryImagesUpdate, background_tasks: BackgroundTasks, user=Depends(get_current_user), request: Request = None):
    previous = await db["category_images"].find_one({"category": category}, {"_id": 0})
    payload = update.model_dump()
    payload["category"] = category
    await db["category_images"].update_one({"category": category}, {"$set": payload}, upsert=True)
    current = await db["category_images"].find_one({"category": category}, {"_id": 0})
    background_tasks.add_task(_delete_replaced_media, previous, current)
    await log_admin_action(db, user, "update_category_images", category, None, request=request, old_values=previous or {}, new_values=payload)
    return current




@api_router.get("/gallery")
async def list_gallery(search: Optional[str] = None, tag: Optional[str] = None, limit: int = 100, skip: int = 0):
    query = dict(_active_query())
    if search:
        query.update(_search_filter(search, ["caption", "file_name", "tags"]))
    if tag:
        query["tags"] = {"$in": [tag]}
    docs = await db["gallery"].find(query, {"_id": 0}).sort("display_order", 1).skip(skip).limit(min(limit, 200)).to_list(length=min(limit, 200))
    return docs


@api_router.post("/gallery")
async def add_gallery_item(item: GalleryItem, _=Depends(get_current_user)):
    payload = _normalize_media_payload(item.model_dump())
    await db["gallery"].insert_one(payload)
    return _strip(payload)


@api_router.put("/gallery/{item_id}")
async def update_gallery_item(item_id: str, data: Dict[str, Any], background_tasks: BackgroundTasks, _=Depends(get_current_user)):
    existing = await db["gallery"].find_one({"id": item_id}, {"_id": 0})
    payload = _normalize_media_payload(data)
    payload.pop("id", None)
    await db["gallery"].update_one({"id": item_id}, {"$set": payload})
    updated = _strip(await db["gallery"].find_one({"id": item_id}, {"_id": 0}))
    background_tasks.add_task(_delete_replaced_media, existing, updated)
    return updated


@api_router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: str, user=Depends(get_current_user)):
    await db["gallery"].update_one({"id": item_id}, {"$set": _soft_delete_payload(user)})
    return {"ok": True}


@api_router.get("/gallery/trash")
async def gallery_trash(_=Depends(get_current_user)):
    return await db["gallery"].find({"isDeleted": True}, {"_id": 0}).sort("deletedAt", -1).to_list(100)


@api_router.post("/gallery/{item_id}/restore")
async def restore_gallery_item(item_id: str, _=Depends(get_current_user)):
    await db["gallery"].update_one({"id": item_id}, {"$set": {"isDeleted": False, "deletedAt": None, "deletedBy": None}})
    return {"ok": True}


@api_router.delete("/gallery/{item_id}/permanent")
async def permanent_delete_gallery_item(item_id: str, _=Depends(get_current_user)):
    doc = await db["gallery"].find_one({"id": item_id}, {"_id": 0})
    if doc and doc.get("publicId"):
        delete_image(doc["publicId"])
    await db["gallery"].delete_one({"id": item_id})
    return {"ok": True}


@api_router.get("/chef")
async def get_chef():
    return await get_section("chef")


@api_router.put("/chef")
async def update_chef(data: Dict[str, Any], background_tasks: BackgroundTasks, _=Depends(get_current_user)):
    previous = await get_section("chef")
    result = await upsert_section("chef", data)
    background_tasks.add_task(_delete_replaced_media, previous, result)
    return result


@api_router.get("/offers")
async def list_offers(search: Optional[str] = None, active: Optional[bool] = None, limit: int = 100, skip: int = 0):
    query = dict(_active_query())
    if search:
        query.update(_search_filter(search, ["title", "description", "btn_text"]))
    if active is not None:
        query["active"] = active
    docs = await db["offers"].find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 200)).to_list(length=min(limit, 200))
    return docs


@api_router.post("/offers")
async def create_offer(offer: Offer, _=Depends(get_current_user)):
    payload = _normalize_media_payload(offer.model_dump())
    await db["offers"].insert_one(payload)
    return _strip(payload)


@api_router.put("/offers/{offer_id}")
async def update_offer(offer_id: str, data: Dict[str, Any], background_tasks: BackgroundTasks, _=Depends(get_current_user)):
    existing = await db["offers"].find_one({"id": offer_id}, {"_id": 0})
    payload = _normalize_media_payload(data)
    payload.pop("id", None)
    await db["offers"].update_one({"id": offer_id}, {"$set": payload})
    updated = _strip(await db["offers"].find_one({"id": offer_id}, {"_id": 0}))
    background_tasks.add_task(_delete_replaced_media, existing, updated)
    return updated


@api_router.delete("/offers/{offer_id}")
async def delete_offer(offer_id: str, user=Depends(get_current_user)):
    await db["offers"].update_one({"id": offer_id}, {"$set": _soft_delete_payload(user)})
    return {"ok": True}


@api_router.get("/offers/trash")
async def offers_trash(_=Depends(get_current_user)):
    return await db["offers"].find({"isDeleted": True}, {"_id": 0}).sort("deletedAt", -1).to_list(100)


@api_router.post("/offers/{offer_id}/restore")
async def restore_offer(offer_id: str, _=Depends(get_current_user)):
    await db["offers"].update_one({"id": offer_id}, {"$set": {"isDeleted": False, "deletedAt": None, "deletedBy": None}})
    return {"ok": True}


@api_router.delete("/offers/{offer_id}/permanent")
async def permanent_delete_offer(offer_id: str, _=Depends(get_current_user)):
    doc = await db["offers"].find_one({"id": offer_id}, {"_id": 0})
    if doc and doc.get("publicId"):
        delete_image(doc["publicId"])
    await db["offers"].delete_one({"id": offer_id})
    return {"ok": True}


@api_router.get("/reviews")
async def list_reviews(search: Optional[str] = None, rating: Optional[int] = None, featured: Optional[bool] = None, limit: int = 100, skip: int = 0):
    query = dict(_active_query())
    if search:
        query.update(_search_filter(search, ["name", "review"]))
    if rating is not None:
        query["rating"] = rating
    if featured is not None:
        query["featured"] = featured
    docs = await db["reviews"].find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 200)).to_list(length=min(limit, 200))
    return docs


@api_router.post("/reviews")
async def create_review(review: Review, _=Depends(get_current_user)):
    payload = _normalize_media_payload(review.model_dump())
    await db["reviews"].insert_one(payload)
    return _strip(payload)


@api_router.put("/reviews/{review_id}")
async def update_review(review_id: str, data: Dict[str, Any], background_tasks: BackgroundTasks, _=Depends(get_current_user)):
    existing = await db["reviews"].find_one({"id": review_id}, {"_id": 0})
    payload = _normalize_media_payload(data)
    payload.pop("id", None)
    await db["reviews"].update_one({"id": review_id}, {"$set": payload})
    updated = _strip(await db["reviews"].find_one({"id": review_id}, {"_id": 0}))
    background_tasks.add_task(_delete_replaced_media, existing, updated)
    return updated


@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, user=Depends(get_current_user)):
    await db["reviews"].update_one({"id": review_id}, {"$set": _soft_delete_payload(user)})
    return {"ok": True}


@api_router.get("/reviews/trash")
async def reviews_trash(_=Depends(get_current_user)):
    return await db["reviews"].find({"isDeleted": True}, {"_id": 0}).sort("deletedAt", -1).to_list(100)


@api_router.post("/reviews/{review_id}/restore")
async def restore_review(review_id: str, _=Depends(get_current_user)):
    await db["reviews"].update_one({"id": review_id}, {"$set": {"isDeleted": False, "deletedAt": None, "deletedBy": None}})
    return {"ok": True}


@api_router.delete("/reviews/{review_id}/permanent")
async def permanent_delete_review(review_id: str, _=Depends(get_current_user)):
    doc = await db["reviews"].find_one({"id": review_id}, {"_id": 0})
    if doc and doc.get("publicId"):
        delete_image(doc["publicId"])
    await db["reviews"].delete_one({"id": review_id})
    return {"ok": True}


@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(payload: ReservationCreate):
    reservation = Reservation(**payload.model_dump())
    reservation_data = reservation.model_dump()
    await db["reservations"].insert_one(reservation_data)
    return reservation


@api_router.get("/reservations")
async def list_reservations(search: Optional[str] = None, status: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None, _=Depends(get_current_user), limit: int = 100, skip: int = 0):
    query = dict(_active_query())
    if search:
        query.update(_search_filter(search, ["name", "phone", "email", "message", "date", "status"]))
    if status:
        query["status"] = status
    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = date_from
        if date_to:
            query["date"]["$lte"] = date_to
    docs = await db["reservations"].find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 200)).to_list(length=min(limit, 200))
    return docs


@api_router.put("/reservations/{res_id}/status")
async def update_reservation_status(res_id: str, data: Dict[str, Any], _=Depends(get_current_user)):
    status = data.get("status")
    now_iso = _now().isoformat()
    update_fields = {
        "status": status,
        "updated_at": now_iso
    }
    if status == "confirmed":
        update_fields["confirmed_at"] = now_iso
    elif status == "cancelled":
        update_fields["cancelled_at"] = now_iso
        
    await db["reservations"].update_one({"id": res_id}, {"$set": update_fields})
    reservation = await db["reservations"].find_one({"id": res_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(404, "Reservation not found")
        
    if status in ("confirmed", "cancelled"):
        try:
            restaurant_info = await db["restaurant"].find_one({}, {"_id": 0}) or {}
            await send_reservation_email(reservation, restaurant_info, email_type=status)
            await db["reservations"].update_one({"id": res_id}, {"$set": {"email_status": "sent"}})
            reservation["email_status"] = "sent"
        except Exception as exc:
            logger.error("Failed to send status update email for reservation %s: %s", res_id, exc)
            await db["reservations"].update_one({"id": res_id}, {"$set": {"email_status": "failed"}})
            reservation["email_status"] = "failed"
            
    return _strip(reservation)


@api_router.post("/reservations/{res_id}/resend")
async def resend_reservation_email(res_id: str, _=Depends(get_current_user)):
    reservation = await db["reservations"].find_one({"id": res_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(404, "Reservation not found")
        
    status = reservation.get("status")
    if status not in ("confirmed", "cancelled"):
        raise HTTPException(400, "Reservation must be Confirmed or Cancelled before sending an email.")
        
    try:
        restaurant_info = await db["restaurant"].find_one({}, {"_id": 0}) or {}
        await send_reservation_email(reservation, restaurant_info, email_type=status)
        await db["reservations"].update_one({"id": res_id}, {"$set": {"email_status": "sent"}})
        reservation["email_status"] = "sent"
    except Exception as exc:
        logger.error("Failed to resend email for reservation %s: %s", res_id, exc)
        await db["reservations"].update_one({"id": res_id}, {"$set": {"email_status": "failed"}})
        reservation["email_status"] = "failed"
        raise HTTPException(500, f"Email delivery failed: {str(exc)}")
        
    return {"ok": True, "email_status": "sent"}


@api_router.delete("/reservations/{res_id}")
async def delete_reservation(res_id: str, user=Depends(get_current_user)):
    await db["reservations"].update_one({"id": res_id}, {"$set": _soft_delete_payload(user)})
    return {"ok": True}


@api_router.get("/reservations/trash")
async def reservations_trash(_=Depends(get_current_user)):
    return await db["reservations"].find({"isDeleted": True}, {"_id": 0}).sort("deletedAt", -1).to_list(100)


@api_router.post("/reservations/{res_id}/restore")
async def restore_reservation(res_id: str, _=Depends(get_current_user)):
    await db["reservations"].update_one({"id": res_id}, {"$set": {"isDeleted": False, "deletedAt": None, "deletedBy": None}})
    return {"ok": True}


@api_router.delete("/reservations/{res_id}/permanent")
async def permanent_delete_reservation(res_id: str, _=Depends(get_current_user)):
    await db["reservations"].delete_one({"id": res_id})
    return {"ok": True}


@api_router.get("/reservations/export")
async def export_reservations(_=Depends(get_current_user)):
    docs = await db["reservations"].find(_active_query(), {"_id": 0}).sort("created_at", -1).to_list(5000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "name", "phone", "email", "guests", "date", "time", "message", "status", "created_at"])
    writer.writeheader()
    writer.writerows(docs)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=reservations.csv"})


@api_router.post("/contact", response_model=ContactMessage)
async def create_contact(payload: ContactCreate):
    msg = ContactMessage(**payload.model_dump())
    await db["contacts"].insert_one(msg.model_dump())
    return msg


@api_router.get("/contacts")
async def list_contacts(search: Optional[str] = None, read: Optional[bool] = None, limit: int = 100, skip: int = 0, _=Depends(get_current_user)):
    query = dict(_active_query())
    if search:
        query.update(_search_filter(search, ["name", "email", "message"]))
    if read is not None:
        query["read"] = read
    docs = await db["contacts"].find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 200)).to_list(length=min(limit, 200))
    return docs


@api_router.put("/contacts/{msg_id}/read")
async def mark_contact_read(msg_id: str, _=Depends(get_current_user)):
    await db["contacts"].update_one({"id": msg_id}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.delete("/contacts/{msg_id}")
async def delete_contact(msg_id: str, user=Depends(get_current_user)):
    await db["contacts"].update_one({"id": msg_id}, {"$set": _soft_delete_payload(user)})
    return {"ok": True}


@api_router.get("/contacts/trash")
async def contacts_trash(_=Depends(get_current_user)):
    return await db["contacts"].find({"isDeleted": True}, {"_id": 0}).sort("deletedAt", -1).to_list(100)


@api_router.post("/contacts/{msg_id}/restore")
async def restore_contact(msg_id: str, _=Depends(get_current_user)):
    await db["contacts"].update_one({"id": msg_id}, {"$set": {"isDeleted": False, "deletedAt": None, "deletedBy": None}})
    return {"ok": True}


@api_router.delete("/contacts/{msg_id}/permanent")
async def permanent_delete_contact(msg_id: str, _=Depends(get_current_user)):
    await db["contacts"].delete_one({"id": msg_id})
    return {"ok": True}


@api_router.post("/newsletter", response_model=NewsletterEntry)
async def subscribe_newsletter(payload: NewsletterCreate):
    existing = await db["newsletter"].find_one({"email": payload.email, "isDeleted": {"$ne": True}})
    if existing:
        raise HTTPException(status_code=409, detail="Email already subscribed")
    entry = NewsletterEntry(email=payload.email)
    await db["newsletter"].insert_one(entry.model_dump())
    return entry


@api_router.get("/newsletter")
async def list_newsletter(search: Optional[str] = None, limit: int = 100, skip: int = 0, _=Depends(get_current_user)):
    query = dict(_active_query())
    if search:
        query.update(_search_filter(search, ["email"]))
    docs = await db["newsletter"].find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 200)).to_list(length=min(limit, 200))
    return docs


@api_router.delete("/newsletter/{sub_id}")
async def delete_subscriber(sub_id: str, user=Depends(get_current_user)):
    await db["newsletter"].update_one({"id": sub_id}, {"$set": _soft_delete_payload(user)})
    return {"ok": True}


@api_router.get("/newsletter/trash")
async def newsletter_trash(_=Depends(get_current_user)):
    return await db["newsletter"].find({"isDeleted": True}, {"_id": 0}).sort("deletedAt", -1).to_list(100)


@api_router.post("/newsletter/{sub_id}/restore")
async def restore_subscriber(sub_id: str, _=Depends(get_current_user)):
    await db["newsletter"].update_one({"id": sub_id}, {"$set": {"isDeleted": False, "deletedAt": None, "deletedBy": None}})
    return {"ok": True}


@api_router.delete("/newsletter/{sub_id}/permanent")
async def permanent_delete_subscriber(sub_id: str, _=Depends(get_current_user)):
    await db["newsletter"].delete_one({"id": sub_id})
    return {"ok": True}


@api_router.get("/newsletter/export")
async def export_newsletter(_=Depends(get_current_user)):
    docs = await db["newsletter"].find(_active_query(), {"_id": 0}).sort("created_at", -1).to_list(50000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "email", "created_at"])
    writer.writeheader()
    writer.writerows(docs)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=newsletter.csv"})


@api_router.get("/dashboard/stats")
async def dashboard_stats(_=Depends(get_current_user)):
    today = _now().date().isoformat()
    reservations = await db["reservations"].find(_active_query(), {"_id": 0, "status": 1, "date": 1}).to_list(10000)
    return {
        "today_reservations": sum(1 for r in reservations if r.get("date") == today),
        "pending": sum(1 for r in reservations if r.get("status") == "pending"),
        "confirmed": sum(1 for r in reservations if r.get("status") == "confirmed"),
        "completed": sum(1 for r in reservations if r.get("status") == "completed"),
        "total_menu": await db["menu"].count_documents(_active_query()),
        "gallery_images": await db["gallery"].count_documents(_active_query()),
        "newsletter_subscribers": await db["newsletter"].count_documents(_active_query()),
        "unread_contacts": await db["contacts"].count_documents({"read": False, "isDeleted": {"$ne": True}}),
    }


@api_router.get("/dashboard/recent")
async def dashboard_recent(_=Depends(get_current_user)):
    reservations = await db["reservations"].find(_active_query(), {"_id": 0}).sort("created_at", -1).to_list(5)
    contacts = await db["contacts"].find(_active_query(), {"_id": 0}).sort("created_at", -1).to_list(5)
    return {"reservations": reservations, "contacts": contacts}


@api_router.post("/seed")
async def seed_database():
    if not await db["users"].find_one({}):
        pw = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
        await db["users"].insert_one({"id": _id(), "name": "Admin", "email": "admin@restrokit.com", "password_hash": pw, "avatar": "", "role": "super_admin", "created_at": _now().isoformat()})

    if not await db["restaurant"].find_one({}):
        await db["restaurant"].insert_one({"name": "VANAS", "tagline": "Authentic Coastal Cuisine", "logo": "/images/logo.jpg", "description": "A contemporary Indian kitchen serving authentic coastal delicacies.", "phone": "+91 96867 60009", "email": "vanasmng@gmail.com", "address": "Next to Tejaswini Hospital, Kadri, Mangaluru, Karnataka 575003", "map_embed": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2654.622708946022!2d74.85175853958039!3d12.881228193582968!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba35be519332b91%3A0x5d4f4e6b9beb29fd!2sVanas!5e0!3m2!1sen!2sin!4v1782934059877!5m2!1sen!2sin", "hours": [{"day": "Monday – Friday", "time": "12:00 PM – 03:00 PM , 07:00 PM – 10:30 PM"}, {"day": "Saturday – Sunday", "time": "12:00 PM – 03:30 PM , 07:00 PM – 11:00 PM"}], "social": {"instagram": "https://www.instagram.com/vanas_mangaluru/?hl=en", "facebook": "https://www.facebook.com/vanas.mangalore/", "whatsapp": "https://wa.me/919686760009"}})

    if not await db["hero"].find_one({}):
        await db["hero"].insert_one({"kicker": "Est. 2019 — Mangalore", "title": "Taste the Tradition of Mangalorean Cuisine", "title_alt": "Savor the Flavors of Coastal India", "subtitle": "Serving Mangalore's finest Authentic delicacies", "image": "/images/hero.jpg", "cta_primary": "Reserve Table", "cta_secondary": "View Menu"})

    if not await db["about"].find_one({}):
        await db["about"].insert_one({"heading": "Bringing Mangalore's Culinary Heritage to Your Table", "paragraph": "Experience the true taste of the coast with recipes inspired by generations of Mangalorean tradition.", "bullets": ["Fresh Food", "Family Friendly", "Affordable", "Hygienic Kitchen"], "stats": [{"value": 15, "suffix": "+", "label": "Years"}, {"value": 50, "suffix": "+", "label": "Dishes"}, {"value": 10, "suffix": "+", "label": "Happy Guests"}], "images": ["/images/interior.jpg", "/images/exterior.jpg"]})

    if not await db["settings"].find_one({}):
        await db["settings"].insert_one({"primary_color": "#C62828", "secondary_color": "#FFB703", "accent_color": "#8B4513", "website_title": "VANAS Restaurant", "seo_description": "Authentic Mangalorean coastal cuisine", "seo_keywords": "restaurant, mangalore, coastal, seafood", "footer_text": "A contemporary Indian kitchen serving authentic coastal delicacies and warm hospitality since 2019.", "copyright": "VANAS"})

    if not await db["reviews"].find_one({}):
        seed_reviews = [
            {"name": "The Powerhouse", "rating": 5, "review": "The Lemon Chicken was the standout dish during my visit.", "img": "/images/reviews/powerhouse.jpg", "featured": True},
            {"name": "Anvitha Acharya", "rating": 5, "review": "Loved the Seafood Thali experience.", "img": "/images/reviews/anvitha.jpg", "featured": True},
            {"name": "Saheer Hejmadi", "rating": 5, "review": "A wonderful experience with authentic coastal cuisine.", "img": "/images/reviews/saheer.jpg", "featured": True},
            {"name": "Padmini V Shenoy", "rating": 5, "review": "The Fish Tawa Fry was absolutely delicious.", "img": "/images/reviews/padmini.jpg", "featured": True},
        ]
        for r in seed_reviews:
            await db["reviews"].insert_one(Review(**r).model_dump())

    if not await db["gallery"].find_one({}):
        for i, src in enumerate([f"/images/gallery/image{j}.jpg" for j in range(1, 10)]):
            await db["gallery"].insert_one(GalleryItem(url=src, display_order=i).model_dump())

    return {"ok": True, "message": "Database seeded. Admin: admin@restrokit.com / admin123"}


@api_router.get("/")
async def root():
    return {"message": "RestroKit CMS API"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
