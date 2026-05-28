# app/core/email.py
import resend
from loguru import logger
from app.core.config import settings

def send_doctor_welcome_email(to_email: str, doctor_name: str, temp_password: str) -> bool:
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2b6cb0;">Welcome to Know My Health, Dr. {doctor_name}!</h2>
            <p>We are thrilled to inform you that your application has been <strong>approved</strong> by our administration team.</p>
            
            <p>Your account is now active. You can log in to the portal using the following credentials:</p>
            
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Email:</strong> {to_email}</p>
                <p style="margin: 10px 0 0 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 3px 6px; border-radius: 3px;">{temp_password}</code></p>
            </div>
            
            <p><em>Please ensure you log in and change your password immediately.</em></p>
            
            <p>Best Regards,<br/><strong>The Know My Health Team</strong></p>
        </div>
        """

        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": "Your Doctor Account is Approved!",
            "html": html_content
        })
        
        logger.info(f"Welcome email sent successfully to {to_email}. Resend ID: {response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def send_doctor_invite_email(to_email: str, doctor_name: str, invite_link: str) -> bool:
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2b6cb0;">Welcome to Know My Health, Dr. {doctor_name}!</h2>
            <p>We are thrilled to inform you that your application has been <strong>approved</strong> by our administration team.</p>
            
            <p>To activate your account and set up your password, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" style="background-color: #2b6cb0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Accept Invitation & Set Password
                </a>
            </div>
            
            <p style="font-size: 0.9em; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="{invite_link}">{invite_link}</a></p>
            
            <p>Best Regards,<br/><strong>The Know My Health Team</strong></p>
        </div>
        """

        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": "Invitation to Join Know My Health",
            "html": html_content
        })
        
        logger.info(f"Invite email sent successfully to {to_email}. Resend ID: {response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send invite email to {to_email}: {str(e)}")
        return False

def send_partner_welcome_email(to_email: str, company_name: str, temp_password: str, coupon_code: str) -> bool:
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
            <h2 style="color: #2b6cb0;">Welcome to Know My Health, {company_name}!</h2>
            <p>Your corporate partner application has been <strong>approved</strong> by our administration team.</p>
            
            <p>Your portal is now active. You can log in using these temporary credentials:</p>
            
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Portal Email:</strong> {to_email}</p>
                <p style="margin: 10px 0 0 0;"><strong>Temporary Password:</strong> <code style="background: #edf2f7; padding: 3px 6px; border-radius: 3px; font-weight: bold;">{temp_password}</code></p>
            </div>
            
            <div style="background-color: #ebf8ff; border: 1px dashed #3182ce; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #2b6cb0;">Your Exclusive Corporate Coupon is Active!</p>
                <p style="margin: 5px 0 0 0;">Your employees can use this coupon at checkout to receive their corporate discount:</p>
                <p style="margin: 10px 0 0 0; font-size: 1.2em;"><strong>Coupon Code:</strong> <code style="color: #2b6cb0; font-weight: bold; background: #fff; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px;">{coupon_code}</code></p>
            </div>
            
            <p><em>Please log in and update your password immediately to secure your organization's health portal.</em></p>
            
            <p>Best Regards,<br/><strong>The Know My Health Corporate Team</strong></p>
        </div>
        """
        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": "Your Corporate Partner Account is Approved!",
            "html": html_content
        })
        logger.info(f"Partner welcome email sent successfully to {to_email}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to partner {to_email}: {str(e)}")
        return False

def send_employee_welcome_email(to_email: str, employee_name: str, company_name: str, temp_password: str, coupon_code: str) -> bool:
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
            <h2 style="color: #2b6cb0;">Welcome to Know My Health, {employee_name}!</h2>
            <p>We are excited to let you know that your employer, <strong>{company_name}</strong>, has added you to our corporate benefits program.</p>
            
            <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #2b6cb0;">Your Account is Ready!</p>
                <p style="margin: 5px 0 0 0;">You can log in to your employee health portal using these temporary credentials:</p>
                <p style="margin: 10px 0 0 0;"><strong>Email:</strong> {to_email}</p>
                <p style="margin: 5px 0 0 0;"><strong>Temporary Password:</strong> <code style="background: #edf2f7; padding: 3px 6px; border-radius: 3px; font-weight: bold;">{temp_password}</code></p>
            </div>

            <div style="background-color: #f0fff4; border: 1px dashed #38a169; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #38a169;">Exclusive Employee Discount Active!</p>
                <p style="margin: 5px 0 0 0;">Use your company's private discount coupon code during checkout to save instantly on lab checkups:</p>
                <p style="margin: 10px 0 0 0; font-size: 1.25em;"><strong>Coupon Code:</strong> <code style="color: #38a169; background: #fff; padding: 3px 8px; border: 1px solid #c6f6d5; border-radius: 3px; font-weight: bold;">{coupon_code}</code></p>
            </div>
            
            <p><em>Please make sure you log in and change your temporary password immediately to keep your health data private.</em></p>
            
            <p>Best Regards,<br/><strong>The Know My Health Corporate Team</strong></p>
        </div>
        """
        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": f"Your Corporate Health Benefits are Active! - {company_name}",
            "html": html_content
        })
        logger.info(f"Employee onboarding email sent successfully to {to_email}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send employee email to {to_email}: {str(e)}")
        return False
    
