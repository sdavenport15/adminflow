import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY", "")

FROM_EMAIL = os.getenv("FROM_EMAIL", "AdminFlow <noreply@adminflow.app>")
APP_URL = os.getenv("APP_URL", "https://adminflow-production.up.railway.app")


def _api_key_set() -> bool:
    return bool(resend.api_key)


def send_welcome_email(to_email: str, name: str) -> bool:
    """Send welcome email after registration."""
    if not _api_key_set():
        print("[EMAIL] RESEND_API_KEY not set — skipping welcome email")
        return False
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Welcome to AdminFlow 👋",
            "html": f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:-0.5px;">AdminFlow</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#1a1a2e;">Hey {name}, welcome aboard! 🎉</p>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
              You're all set. AdminFlow gives you everything you need to run your practice like a pro.
              Here's what's waiting for you:
            </p>
            <!-- Features -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:16px;background:#f0f4ff;border-radius:6px;margin-bottom:12px;display:block;">
                  <p style="margin:0;font-size:14px;font-weight:bold;color:#1a1a2e;">👥 Client Management</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Keep all your client details, notes, and history in one place.</p>
                </td>
              </tr>
              <tr><td style="height:10px;"></td></tr>
              <tr>
                <td style="padding:16px;background:#f0f4ff;border-radius:6px;display:block;">
                  <p style="margin:0;font-size:14px;font-weight:bold;color:#1a1a2e;">📅 Smart Scheduling</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Book and manage sessions without the back-and-forth.</p>
                </td>
              </tr>
              <tr><td style="height:10px;"></td></tr>
              <tr>
                <td style="padding:16px;background:#f0f4ff;border-radius:6px;display:block;">
                  <p style="margin:0;font-size:14px;font-weight:bold;color:#1a1a2e;">💳 Invoicing</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Create, send, and track invoices — get paid faster.</p>
                </td>
              </tr>
            </table>
            <br>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-top:24px;">
                  <a href="{APP_URL}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:bold;">
                    Go to AdminFlow →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you created an AdminFlow account.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
""",
        })
        return True
    except Exception as exc:
        print(f"[EMAIL] Failed to send welcome email to {to_email}: {exc}")
        return False


def send_invoice_email(
    to_email: str,
    client_name: str,
    invoice_id: int,
    amount: float,
    due_date: str,
    notes: str,
    from_name: str,
) -> bool:
    """Send invoice to client."""
    if not _api_key_set():
        print("[EMAIL] RESEND_API_KEY not set — skipping invoice email")
        return False
    invoice_url = f"{APP_URL}/invoices/{invoice_id}"
    notes_row = (
        f'<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Notes</td>'
        f'<td style="padding:8px 0;font-size:14px;color:#1a1a2e;">{notes}</td></tr>'
        if notes else ""
    )
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Invoice from {from_name} - ${amount:.2f}",
            "html": f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:-0.5px;">Invoice</h1>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">from {from_name}</p>
          </td>
        </tr>
        <!-- Amount hero -->
        <tr>
          <td style="padding:32px 40px 0;text-align:center;">
            <p style="margin:0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Amount Due</p>
            <p style="margin:8px 0 0;font-size:48px;font-weight:bold;color:#1a1a2e;">${amount:.2f}</p>
          </td>
        </tr>
        <!-- Details table -->
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
              <tr>
                <td style="padding:12px 0;font-size:14px;color:#6b7280;">Invoice #</td>
                <td style="padding:12px 0;font-size:14px;color:#1a1a2e;font-weight:bold;">{invoice_id}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;">Billed to</td>
                <td style="padding:8px 0;font-size:14px;color:#1a1a2e;">{client_name}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;">Due date</td>
                <td style="padding:8px 0;font-size:14px;color:#1a1a2e;">{due_date}</td>
              </tr>
              {notes_row}
            </table>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 40px;" align="center">
            <a href="{invoice_url}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:6px;font-size:15px;font-weight:bold;">
              View Invoice
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Sent via AdminFlow · <a href="{APP_URL}" style="color:#9ca3af;">{APP_URL}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
""",
        })
        return True
    except Exception as exc:
        print(f"[EMAIL] Failed to send invoice email to {to_email}: {exc}")
        return False


