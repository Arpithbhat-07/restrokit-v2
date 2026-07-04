import smtplib
import logging
import os
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

# ==============================================================================
# SMTP DISPATCH LOGIC
# ==============================================================================

def _send_smtp(host: str, port: int, use_tls: bool, user: str, password: str, mail_from: str, recipient: str, message_str: str):
    """
    Synchronous SMTP helper executed in a thread pool to avoid blocking the event loop.
    """
    if port == 465:
        # SSL connection
        with smtplib.SMTP_SSL(host, port, timeout=10) as server:
            server.login(user, password)
            server.sendmail(mail_from, recipient, message_str)
    else:
        # Standard connection (typically port 587)
        with smtplib.SMTP(host, port, timeout=10) as server:
            if use_tls:
                server.starttls()
            server.login(user, password)
            server.sendmail(mail_from, recipient, message_str)


async def send_email(recipient: str, subject: str, html_content: str, text_content: str) -> bool:
    """
    Core reusable email delivery service. Reads configuration dynamically from environment variables.
    """
    email_user = os.environ.get("EMAIL_USER", "")
    email_pass = os.environ.get("EMAIL_PASS", "")
    email_from = os.environ.get("EMAIL_FROM", email_user)
    smtp_host = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("EMAIL_PORT", "587"))
    use_tls = os.environ.get("EMAIL_USE_TLS", "true").lower() == "true"

    if not email_user or not email_pass:
        logger.warning("Email configuration missing (EMAIL_USER/EMAIL_PASS). Skipping email dispatch.")
        raise ValueError("EMAIL_USER or EMAIL_PASS environment variable is not configured.")

    if not recipient:
        logger.warning("Recipient email address is missing.")
        raise ValueError("Recipient email address is missing.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = email_from
    msg["To"] = recipient

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    await asyncio.to_thread(
        _send_smtp,
        smtp_host,
        smtp_port,
        use_tls,
        email_user,
        email_pass,
        email_from,
        recipient,
        msg.as_string()
    )
    return True


# ==============================================================================
# HTML EMAIL BASE LAYOUT
# ==============================================================================

def _get_base_html_layout(
    subject: str,
    header_title: str,
    logo_html: str,
    greeting: str,
    intro_text: str,
    detail_rows_html: str,
    outro_text: str,
    rest_name: str,
    rest_address: str,
    rest_phone: str,
    rest_email: str
) -> str:
    """
    Common HTML boilerplate layout to maintain consistent styling, layout, spacing, and design across all emails.
    """
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f9fa;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #f7f9fa;
      padding: 40px 20px;
      box-sizing: border-box;
    }}
    .container {{
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.05);
    }}
    .header {{
      background: linear-gradient(135deg, #C62828 0%, #8B1E1E 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 10px 0 0 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }}
    .logo {{
      max-height: 60px;
      margin-bottom: 10px;
      border-radius: 8px;
    }}
    .content {{
      padding: 40px 30px;
      color: #1a1a1a;
      line-height: 1.6;
    }}
    .greeting {{
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
    }}
    .intro-text {{
      font-size: 16px;
      color: #4a4a4a;
      margin-bottom: 30px;
    }}
    .card {{
      background-color: #fffaf6;
      border: 1px solid rgba(198, 40, 40, 0.1);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
    }}
    .card-title {{
      font-size: 18px;
      font-weight: 600;
      color: #C62828;
      margin-top: 0;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(198, 40, 40, 0.1);
      padding-bottom: 8px;
    }}
    .detail-row {{
      display: flex;
      margin-bottom: 12px;
      font-size: 15px;
    }}
    .detail-row:last-child {{
      margin-bottom: 0;
    }}
    .detail-label {{
      width: 140px;
      font-weight: 600;
      color: #4a4a4a;
      flex-shrink: 0;
    }}
    .detail-value {{
      color: #1a1a1a;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 12px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .footer {{
      background-color: #0f0f0f;
      color: #a3a3a3;
      padding: 40px 30px;
      text-align: center;
      font-size: 13px;
    }}
    .footer a {{
      color: #ffffff;
      text-decoration: none;
    }}
    .footer-brand {{
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 10px;
    }}
    .footer-contacts {{
      margin-bottom: 20px;
    }}
    .footer-divider {{
      height: 1px;
      background-color: rgba(255,255,255,0.08);
      margin: 20px 0;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        {logo_html}
        <h1>{header_title}</h1>
      </div>
      <div class="content">
        <div class="greeting">{greeting}</div>
        <p class="intro-text">{intro_text}</p>
        
        <div class="card">
          <div class="card-title">Details</div>
          {detail_rows_html}
        </div>
        
        <p class="intro-text" style="margin-bottom: 0;">{outro_text}</p>
      </div>
      <div class="footer">
        <div class="footer-brand">{rest_name}</div>
        <div class="footer-contacts">
          Address: {rest_address}<br>
          Phone: {rest_phone} | Email: {rest_email}
        </div>
        <div class="footer-divider"></div>
        <div>
          &copy; 2026 {rest_name}. All rights reserved.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
"""


def _get_logo_html(rest_logo: str, rest_name: str) -> str:
    """Helper to resolve logo pathing dynamically."""
    if not rest_logo:
        return ""
    if rest_logo.startswith("http"):
        return f'<img src="{rest_logo}" alt="{rest_name} Logo" class="logo" />'
    elif rest_logo.startswith("/"):
        site_url = os.environ.get("SITE_URL", "http://localhost:3000")
        return f'<img src="{site_url.rstrip("/")}{rest_logo}" alt="{rest_name} Logo" class="logo" />'
    return ""


# ==============================================================================
# EMAIL TEMPLATE GENERATORS (COMMUNICATION SERVICE)
# ==============================================================================

def generate_pending_email(reservation: Dict[str, Any], restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Template 1: Reservation Received (Pending status notification).
    """
    rest_name = restaurant.get("name") or "our restaurant"
    rest_logo = restaurant.get("logo", "")
    rest_address = restaurant.get("address", "")
    rest_phone = restaurant.get("phone", "")
    rest_email = restaurant.get("email", "")

    customer_name = reservation.get("name", "Guest")
    res_date = reservation.get("date", "")
    res_time = reservation.get("time", "")
    res_guests = reservation.get("guests", "")
    res_phone = reservation.get("phone", "")

    subject = f"Reservation Received - {rest_name}"
    logo_html = _get_logo_html(rest_logo, rest_name)

    detail_rows_html = f"""
      <div class="detail-row">
        <div class="detail-label">Status</div>
        <div class="detail-value"><span class="badge" style="background-color: #fff3e0; color: #e65100;">Pending Review</span></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date</div>
        <div class="detail-value">{res_date}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time</div>
        <div class="detail-value">{res_time}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Guests</div>
        <div class="detail-value">{res_guests} guests</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Contact Number</div>
        <div class="detail-value">{res_phone}</div>
      </div>
    """

    intro_text = f"We have received your reservation request at <strong>{rest_name}</strong>. Our team is currently reviewing your details, and we will confirm it shortly."
    outro_text = "Thank you for choosing us. We look forward to hosting you soon!"
    
    html = _get_base_html_layout(
        subject=subject,
        header_title="Request Received",
        logo_html=logo_html,
        greeting=f"Hello {customer_name},",
        intro_text=intro_text,
        detail_rows_html=detail_rows_html,
        outro_text=outro_text,
        rest_name=rest_name,
        rest_address=rest_address,
        rest_phone=rest_phone,
        rest_email=rest_email
    )

    text = f"""Hello {customer_name},

We have received your reservation request at {rest_name}.

Reservation Details:
- Date: {res_date}
- Time: {res_time}
- Guests: {res_guests}
- Contact Number: {res_phone}
- Status: Pending Review

Our team is currently reviewing your reservation. We will confirm it shortly.

Thank you!"""

    return subject, html, text


def generate_confirmed_email(reservation: Dict[str, Any], restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Template 2: Reservation Confirmed.
    """
    rest_name = restaurant.get("name") or "our restaurant"
    rest_logo = restaurant.get("logo", "")
    rest_address = restaurant.get("address", "")
    rest_phone = restaurant.get("phone", "")
    rest_email = restaurant.get("email", "")

    customer_name = reservation.get("name", "Guest")
    res_date = reservation.get("date", "")
    res_time = reservation.get("time", "")
    res_guests = reservation.get("guests", "")
    res_phone = reservation.get("phone", "")

    subject = f"Reservation Confirmed - {rest_name}"
    logo_html = _get_logo_html(rest_logo, rest_name)

    detail_rows_html = f"""
      <div class="detail-row">
        <div class="detail-label">Status</div>
        <div class="detail-value"><span class="badge" style="background-color: #e8f5e9; color: #2e7d32;">Confirmed</span></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date</div>
        <div class="detail-value">{res_date}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time</div>
        <div class="detail-value">{res_time}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Guests</div>
        <div class="detail-value">{res_guests} guests</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Contact Number</div>
        <div class="detail-value">{res_phone}</div>
      </div>
    """

    intro_text = f"Thank you for choosing <strong>{rest_name}</strong>. Your table reservation has been successfully confirmed. We look forward to serving you!"
    outro_text = "We look forward to welcoming you and offering an exceptional dining experience. If you need to change or cancel this reservation, please contact us."
    
    html = _get_base_html_layout(
        subject=subject,
        header_title="Confirmed",
        logo_html=logo_html,
        greeting=f"Hello {customer_name},",
        intro_text=intro_text,
        detail_rows_html=detail_rows_html,
        outro_text=outro_text,
        rest_name=rest_name,
        rest_address=rest_address,
        rest_phone=rest_phone,
        rest_email=rest_email
    )

    text = f"""Hello {customer_name},

Thank you for choosing {rest_name}.
Your reservation has been successfully confirmed.

Reservation Details:
- Date: {res_date}
- Time: {res_time}
- Guests: {res_guests}
- Contact Number: {res_phone}
- Status: Confirmed

We look forward to serving you.

Thank you!"""

    return subject, html, text


def generate_cancelled_email(reservation: Dict[str, Any], restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Template 3: Reservation Cancelled.
    """
    rest_name = restaurant.get("name") or "our restaurant"
    rest_logo = restaurant.get("logo", "")
    rest_address = restaurant.get("address", "")
    rest_phone = restaurant.get("phone", "")
    rest_email = restaurant.get("email", "")

    customer_name = reservation.get("name", "Guest")
    res_date = reservation.get("date", "")
    res_time = reservation.get("time", "")
    res_guests = reservation.get("guests", "")
    res_phone = reservation.get("phone", "")

    subject = f"Reservation Cancelled - {rest_name}"
    logo_html = _get_logo_html(rest_logo, rest_name)

    detail_rows_html = f"""
      <div class="detail-row">
        <div class="detail-label">Status</div>
        <div class="detail-value"><span class="badge" style="background-color: #ffebee; color: #c62828;">Cancelled</span></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Date</div>
        <div class="detail-value">{res_date}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Time</div>
        <div class="detail-value">{res_time}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Guests</div>
        <div class="detail-value">{res_guests} guests</div>
      </div>
    """

    intro_text = f"We are writing to inform you that we are unable to confirm your reservation request at <strong>{rest_name}</strong>."
    outro_text = f"Unfortunately, we are unable to confirm your reservation for {res_date} at {res_time}. We sincerely apologize for the inconvenience. Please feel free to contact us or make another reservation in the future."
    
    html = _get_base_html_layout(
        subject=subject,
        header_title="Cancelled",
        logo_html=logo_html,
        greeting=f"Hello {customer_name},",
        intro_text=intro_text,
        detail_rows_html=detail_rows_html,
        outro_text=outro_text,
        rest_name=rest_name,
        rest_address=rest_address,
        rest_phone=rest_phone,
        rest_email=rest_email
    )

    text = f"""Hello {customer_name},

Unfortunately, we are unable to confirm your reservation at {rest_name} for:
{res_date} at {res_time}.

We sincerely apologize for the inconvenience.
Please feel free to contact us or make another reservation.

Thank you."""

    return subject, html, text


# ==============================================================================
# FUTURE EMAIL TEMPLATE HOOKS (EXTENSION POINTS)
# ==============================================================================

def generate_completed_email(reservation: Dict[str, Any], restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """Future Hook: Reservation Completed / Thank You."""
    # Build layout using _get_base_html_layout() with customized text
    pass

def generate_feedback_email(reservation: Dict[str, Any], restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """Future Hook: Review / Feedback request."""
    pass

def generate_reminder_email(reservation: Dict[str, Any], restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """Future Hook: Reservation reminder (e.g. 24 hours prior)."""
    pass

def generate_password_reset_email(user_info: Dict[str, Any], token: str, restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """Future Hook: Admin Password Reset."""
    pass

def generate_welcome_email(user_info: Dict[str, Any], restaurant: Dict[str, Any]) -> Tuple[str, str, str]:
    """Future Hook: Welcome email for new admin accounts."""
    pass


async def send_reservation_email(reservation: Dict[str, Any], restaurant_info: Dict[str, Any], email_type: str = "confirmed") -> bool:
    """
    Wrapper function to select the appropriate template and dispatch the email.
    """
    if email_type == "confirmed":
        subject, html, text = generate_confirmed_email(reservation, restaurant_info)
    elif email_type == "cancelled":
        subject, html, text = generate_cancelled_email(reservation, restaurant_info)
    else:
        subject, html, text = generate_pending_email(reservation, restaurant_info)
        
    return await send_email(reservation.get("email"), subject, html, text)
