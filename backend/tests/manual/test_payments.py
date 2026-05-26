# test_payments.py
import requests
import uuid
import sys

# Change this if your server is running on a different port/host
BASE_URL = "http://127.0.0.1:8000/api/v1"

# PASTE A VALID JWT ACCESSTOKEN FROM YOUR FRONTEND (OR SUPABASE LOGIN) HERE:
TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlYWIwZDM4ZC1lOTNlLTQ3MmQtOTgyNC0zMTJjYWVmMGM0MGQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc5ODA0NTE2LCJpYXQiOjE3Nzk4MDA5MTYsImVtYWlsIjoic2h1YmhhbWpoMTc1QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJzaHViaGFtamgxNzVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6InNzc3MiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInJvbGUiOiJQQVRJRU5UIiwic3ViIjoiZWFiMGQzOGQtZTkzZS00NzJkLTk4MjQtMzEyY2FlZjBjNDBkIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3Nzk4MDA5MTZ9XSwic2Vzc2lvbl9pZCI6ImRmZWY5NjBmLTFjNjEtNDU2Yi05Y2I4LTgzMmM3ZTEwMzFlMiIsImlzX2Fub255bW91cyI6ZmFsc2V9.-iY1E6J3mqwhlaZ_xoy_nBY7_h0NLsXPYPQMazTlaPcKzQ-44aZB3QVyyXyCq8gR4wwAzrzPcwonuesbvU52HQ"

def run_tests():
    if TOKEN == "PASTE_YOUR_SUPABASE_JWT_ACCESS_TOKEN_HERE":
        print("❌ Error: Please paste a valid Supabase Access Token in the 'TOKEN' variable before running the script.")
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    print("🚀 Starting Payment Module Integration Tests...\n")

    # =========================================================================
    # TEST 1: CREATE RAZORPAY ORDER (Should Succeed)
    # =========================================================================
    print("🔄 Test 1: Creating a Razorpay Order...")
    
    order_payload = {
        "amount": 2500.00,  # ₹2500.00
        "booking_type": "CONSULTATION",
        "booking_id": str(uuid.uuid4())  # Generate a dummy booking ID
    }

    try:
        response = requests.post(f"{BASE_URL}/payments/order", json=order_payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Test 1 Passed! Razorpay Order Created successfully.")
            print(f"   - Internal Payment ID: {data.get('payment_id')}")
            print(f"   - Razorpay Order ID:   {data.get('razorpay_order_id')}")
            print(f"   - Amount (INR):        {data.get('amount')} {data.get('currency')}\n")
            
            # Save the order ID for the next test
            razorpay_order_id = data.get("razorpay_order_id")
        else:
            print(f"❌ Test 1 Failed! Status Code: {response.status_code}")
            print(f"   Response: {response.text}\n")
            return

    except Exception as e:
        print(f"❌ Test 1 Failed! Network/Connection Error: {e}\n")
        return

    # =========================================================================
    # TEST 2: VERIFY PAYMENT SIGNATURE WITH FAKE CREDENTIALS (Should Fail / 403)
    # =========================================================================
    print("🔄 Test 2: Verifying payment with a FRAUDULENT/FAKE signature...")
    
    verify_payload = {
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": "pay_fake123456",
        "razorpay_signature": "fake_signature_hash_1234567890abcdef"
    }

    try:
        response = requests.post(f"{BASE_URL}/payments/verify", json=verify_payload, headers=headers)
        
        # We EXPECT a 403 Forbidden or 400 Bad Request because the signature is fake!
        if response.status_code in [400, 403]:
            print(f"✅ Test 2 Passed! Backend securely rejected the fake signature.")
            print(f"   - Received expected status: {response.status_code}")
            print(f"   - Server Error Message:      {response.json().get('message')}\n")
        else:
            print(f"❌ Test 2 Failed! Server allowed a fake signature or returned unexpected code: {response.status_code}")
            print(f"   Response: {response.text}\n")

    except Exception as e:
        print(f"❌ Test 2 Failed! Network Error: {e}\n")

    print("🏁 Tests complete.")

if __name__ == "__main__":
    run_tests()