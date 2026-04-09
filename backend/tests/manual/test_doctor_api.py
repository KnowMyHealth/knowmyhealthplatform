import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZGE3NTVmOC1mMjc0LTRmMjktOGUwNC1kZTM0MTA3NjEyY2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1NzI2NTU2LCJpYXQiOjE3NzU3MjI5NTYsImVtYWlsIjoia25vd215aGVhbHRoMTUxQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1NzIyOTU2fV0sInNlc3Npb25faWQiOiI2OGJhYjg3Zi0xNjBiLTQ1NmMtOGM2ZS1hYWNlNWJkZDEyNGMiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.imKOb7P6uIOAxK68zDmGEPLiIM4wZlm0gmiq5zDS6lxNdug2xprgoYuerOouksyJM962gchcQZ8eOBA2wllW4Q"

async def test_doctor_workflow():
    async with httpx.AsyncClient() as client:
        # 1. PUBLIC: Apply as a Doctor
        print("\n--- Testing Public Application ---")
        
        # Create dummy PDF in memory
        files = {
            "license_file": ("license.pdf", b"%PDF-1.4 dummy content", "application/pdf")
        }
        
        # All fields required by your DoctorCreateRequest.as_form
        data = {
            "first_name": "Gregory",
            "last_name": "House",
            "email": "ankushbarua909@gmail.com",
            "specialization": "Diagnostic Medicine",
            "license_id": "NJ-998877",
            "consultation_fee": "250.00",
            "years_of_experience": "20",
            "bio": "I solve the cases no one else can."
        }

        response = await client.post(f"{BASE_URL}/doctors/apply", data=data, files=files)
        
        if response.status_code != 201:
            print(f"FAILED Apply: {response.json()}")
            return
            
        doctor_id = response.json()["data"]["id"]
        print(f"SUCCESS: Application submitted. Doctor ID: {doctor_id}")

        # 2. ADMIN: Approve the Doctor
        print("\n--- Testing Admin Approval ---")
        headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
        
        approve_res = await client.post(
            f"{BASE_URL}/doctors/{doctor_id}/approve", 
            headers=headers
        )

        if approve_res.status_code == 200:
            print("SUCCESS: Doctor approved and Supabase invite sent!")
            print(json.dumps(approve_res.json(), indent=2))
        else:
            print(f"FAILED Approval: {approve_res.json()}")

if __name__ == "__main__":
    asyncio.run(test_doctor_workflow())