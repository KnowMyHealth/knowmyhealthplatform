import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZGE3NTVmOC1mMjc0LTRmMjktOGUwNC1kZTM0MTA3NjEyY2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc2MDI2NjkwLCJpYXQiOjE3NzYwMjMwOTAsImVtYWlsIjoia25vd215aGVhbHRoMTUxQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc2MDIzMDkwfV0sInNlc3Npb25faWQiOiIzMDc2OTJjZi0yYWY5LTRiNzktOTM4YS1mNzlkM2E2MTFjMzQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.x4tWAx0ne8vRPBaBTWc_0HZiP1Ymgommm1mKtdKf2ukVLbelEbk0jLrp2Us6GpC_zjPd-dXiZQefy8GDdhMogg" # Replace with your valid admin token

async def test_coupon_workflow():
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        # ---------------------------------------------------------
        # 1. SETUP: Create Category & Lab Test
        # ---------------------------------------------------------
        print("\n--- Phase 1: Setting up Lab Test ---")
        cat_res = await client.post(
            f"{BASE_URL}/lab-tests/categories", 
            json={"name": "Discounted Tests", "description": "Temp"},
            headers=headers
        )
        category_id = cat_res.json()["data"]["id"] if cat_res.status_code == 201 else (await client.get(f"{BASE_URL}/lab-tests/categories", headers=headers)).json()["data"][0]["id"]

        test_payload = {
            "category_id": category_id,
            "name": "Expensive MRI Scan",
            "organization": "City Hospital",
            "results_in": 24,
            "price": 1000.00, # Original Price: $1000
            "is_active": True
        }
        test_res = await client.post(f"{BASE_URL}/lab-tests", json=test_payload, headers=headers)
        test_id = test_res.json()["data"]["id"]
        print(f"SUCCESS: Created test '{test_payload['name']}' at ${test_payload['price']}")


        # ---------------------------------------------------------
        # 2. ADMIN: Create a Coupon
        # ---------------------------------------------------------
        print("\n--- Phase 2: Creating 50% Off Coupon ---")
        coupon_payload = {
            "code": "HALFPRICE50",
            "discount_percentage": 50.0,
            "category_id": category_id, # Restrict to this category
            "is_active": True
        }
        
        coupon_res = await client.post(f"{BASE_URL}/coupons", json=coupon_payload, headers=headers)
        
        if coupon_res.status_code != 201:
            print(f"FAILED Coupon Creation: {coupon_res.text}")
            return
            
        coupon_id = coupon_res.json()["data"]["id"]
        print(f"SUCCESS: Created coupon {coupon_payload['code']} ({coupon_payload['discount_percentage']}% off)")


        # ---------------------------------------------------------
        # 3. USER: Validate a GOOD Coupon (The Math Phase)
        # ---------------------------------------------------------
        print("\n--- Phase 3: Validating Coupon ---")
        validate_payload = {
            "code": "HALFPRICE50", # Lowercase or uppercase works!
            "lab_test_id": test_id
        }
        
        val_res = await client.post(f"{BASE_URL}/coupons/validate", json=validate_payload, headers=headers)
        
        if val_res.status_code == 200:
            math_data = val_res.json()["data"]
            print("SUCCESS: Coupon Applied!")
            print(f" -> Original Price:  ${math_data['original_price']}")
            print(f" -> Discount ({math_data['discount_percentage']}%): -${math_data['discount_amount']}")
            print(f" -> FINAL PRICE:     ${math_data['final_price']}")
        else:
            print(f"FAILED Validation: {val_res.text}")


        # ---------------------------------------------------------
        # 4. USER: Validate a BAD Coupon
        # ---------------------------------------------------------
        print("\n--- Phase 4: Testing Invalid Coupon ---")
        bad_payload = {
            "code": "FAKEDISCOUNT99",
            "lab_test_id": test_id
        }
        bad_res = await client.post(f"{BASE_URL}/coupons/validate", json=bad_payload, headers=headers)
        
        if bad_res.status_code == 400:
            print(f"SUCCESS: System correctly rejected the bad coupon.")
            print(f" -> Reason: {bad_res.json()['message']}")
        else:
            print(f"FAILED: System accepted a bad coupon! {bad_res.text}")


        # ---------------------------------------------------------
        # 5. CLEANUP
        # ---------------------------------------------------------
        print("\n--- Phase 5: Cleanup ---")
        await client.delete(f"{BASE_URL}/coupons/{coupon_id}", headers=headers)
        await client.delete(f"{BASE_URL}/lab-tests/{test_id}", headers=headers)
        print("SUCCESS: Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(test_coupon_workflow())