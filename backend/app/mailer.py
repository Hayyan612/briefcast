"""SMTP mailer (Brevo in production)."""

from email.message import EmailMessage
from email.utils import make_msgid
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
    msg["Message-ID"] = make_msgid(domain="briefcast")
    if unsubscribe_url:
        # RFC 8058 one-click unsubscribe: mail clients show their own Unsubscribe button.
        msg["List-Unsubscribe"] = f"<{unsubscribe_url}>"
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
    html = f"""<!doctype html><html><body style="margin:0;background:#f4efe6;font-family:Georgia,serif;color:#1d1a16">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fffdf8;border:1px solid #e6dccb;border-radius:14px">
<tr><td style="padding:32px 32px 8px;font:600 12px/1 Arial,sans-serif;letter-spacing:.18em;color:#b4441f">BRIEFCAST · ON AIR</td></tr>
<tr><td style="padding:8px 32px 0;font-size:26px;line-height:1.25">{escape(title)}</td></tr>
<tr><td style="padding:12px 32px 0;font:15px/1.6 Arial,sans-serif;color:#5b5247">{escape(hello)} today's episode on
<em>{escape(topic)}</em> is ready. {minutes} minutes, built from {sources} sources.</td></tr>
<tr><td style="padding:28px 32px 36px"><a href="{escape(url)}" style="background:#1d1a16;color:#fffdf8;text-decoration:none;
font:600 15px Arial,sans-serif;padding:14px 24px;border-radius:999px;display:inline-block">&#9654;&nbsp; Listen to the episode</a></td></tr>
</table>
<p style="font:12px/1.5 Arial,sans-serif;color:#6e6e73;margin:16px 0 0">You get this because you scheduled this briefing.
<a href="{escape(unsubscribe_url)}" style="color:#6e6e73">Stop emails for this briefing</a></p>
</td></tr></table></body></html>"""
    return subject, text, html
