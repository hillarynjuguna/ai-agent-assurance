import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

out_dir = r'C:\Users\jacef\Documents\Agentic-Commerce-Zero-Capital-Launch-Kit\trust-readiness-diagnostic\public\gumroad-assets'
downloads_dir = r'C:\Users\jacef\Downloads'

os.makedirs(out_dir, exist_ok=True)

def create_pdf(filename, title_text, product_name, time_text, steps_text):
    filepath = os.path.join(out_dir, filename)
    dl_path = os.path.join(downloads_dir, filename)
    
    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f111a'),
        spaceAfter=10
    )
    
    sub_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=15
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0f111a'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )

    box_style = ParagraphStyle(
        'BoxText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569')
    )

    elements = []
    
    # Title
    elements.append(Paragraph(title_text, title_style))
    elements.append(Paragraph(f"Product Purchased: <b>{product_name}</b>", sub_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=15))
    
    # Overview
    elements.append(Paragraph("Thank you for your purchase.", heading_style))
    elements.append(Paragraph(
        "Your order has been received. This early-access release is fulfilled manually by our governance engineering team to ensure accuracy for your workflow.",
        body_style
    ))
    
    # Next Steps
    elements.append(Paragraph("Action Required to Receive Your Deliverables:", heading_style))
    for step in steps_text:
        elements.append(Paragraph(f"- {step}", body_style))
    
    elements.append(Spacer(1, 10))
    
    # Delivery Time
    elements.append(Paragraph("Expected Delivery Time:", heading_style))
    elements.append(Paragraph(f"Your report package will be emailed to your purchase address <b>within {time_text}</b>.", body_style))
    
    elements.append(Spacer(1, 10))
    
    # License Key Explanation
    elements.append(Paragraph("Gumroad License Key Notice:", heading_style))
    elements.append(Paragraph(
        "Your Gumroad License Key serves as your unique purchase reference number. Automated license key verification is not enabled during early access. Please include your License Key in any support email if needed for purchase reference or verification.",
        body_style
    ))

    elements.append(Spacer(1, 10))

    # Support
    elements.append(Paragraph("Customer Support & Inquiries:", heading_style))
    elements.append(Paragraph("Direct Email Support: <b>thegeiya@gmail.com</b>", body_style))
    
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=12))
    
    # Disclaimer Box
    disclaimer_text = "<b>Important Pre-Diligence Disclaimer:</b> This document and associated deliverables are pre-diligence evaluation aids. They do not constitute formal legal, regulatory, cyber insurance, payment processor, or investment advice. Scores rely on user-provided operational details. External counterparty acceptance is subject to independent audit and is not guaranteed."
    elements.append(Paragraph(disclaimer_text, box_style))

    doc.build(elements)
    
    # Copy to downloads
    import shutil
    shutil.copy(filepath, dl_path)
    print(f"Created {filepath} and copied to {dl_path}")

# Product 1 PDF
create_pdf(
    "Agent_Trust_Readiness_Report_Fulfillment.pdf",
    "Agent Trust Readiness Report",
    "Agent Trust Readiness Report ($19 Early Access)",
    "12 business hours",
    [
        "<b>If you have a Report ID:</b> Reply to your receipt email or write to <b>thegeiya@gmail.com</b> with your <code>Report ID</code> (format: <code>rep_xxxxxxxxxxxxxxxx</code>).",
        "<b>If you do not have a Report ID:</b> Reply to your order receipt email with your Workflow Name, Risk Level (Informational, Operational, Financial, Regulated, Safety-Critical), and a brief description of what your AI agent is authorized to do."
    ]
)

# Product 2 PDF
create_pdf(
    "Founder_Trust_Review_Fulfillment.pdf",
    "Founder Trust Review Guide",
    "Founder Trust Review ($149 Early Access)",
    "48 business hours",
    [
        "<b>Submit your workflow details:</b> Reply to your Gumroad receipt email or write to <b>thegeiya@gmail.com</b> with your Workflow Name, Risk Level, high-level technology stack description, and primary target counterparties (e.g., Payment Processors, Investors, Insurers, Enterprise Clients, Regulators).",
        "<b>Optional Report ID:</b> If you ran the online diagnostic tool, include your <code>Report ID</code> to automatically link your complete diagnostic payload.",
        "<b>Specific Focus:</b> Include any specific architecture questions or due-diligence concerns you want our governance engineering team to address."
    ]
)

