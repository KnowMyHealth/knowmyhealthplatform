import httpx
import asyncio
import json
import os

BASE_URL = "http://localhost:8000/api/v1"
# You need a token for an ADMIN (to create the test) 
# and a USER (to upload the prescription). 
# They can be the same token if your user is an Admin.
ADMIN_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZGE3NTVmOC1mMjc0LTRmMjktOGUwNC1kZTM0MTA3NjEyY2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1OTM4NTkyLCJpYXQiOjE3NzU5MzQ5OTIsImVtYWlsIjoia25vd215aGVhbHRoMTUxQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1OTM0OTkyfV0sInNlc3Npb25faWQiOiJkNTI2MjMyZi1jMTAyLTRiY2EtOTJhZS0wMjU0ZDhjNDAyNGIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.4x4vmccuk9JEuwr7duMeZJRrhq6UDat4r2e9rMOWArehIQI96G0clNTMA0muL33tx2yVakM5EZ4uI9X1nOy5Jw" 

# PATH TO YOUR REAL IMAGE
REAL_IMAGE_PATH = r"D:\workspace\knowmyhealthplatform\backend\samples\prescription.webp"

async def test_ocr_recommendation_flow():
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    if not os.path.exists(REAL_IMAGE_PATH):
        print(f"ERROR: Image not found at {REAL_IMAGE_PATH}")
        return

    async with httpx.AsyncClient() as client:
        # --- Phase 1 & 2: Ensure Lab Tests exist in DB ---
        # (This ensures the AI has something to recommend)
        print("\n--- Phase 1 & 2: Setup ---")
        cat_payload = {"name": "Diagnostic Tests", "description": "General"}
        cat_res = await client.post(f"{BASE_URL}/lab-tests/categories", json=cat_payload, headers=headers)
        
        category_id = None
        if cat_res.status_code == 201:
            category_id = cat_res.json()["data"]["id"]
        else:
            all_cats = await client.get(f"{BASE_URL}/lab-tests/categories", headers=headers)
            category_id = all_cats.json()["data"][0]["id"]

        # Create a few tests to give the AI options
        tests_to_create = [
            {"name": "Complete Blood Count (CBC)", "org": "City Lab"},
            {"name": "Blood Glucose Fasting", "org": "Health Diagnostics"},
            {"name": "Thyroid Profile (T3, T4, TSH)", "org": "City Lab"}
        ]
        
        for t in tests_to_create:
            await client.post(f"{BASE_URL}/lab-tests", headers=headers, json={
                "category_id": category_id,
                "name": t["name"],
                "organization": t["org"],
                "results_in": 24,
                "price": 200.00
            })
        print("Setup complete: Categories and Lab Tests are ready.")

        # --- Phase 3: Upload Real Prescription ---
        print(f"\n--- Phase 3: Uploading {os.path.basename(REAL_IMAGE_PATH)} ---")
        
        with open(REAL_IMAGE_PATH, "rb") as f:
            # Note: We set the mime-type specifically to image/webp
            files = {"file": ("prescription.webp", f, "image/webp")}
            
            ocr_res = await client.post(
                f"{BASE_URL}/prescriptions/ocr",
                headers=headers,
                files=files,
                timeout=120.0 
            )

        if ocr_res.status_code != 201:
            print(f"FAILED OCR ({ocr_res.status_code}): {ocr_res.text}")
            return

        data = ocr_res.json()["data"]
        prescription = data['prescription']
        recommendations = data['recommended_tests']

        print("\n--- Phase 4: AI Extraction Results ---")
        print(f"ID: {prescription['id']}")
        print(f"Doctor: {prescription.get('doctor_name', 'Not found')}")
        print(f"Diagnosis: {prescription.get('diagnosis', 'Not found')}")
        print(f"Medicines Found: {len(prescription.get('medicines', []))}")
        for med in prescription.get('medicines', []):
            print(f"  - {med['name']} ({med.get('dosage', '')})")

        print("\n--- Phase 5: AI Lab Recommendations ---")
        if not recommendations:
            print("No lab tests matched this prescription's data.")
        else:
            print(f"The AI suggests {len(recommendations)} tests based on the image:")
            for r in recommendations:
                print(f" -> RECOMMENDED: {r['test_name']} by {r['organization']}")

if __name__ == "__main__":
    asyncio.run(test_ocr_recommendation_flow())