def send_onboarding_email(to_email: str, name: str) -> bool:
    """Send onboarding sequence — day 1 tips."""
    if not _api_key_set():
        print("[EMAIL] RESEND_API_KEY not set — skipping onboarding email")
        return False
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "3 things to do first in AdminFlow",
            "html": f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:-0.5px;">AdminFlow</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#1a1a2e;">Hey {name} — let's get you set up fast.</p>
            <p style="margin:0 0 32px;font-size:15px;color:#4b5563;line-height:1.6;">Most people are fully running in under 10 minutes. Here's where to start:</p>

            <!-- Step 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td width="48" valign="top">
                  <div style="width:36px;height:36px;border-radius:50%;background:#1a1a2e;text-align:center;line-height:36px;color:#ffffff;font-weight:bold;font-size:16px;">1</div>
                </td>
                <td valign="top" style="padding-left:12px;">
                  <p style="margin:0;font-size:15px;font-weight:bold;color:#1a1a2e;">Add your first client</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">
                    Head to the Clients tab and add a name, email, and any notes. Everything flows from here.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Step 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td width="48" valign="top">
                  <div style="width:36px;height:36px;border-radius:50%;background:#1a1a2e;text-align:center;line-height:36px;color:#ffffff;font-weight:bold;font-size:16px;">2</div>
                </td>
                <td valign="top" style="padding-left:12px;">
                  <p style="margin:0;font-size:15px;font-weight:bold;color:#1a1a2e;">Create an invoice</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">
                    Go to Invoices, hit New Invoice, and fill in the amount and due date. Your client gets an email automatically.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td width="48" valign="top">
                  <div style="width:36px;height:36px;border-radius:50%;background:#1a1a2e;text-align:center;line-height:36px;color:#ffffff;font-weight:bold;font-size:16px;">3</div>
                </td>
                <td valign="top" style="padding-left:12px;">
                  <p style="margin:0;font-size:15px;font-weight:bold;color:#1a1a2e;">Schedule a session</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">
                    Open the Schedule tab and block time for your next appointment. No more double-bookings.
                  </p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="{APP_URL}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:bold;">
                    Open AdminFlow →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you recently joined AdminFlow.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
""",
        })
        return True
    except Exception as exc:
        print(f"[EMAIL] Failed to send onboarding email to {to_email}: {exc}")
        return False


def send_invoice_reminder(
    to_email: str,
    client_name: str,
    invoice_id: int,
    amount: float,
    due_date: str,
    from_name: str,
) -> bool:
    """Send payment reminder for overdue invoice."""
    if not _api_key_set():
        print("[EMAIL] RESEND_API_KEY not set — skipping invoice reminder")
        return False
    invoice_url = f"{APP_URL}/invoices/{invoice_id}"
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Friendly reminder: Invoice for ${amount:.2f} is due",
            "html": f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:-0.5px;">Payment Reminder</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e;">Hi {client_name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
              Just a friendly nudge — the invoice below is due and we haven't received payment yet.
              No worries if it slipped through the cracks; it happens to all of us!
            </p>

            <!-- Invoice summary box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#6b7280;">Invoice #</td>
                      <td style="font-size:13px;color:#1a1a2e;font-weight:bold;text-align:right;">{invoice_id}</td>
                    </tr>
                    <tr><td style="height:8px;" colspan="2"></td></tr>
                    <tr>
                      <td style="font-size:13px;color:#6b7280;">Amount</td>
                      <td style="font-size:20px;color:#1a1a2e;font-weight:bold;text-align:right;">${amount:.2f}</td>
                    </tr>
                    <tr><td style="height:8px;" colspan="2"></td></tr>
                    <tr>
                      <td style="font-size:13px;color:#6b7280;">Due date</td>
                      <td style="font-size:13px;color:#dc2626;font-weight:bold;text-align:right;">{due_date}</td>
                    </tr>
                    <tr><td style="height:8px;" colspan="2"></td></tr>
                    <tr>
                      <td style="font-size:13px;color:#6b7280;">From</td>
                      <td style="font-size:13px;color:#1a1a2e;text-align:right;">{from_name}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="{invoice_url}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:6px;font-size:15px;font-weight:bold;">
                    View &amp; Pay Invoice
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              If you've already sent payment, please ignore this message. Questions? Just reply to this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Sent on behalf of {from_name} via AdminFlow.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
""",
        })
        return True
    except Exception as exc:
        print(f"[EMAIL] Failed to send invoice reminder to {to_email}: {exc}")
        return False
