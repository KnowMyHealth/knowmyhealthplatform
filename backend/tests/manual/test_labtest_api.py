import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZGE3NTVmOC1mMjc0LTRmMjktOGUwNC1kZTM0MTA3NjEyY2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1OTMzNzczLCJpYXQiOjE3NzU5MzAxNzMsImVtYWlsIjoia25vd215aGVhbHRoMTUxQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1OTMwMTczfV0sInNlc3Npb25faWQiOiJjNzIzOGJmNy0zNWM1LTQxYTItYjRjZS1lODczNjA2ZTliNGMiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.x0Odn4laiJqDQ5eA77f2oT_HkJBnJYQR3pPUig2wYEZNKcX2RULHwFrGjKrJmV_10cjwptU5vviJPiQ9IRKZrQ"  # Replace with an actual admin token

async def test_labtest_workflow():
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        # ---------------------------------------------------------
        # 1. ADMIN: Create a Lab Test Category
        # ---------------------------------------------------------
        print("\n--- Testing: Create Category ---")
        category_data = {
            "name": "MRI",
            "description": "Comprehensive MRI scans and analysis"
        }
        
        cat_res = await client.post(
            f"{BASE_URL}/lab-tests/categories", 
            json=category_data, 
            headers=headers
        )
        
        if cat_res.status_code != 201:
            print(f"FAILED Category Creation: {cat_res.text}")
            return
            
        category_id = cat_res.json()["data"]["id"]
        print(f"SUCCESS: Category created. ID: {category_id}")


        # ---------------------------------------------------------
        # 2. ADMIN: Create a Lab Test
        # ---------------------------------------------------------
        print("\n--- Testing: Create Lab Test ---")
        test_data = {
            "category_id": category_id,
            "name": "Complete Blood Count (CBC)",
            "organization": "City Health Diagnostics",
            "results_in": 24,
            "price": 150.00,
            "discount_percentage": 10.0,
            "is_active": True
        }

        test_res = await client.post(
            f"{BASE_URL}/lab-tests", 
            json=test_data, 
            headers=headers
        )
        
        if test_res.status_code != 201:
            print(f"FAILED Lab Test Creation: {test_res.text}")
            return
            
        test_id = test_res.json()["data"]["id"]
        print(f"SUCCESS: Lab Test created. ID: {test_id}")


        # ---------------------------------------------------------
        # 3. PUBLIC/USER: List Lab Tests
        # ---------------------------------------------------------
        print("\n--- Testing: List Lab Tests ---")
        # Passing category_id as a query param to filter
        list_res = await client.get(
            f"{BASE_URL}/lab-tests?category_id={category_id}", 
            headers=headers
        )
        
        if list_res.status_code == 200:
            tests = list_res.json()["data"]
            print(f"SUCCESS: Retrieved {len(tests)} tests.")
            print(f"First test name: {tests[0]['name']} (Price: ${tests[0]['price']})")
        else:
            print(f"FAILED Listing Tests: {list_res.text}")


        # ---------------------------------------------------------
        # 4. ADMIN: Update Lab Test
        # ---------------------------------------------------------
        print("\n--- Testing: Update Lab Test ---")
        update_data = {
            "price": 120.00,
            "discount_percentage": 5.0
        }
        
        update_res = await client.patch(
            f"{BASE_URL}/lab-tests/{test_id}", 
            json=update_data, 
            headers=headers
        )

        if update_res.status_code == 200:
            updated_price = update_res.json()["data"]["price"]
            print(f"SUCCESS: Lab Test updated. New Price: ${updated_price}")
        else:
            print(f"FAILED Update Test: {update_res.text}")


        # ---------------------------------------------------------
        # 5. ADMIN: Delete Lab Test
        # ---------------------------------------------------------
        print("\n--- Testing: Delete Lab Test ---")
        delete_res = await client.delete(
            f"{BASE_URL}/lab-tests/{test_id}", 
            headers=headers
        )

        if delete_res.status_code == 204:
            print("SUCCESS: Lab Test deleted successfully.")
        else:
            print(f"FAILED Delete Test: {delete_res.status_code} - {delete_res.text}")


if __name__ == "__main__":
    asyncio.run(test_labtest_workflow())