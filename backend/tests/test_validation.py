from pydantic import ValidationError
from server import MenuItem, ReservationCreate, ContactCreate, NewsletterCreate, Offer, CategoryImagesUpdate, ImageReference


def test_menu_price_validation():
    try:
        MenuItem(name="Test", description="Nice enough", price=0, category="Starters")
    except ValidationError as exc:
        assert "price" in str(exc)
    else:
        raise AssertionError("Expected validation error")


def test_reservation_validation():
    try:
        ReservationCreate(name="A", phone="123", email="invalid", guests=0, date="2020-01-01", time="10:00")
    except ValidationError as exc:
        assert any("email" in str(e) or "phone" in str(e) or "guests" in str(e) for e in exc.errors())
    else:
        raise AssertionError("Expected validation error")


def test_offer_discount_validation():
    try:
        Offer(title="Promo", description="desc", discount=150, valid_from="2026-01-01", valid_until="2026-01-02")
    except ValidationError as exc:
        assert "discount" in str(exc)
    else:
        raise AssertionError("Expected validation error")


def test_category_images_validation():
    ref = ImageReference(imageUrl="http://test.com/img.jpg", publicId="test-id")
    # 5 images should fail
    try:
        CategoryImagesUpdate(veg_images=[ref]*5, nonveg_images=[])
    except ValidationError as exc:
        assert "Vegetarian images" in str(exc)
    else:
        raise AssertionError("Expected validation error for 5 veg images")

    try:
        CategoryImagesUpdate(veg_images=[], nonveg_images=[ref]*5)
    except ValidationError as exc:
        assert "Non-Vegetarian images" in str(exc)
    else:
        raise AssertionError("Expected validation error for 5 non-veg images")

    # 4 images should succeed
    CategoryImagesUpdate(veg_images=[ref]*4, nonveg_images=[ref]*4)


def test_reservation_email_status_field():
    from server import Reservation
    res = Reservation(name="John Doe", phone="1234567890", email="john@example.com", guests=2, date="2026-07-06", time="19:00")
    assert res.email_status == "pending"