def send_labtest_booking_email(
    to_email: str, 
    patient_name: str, 
    test_name: str, 
    scheduled_date: str, 
    clinic_address: str, 
    clinic_timing: str,
    payment_summary_html: str = "" # <-- NEW
) -> bool:
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
            <h2 style="color: #2b6cb0;">Booking Confirmed!</h2>
            <p>Hi <strong>{patient_name}</strong>,</p>
            <p>Your payment was successful and your lab test appointment is confirmed.</p>
            
            <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 1.1em;"><strong>{test_name}</strong></p>
                <p style="margin: 5px 0;"><strong>📅 Date:</strong> {scheduled_date}</p>
                <p style="margin: 5px 0;"><strong>⏰ Clinic Hours:</strong> {clinic_timing}</p>
                <p style="margin: 5px 0;"><strong>📍 Address:</strong> {clinic_address}</p>
                {payment_summary_html}
            </div>
            
            <p>Please arrive at the clinic during the operating hours on your scheduled date. If you have any questions, please contact our support team.</p>
            
            <p>Best Regards,<br/><strong>The Know My Health Team</strong></p>
        </div>
        """

        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": f"Booking Confirmed: {test_name}",
            "html": html_content
        })
        
        logger.info(f"Lab test confirmation email sent to {to_email}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send lab test confirmation email to {to_email}: {str(e)}")
        return False
    
def send_health_package_booking_email(
    to_email: str, 
    patient_name: str, 
    package_name: str, 
    scheduled_date: str, 
    clinic_address: str, 
    clinic_timing: str,
    payment_summary_html: str = "" # <-- NEW
) -> bool:
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
            <h2 style="color: #2b6cb0;">Health Package Booking Confirmed!</h2>
            <p>Hi <strong>{patient_name}</strong>,</p>
            <p>Your payment was successful and your health package checkup is confirmed.</p>
            
            <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 1.1em;"><strong>{package_name}</strong></p>
                <p style="margin: 5px 0;"><strong>📅 Date:</strong> {scheduled_date}</p>
                <p style="margin: 5px 0;"><strong>⏰ Clinic Hours:</strong> {clinic_timing}</p>
                <p style="margin: 5px 0;"><strong>📍 Address:</strong> {clinic_address}</p>
                {payment_summary_html}
            </div>
            
            <p>Please arrive at the clinic during the operating hours on your scheduled date. Fasting might be required depending on the tests included in your package.</p>
            
            <p>Best Regards,<br/><strong>The Know My Health Team</strong></p>
        </div>
        """

        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": f"Booking Confirmed: {package_name}",
            "html": html_content
        })
        
        logger.info(f"Health package confirmation email sent to {to_email}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send health package confirmation email to {to_email}: {str(e)}")
        return False
    

