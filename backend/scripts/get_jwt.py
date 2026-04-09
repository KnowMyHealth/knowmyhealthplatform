from supabase import create_client
from app.core.config import settings

url = settings.PUBLIC_SUPABASE_URL
key = settings.SUPABASE_PUBLISHABLE_KEY.get_secret_value()
supabase = create_client(url, key)

email = "knowmyhealth151@gmail.com"
password = "know#1myhealth@5"

try:
    res = supabase.auth.sign_in_with_password({"email": email, "password": password})
    print("\n--- YOUR ADMIN JWT ---")
    print(res.session.access_token)
    print("----------------------\n")
except Exception as e:
    print(f"Login failed: {e}")