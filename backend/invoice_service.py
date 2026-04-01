import os
import stripe
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from io import BytesIO

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

def create_payment_link(amount: float, description: str, client_email: str, invoice_id: int, metadata: dict = None) -> str | None:
    """Create a Stripe Payment Link for an invoice. Returns URL or None if Stripe not configured."""
    if not stripe.api_key:
        return None
    try:
        # Create a Price first, then a Payment Link
        price = stripe.Price.create(
            unit_amount=int(amount * 100),  # cents
            currency="usd",
            product_data={"name": description},
        )
        payment_link = stripe.PaymentLink.create(
            line_items=[{"price": price.id, "quantity": 1}],
            metadata={"invoice_id": str(invoice_id), **(metadata or {})},
        )
        return payment_link.url
    except Exception as e:
        print(f"[STRIPE] Error creating payment link: {e}")
        return None

def generate_invoice_pdf(invoice_id: int, client_name: str, amount: float, due_date: str, notes: str, from_name: str, payment_url: str = None) -> bytes:
    """Generate a PDF invoice using ReportLab. Returns PDF bytes."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    story = []

    # Header
    story.append(Paragraph(f"<b>INVOICE</b>", styles['Title']))
    story.append(Paragraph(f"From: {from_name}", styles['Normal']))
    story.append(Paragraph(f"Invoice #: {invoice_id}", styles['Normal']))
    story.append(Spacer(1, 20))

    # Bill to
    story.append(Paragraph(f"<b>Bill To:</b> {client_name}", styles['Normal']))
    story.append(Paragraph(f"<b>Due Date:</b> {due_date or 'Upon receipt'}", styles['Normal']))
    story.append(Spacer(1, 20))

    # Line items table
    data = [['Description', 'Amount'],
            [notes or 'Professional Services', f'${amount:.2f}'],
            ['', ''],
            ['TOTAL', f'${amount:.2f}']]
    table = Table(data, colWidths=[350, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4ECDC4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F5F5F5')]),
    ]))
    story.append(table)

    if payment_url:
        story.append(Spacer(1, 30))
        story.append(Paragraph(f"Pay online: {payment_url}", styles['Normal']))

    doc.build(story)
    return buffer.getvalue()