def send_consultation_booking_patient_email(
    to_email: str, 
    patient_name: str, 
    doctor_name: str, 
    scheduled_date: str, 
    consultation_type: str, 
    clinic_address: str | None,
    payment_summary_html: str = "" # <-- NEW
) -> bool:
    """Sends a booking confirmation email to the Patient."""
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        location_html = f"<p style='margin: 5px 0;'><strong>📍 Clinic Address:</strong> {clinic_address}</p>" if consultation_type == "OFFLINE" and clinic_address else ""
        link_html = "<p style='margin: 5px 0;'><strong>🔗 Join Link:</strong> Available in your dashboard 5 mins before the call.</p>" if consultation_type == "ONLINE" else ""

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
            <h2 style="color: #2b6cb0;">Consultation Confirmed!</h2>
            <p>Hi <strong>{patient_name}</strong>,</p>
            <p>Your consultation appointment has been successfully booked.</p>
            
            <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 1.1em;"><strong>Dr. {doctor_name}</strong></p>
                <p style="margin: 5px 0;"><strong>📅 Date & Time:</strong> {scheduled_date}</p>
                <p style="margin: 5px 0;"><strong>🩺 Type:</strong> {consultation_type}</p>
                {location_html}
                {link_html}
                {payment_summary_html}
            </div>
            
            <p>If you have any questions or need to reschedule, please visit your dashboard or contact our support team.</p>
            
            <p>Best Regards,<br/><strong>The Know My Health Team</strong></p>
        </div>
        """

        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": f"Booking Confirmed: Dr. {doctor_name}",
            "html": html_content
        })
        logger.info(f"Patient consultation confirmation email sent to {to_email}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send patient consultation email to {to_email}: {str(e)}")
        return False


def send_consultation_booking_doctor_email(
    to_email: str, 
    doctor_name: str, 
    patient_name: str, 
    scheduled_date: str, 
    consultation_type: str,
    payment_summary_html: str = "" # <-- NEW
) -> bool:
    """Sends a new booking notification email to the Doctor."""
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
            <h2 style="color: #38a169;">New Appointment Booked</h2>
            <p>Hi <strong>Dr. {doctor_name}</strong>,</p>
            <p>A new patient has booked a consultation with you.</p>
            
            <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 1.1em;"><strong>Patient: {patient_name}</strong></p>
                <p style="margin: 5px 0;"><strong>📅 Date & Time:</strong> {scheduled_date}</p>
                <p style="margin: 5px 0;"><strong>🩺 Type:</strong> {consultation_type}</p>
                {payment_summary_html}
            </div>
            
            <p>Please log in to your provider dashboard to view the patient's full medical profile and history.</p>
            
            <p>Best Regards,<br/><strong>The Know My Health Team</strong></p>
        </div>
        """

        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": f"New Appointment: {patient_name}",
            "html": html_content
        })
        logger.info(f"Doctor consultation notification email sent to {to_email}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send doctor consultation email to {to_email}: {str(e)}")
        return False

def send_admin_new_booking_email(
    booking_type: str, 
    patient_name: str, 
    patient_email: str, 
    amount: float, 
    details: str
) -> bool:
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()
        from_email = "Know My Health <onboarding@hello.knowmyhealth.in>"
        
        # ⚠️ CHANGE THIS TO YOUR ACTUAL ADMIN RECEIVING EMAIL ⚠️
        to_email = settings.ADMIN_EMAIL

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
            <h2 style="color: #2b6cb0;">New {booking_type} Received! 🚀</h2>
            <p>A new payment was successfully processed on the platform.</p>
            
            <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Patient:</strong> {patient_name} ({patient_email})</p>
                <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹{amount}</p>
                <p style="margin: 5px 0;"><strong>Details:</strong> {details}</p>
            </div>
            
            <p>Log in to the Admin Dashboard to view full transaction and booking details.</p>
            <p>Best Regards,<br/><strong>KMH Automated System</strong></p>
        </div>
        """

        response = resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": f"💰 New Booking: {booking_type} - {patient_name}",
            "html": html_content
        })
        
        logger.info(f"Admin notification email sent for {booking_type}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send admin notification email: {str(e)}")
        return False