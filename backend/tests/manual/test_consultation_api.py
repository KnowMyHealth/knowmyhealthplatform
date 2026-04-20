import httpx
import asyncio
import json
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:8000/api/v1"

# Replace this with the token you used in your previous test
USER_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZGE3NTVmOC1mMjc0LTRmMjktOGUwNC1kZTM0MTA3NjEyY2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc2Njc3ODgxLCJpYXQiOjE3NzY2NzQyODEsImVtYWlsIjoia25vd215aGVhbHRoMTUxQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc2Njc0MjgxfV0sInNlc3Npb25faWQiOiI4ZWQwMzVkNy1kOWIyLTQ2ODctODEzNi0wNmEwYjQzMGQ3YTYiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.uAkzFfWGfLB00jkEkYkg2kgFy7MROY2Jmrh7-wIkMD5Qu3O_qPZ4PyWskV_-frQUMZoqdi2tETGM8mVUHwYjew"

# Replace this with the Doctor ID printed from your last test!
DOCTOR_ID = "25ee4efe-7f8b-459d-a0cc-4698236d8a7f" 

async def test_consultation_workflow():
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {USER_TOKEN}"}
        
        print("\n--- 1. Testing: Book a Consultation ---")
        
        # Schedule it for tomorrow
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        
        book_payload = {
            "doctor_id": DOCTOR_ID,
            "scheduled_at": tomorrow
        }

        book_res = await client.post(
            f"{BASE_URL}/consultations/book", 
            json=book_payload, 
            headers=headers
        )
        
        if book_res.status_code != 201:
            print(f"FAILED Booking: {book_res.json()}")
            print("\n💡 TIP: Did you set `video_consultation_enabled` to TRUE in your database for this doctor?")
            return
            
        consultation_id = book_res.json()["data"]["id"]
        channel_name = book_res.json()["data"]["channel_name"]
        print(f"SUCCESS: Consultation booked!")
        print(f"Consultation ID: {consultation_id}")
        print(f"Generated Channel Name: {channel_name}")

        
        print("\n--- 2. Testing: Get Agora Join Token ---")
        join_res = await client.post(
            f"{BASE_URL}/consultations/{consultation_id}/join", 
            headers=headers
        )

        if join_res.status_code == 200:
            print("SUCCESS: Agora Token Generated!")
            print(json.dumps(join_res.json(), indent=2))
        else:
            print(f"FAILED Join Token: {join_res.json()}")
            print("\n💡 TIP: Make sure you added AGORA_APP_ID and AGORA_APP_CERTIFICATE to your .env file!")
            return


        print("\n--- 3. Testing: List My Consultations ---")
        list_res = await client.get(
            f"{BASE_URL}/consultations/me", 
            headers=headers
        )

        if list_res.status_code == 200:
            count = len(list_res.json()["data"])
            print(f"SUCCESS: Retrieved {count} consultation(s).")
            print(json.dumps(list_res.json()["data"][0], indent=2))
        else:
            print(f"FAILED List Consultations: {list_res.json()}")

if __name__ == "__main__":
    asyncio.run(test_consultation_workflow())