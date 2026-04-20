import resend
from loguru import logger
from app.core.config import settings

def send_doctor_welcome_email(to_email: str, doctor_name: str, temp_password: str) -> bool:
    """
    Sends a welcome email to the newly approved doctor using Resend.
    """
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()

        # NOTE: In production, change "onboarding@resend.dev" to your verified domain (e.g. "noreply@knowmyhealth.com")
        from_email = "Know My Health <onboarding@resend.dev>"

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
    """
    Sends an invitation link to the newly approved doctor using Resend.
    """
    try:
        resend.api_key = settings.RESEND_API_KEY.get_secret_value()

        # Change "onboarding@resend.dev" to your domain once verified on Resend
        from_email = "Know My Health <onboarding@resend.dev>"

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