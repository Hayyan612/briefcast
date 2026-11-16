"""SMTP mailer (Brevo in production, sending as the address in MAIL_FROM)."""

from email.message import EmailMessage
from email.utils import make_msgid, parseaddr
from html import escape

import aiosmtplib

from app.config import get_settings


async def send_mail(
    to: str, subject: str, text: str, html: str, unsubscribe_url: str | None = None
) -> None:
    s = get_settings()
    msg = EmailMessage()
    msg["From"] = s.mail_from
    msg["To"] = to
    msg["Subject"] = subject
    # Message-ID on the sender's own domain; a made-up domain counts against deliverability.
    sender_domain = parseaddr(s.mail_from)[1].rpartition("@")[2] or "localhost"
    msg["Message-ID"] = make_msgid(domain=sender_domain)
    if unsubscribe_url:
        # RFC 8058 one-click unsubscribe: mail clients show their own Unsubscribe button.
        msg["List-Unsubscribe"] = f"<{unsubscribe_url}/one-click>"
        msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    await aiosmtplib.send(
        msg,
        hostname=s.smtp_host,
        port=s.smtp_port,
        username=s.smtp_username or None,
        password=s.smtp_password or None,
        start_tls=s.smtp_port == 587,
        use_tls=s.smtp_port == 465,
        timeout=30,
    )


def episode_email(
    name: str | None,
    topic: str,
    title: str,
    url: str,
    minutes: int,
    sources: int,
    unsubscribe_url: str = "",
) -> tuple[str, str, str]:
    subject = f"Your briefing is ready: {title}"
    hello = f"Hi {name.split()[0]}," if name else "Hi,"
    text = (
        f'{hello}\n\nToday\'s episode on "{topic}" is ready ({minutes} min, {sources} sources).\n\n'
        f"Listen: {url}\n\n— Briefcast\n\nStop emails for this briefing: {unsubscribe_url}"
    )
    logo = f"{get_settings().app_url.rstrip('/')}/brand/email-icon.png"
    font = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif"
    html = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;background:#f5f5f7;font-family:{font};color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 4px 20px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td><img src="{escape(logo)}" width="32" height="32" alt="" style="display:block;border:0"></td>
<td style="padding-left:10px;font:600 17px/1 {font};letter-spacing:-0.02em;color:#1d1d1f">Briefcast</td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e5e5ea;padding:28px 28px 32px">
<p style="margin:0 0 6px;font:600 12px/1.4 {font};color:#0071e3">New episode · {minutes} min · {sources} sources</p>
<h1 style="margin:0;font:600 22px/1.3 {font};letter-spacing:-0.01em;color:#1d1d1f">{escape(title)}</h1>
<p style="margin:12px 0 0;font:15px/1.55 {font};color:#424245">{escape(hello)} today's episode on
<strong style="color:#1d1d1f;font-weight:600">{escape(topic)}</strong> is ready.</p>
<p style="margin:24px 0 0"><a href="{escape(url)}" style="background:#0071e3;color:#ffffff;text-decoration:none;
font:600 15px/1 {font};padding:13px 22px;border-radius:999px;display:inline-block">&#9654;&nbsp; Listen now</a></p>
</td></tr>
<tr><td style="padding:16px 4px 0;font:12px/1.5 {font};color:#6e6e73">You get this because you scheduled this briefing.
<a href="{escape(unsubscribe_url)}" style="color:#6e6e73">Stop emails for this briefing</a></td></tr>
</table></td></tr></table></body></html>"""
    return subject, text, html
