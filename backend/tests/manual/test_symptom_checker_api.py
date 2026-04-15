import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1"
USER_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZGE3NTVmOC1mMjc0LTRmMjktOGUwNC1kZTM0MTA3NjEyY2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc2MTU4NjQzLCJpYXQiOjE3NzYxNTUwNDMsImVtYWlsIjoia25vd215aGVhbHRoMTUxQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc2MTU1MDQzfV0sInNlc3Npb25faWQiOiIzZGM5ZTFjNi0wODgzLTRhM2ItOTk1OS1mNDQwMWFkNDhlODEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.ITBgoayXowRzWh7q8uDlpNL3rtJvYykGQGPvoo0ULY_TnNfvAbmDgHzWSJM4SFv98K9420J1OxkQ5Mk2lrCjgw" # Replace with a valid authenticated user's JWT token

async def test_symptom_checker_workflow():
    headers = {"Authorization": f"Bearer {USER_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        # ---------------------------------------------------------
        # 1. SETUP: Ensure a Lab Test exists for the AI to recommend
        # ---------------------------------------------------------
        print("\n--- Phase 1: Checking/Setting up Lab Test ---")
        cat_res = await client.post(f"{BASE_URL}/lab-tests/categories", json={"name": "General Tests", "description": "Temp"}, headers=headers)
        category_id = cat_res.json()["data"]["id"] if cat_res.status_code == 201 else (await client.get(f"{BASE_URL}/lab-tests/categories", headers=headers)).json()["data"][0]["id"]

        test_payload = {
            "category_id": category_id,
            "name": "Complete Blood Count (CBC)",
            "organization": "Central Diagnostics",
            "results_in": 24,
            "price": 100.00
        }
        await client.post(f"{BASE_URL}/lab-tests", json=test_payload, headers=headers)
        print("INFO: 'Complete Blood Count (CBC)' is available in the DB.")


        # ---------------------------------------------------------
        # 2. CHAT: Turn 1 (The AI asks a question)
        # ---------------------------------------------------------
        print("\n--- Phase 2: Chat Turn 1 ---")
        turn_1_payload = {
            "message": "I've been feeling extremely tired and dizzy lately.",
            "history": []
        }
        
        t1_res = await client.post(f"{BASE_URL}/symptom-checker", json=turn_1_payload, headers=headers, timeout=60.0)
        t1_data = t1_res.json()["data"]
        
        print(f"User: {turn_1_payload['message']}")
        print(f"AI ({t1_data['type']}): {t1_data['ai_reply']}")


        # ---------------------------------------------------------
        # 3. CHAT: Turn 2 (Forcing the Final Report)
        # ---------------------------------------------------------
        print("\n--- Phase 3: Chat Turn 2 (Forcing Final Report) ---")
        
        # We simulate that we've answered the AI's question, and we provide enough detail 
        # (mentioning paleness/weakness) to strongly hint at Anemia, which should trigger the CBC test recommendation.
        turn_2_payload = {
            "message": "It's been going on for a week. I also look very pale and feel weak. Please give me your final assessment.",
            "history": [
                {"role": "user", "content": turn_1_payload["message"]},
                {"role": "ai", "content": t1_data["ai_reply"]}
            ]
        }
        
        t2_res = await client.post(f"{BASE_URL}/symptom-checker", json=turn_2_payload, headers=headers, timeout=60.0)
        t2_data = t2_res.json()["data"]

        print(f"User: {turn_2_payload['message']}")
        
        if t2_data["type"] == "report":
            print("\nSUCCESS: AI successfully generated the Final Report and saved it to the DB!")
            print(f" -> DB Assessment ID: {t2_data['assessment_id']}")
            print(f" -> Possible Causes: {t2_data['report']['possible_causes']}")
            print(f" -> Recommended Tests: {[t['test_name'] for t in t2_data['report']['recommended_tests']]}")
            print(f" -> General Advice: {t2_data['report']['general_advice']}")
        else:
            print(f"WARNING: The AI asked another question instead of giving the report: {t2_data['ai_reply']}")

if __name__ == "__main__":
    asyncio.run(test_symptom_checker_workflow())