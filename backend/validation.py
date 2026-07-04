from datetime import datetime, timezone
from urllib.parse import urlparse
from pydantic import field_validator, model_validator


def _is_valid_url(value: str) -> bool:
    if not value:
        return True
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


class BaseValidators:
    @staticmethod
    def validate_name(value: str, field_name: str = "name") -> str:
        if not value or len(value.strip()) < 2:
            raise ValueError(f"{field_name} must be at least 2 characters")
        return value.strip()

    @staticmethod
    def validate_text(value: str, field_name: str = "description", minimum: int = 2) -> str:
        if value is None:
            return ""
        text = value.strip()
        if len(text) < minimum:
            raise ValueError(f"{field_name} must be at least {minimum} characters")
        return text

    @staticmethod
    def validate_price(value: float) -> float:
        if value <= 0:
            raise ValueError("price must be greater than 0")
        return value

    @staticmethod
    def validate_discount(value: int) -> int:
        if not 1 <= value <= 100:
            raise ValueError("discount must be between 1 and 100")
        return value

    @staticmethod
    def validate_guests(value: int) -> int:
        if not 1 <= value <= 30:
            raise ValueError("guests must be between 1 and 30")
        return value

    @staticmethod
    def validate_date(value: str, field_name: str = "date") -> str:
        if not value:
            raise ValueError(f"{field_name} is required")
        try:
            datetime.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(f"{field_name} must be in YYYY-MM-DD format") from exc
        return value

    @staticmethod
    def validate_future_date(value: str) -> str:
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("date must be in YYYY-MM-DD format") from exc
        today = datetime.now(timezone.utc).date()
        if parsed.date() < today:
            raise ValueError("reservation date cannot be in the past")
        return value

    @staticmethod
    def validate_url(value: str, field_name: str) -> str:
        if value and not _is_valid_url(value):
            raise ValueError(f"{field_name} must be a valid URL")
        return value

    @staticmethod
    def validate_experience(value: int) -> int:
        if value < 0:
            raise ValueError("experience cannot be negative")
        return value


def validate_menu_payload(cls, values):
    if values.get("name") is not None:
        values["name"] = BaseValidators.validate_name(values["name"])
    if values.get("price") is not None:
        values["price"] = BaseValidators.validate_price(values["price"])
    if values.get("category") is not None:
        values["category"] = values["category"].strip()
    # Strip removed fields so they never reach the model
    values.pop("description", None)
    values.pop("img", None)
    values.pop("imageUrl", None)
    values.pop("publicId", None)
    values.pop("uploadedAt", None)
    return values


def validate_offer_payload(cls, values):
    if values.get("title") is not None:
        values["title"] = BaseValidators.validate_name(values["title"], "title")
    # discount=0 means no percentage discount — allow it
    if values.get("discount") is not None and values["discount"] > 0:
        values["discount"] = BaseValidators.validate_discount(values["discount"])
    if values.get("valid_from"):
        values["valid_from"] = BaseValidators.validate_date(values["valid_from"], "valid_from")
    if values.get("valid_until"):
        values["valid_until"] = BaseValidators.validate_date(values["valid_until"], "valid_until")
    if values.get("valid_from") and values.get("valid_until"):
        if datetime.fromisoformat(values["valid_until"]) <= datetime.fromisoformat(values["valid_from"]):
            raise ValueError("end date must be after start date")
    return values


def validate_contact_payload(cls, values):
    if values.get("name") is not None:
        values["name"] = BaseValidators.validate_name(values["name"])
    if values.get("message") is not None:
        values["message"] = BaseValidators.validate_text(values["message"], "message", 10)
    return values


def validate_reservation_payload(cls, values):
    if values.get("name") is not None:
        values["name"] = BaseValidators.validate_name(values["name"])
    if values.get("phone") is not None:
        phone = values["phone"].strip()
        if len(phone) < 6:
            raise ValueError("phone number must be at least 6 digits")
        values["phone"] = phone
    if values.get("email") is not None:
        values["email"] = values["email"].strip().lower()
    if values.get("guests") is not None:
        values["guests"] = BaseValidators.validate_guests(values["guests"])
    if values.get("date") is not None:
        values["date"] = BaseValidators.validate_future_date(values["date"])
    if values.get("time") is not None:
        time = values["time"].strip()
        if len(time) < 3:
            raise ValueError("reservation time format is invalid")
        values["time"] = time
    return values


def validate_restaurant_payload(cls, values):
    if values.get("website") is not None:
        values["website"] = BaseValidators.validate_url(values["website"], "website")
    if values.get("instagram") is not None:
        values["instagram"] = BaseValidators.validate_url(values["instagram"], "instagram")
    if values.get("facebook") is not None:
        values["facebook"] = BaseValidators.validate_url(values["facebook"], "facebook")
    if values.get("whatsapp") is not None:
        values["whatsapp"] = BaseValidators.validate_url(values["whatsapp"], "whatsapp")
    if values.get("map_embed") is not None:
        values["map_embed"] = BaseValidators.validate_url(values["map_embed"], "google maps")
    return values
