import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000/api/v1"
# Ensure this is a valid token for a user with the "ADMIN" role
ADMIN_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjJiMjUzMDkwLWVhNTMtNGE2MC1hMzhiLTdlZGQyZmY0ZjgxNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3plenNnZWxnYXloeXB3YXZyeHRzLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkZGE3NTVmOC1mMjc0LTRmMjktOGUwNC1kZTM0MTA3NjEyY2MiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1OTQ5NzEzLCJpYXQiOjE3NzU5NDYxMTMsImVtYWlsIjoia25vd215aGVhbHRoMTUxQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1OTQ2MTEzfV0sInNlc3Npb25faWQiOiI1YTlhZGJlMy1kZjJiLTQyYzQtOTdhMC1iYTEzNDM4ZTNkYzIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.yLa0jeTG0dIFd8YvRYcqndmz-ZZl3ildm6bxOq-AkF65-R9UldUh661xmzneFv38EITC22Nf5XGBRp9aIxEE7w" 

async def test_blog_workflow():
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        # ---------------------------------------------------------
        # 1. ADMIN: Generate Blog Draft using AI
        # ---------------------------------------------------------
        print("\n--- Phase 1: AI Generating Blog Draft ---")
        print("(This involves web research and image searching, please wait...)")
        
        generate_payload = {
            "research_topic": "The importance of Vitamin D for bone health",
            "target_audience": "Health-conscious adults",
            "tone_of_voice": "Informative, medical yet accessible",
            "additional_instructions": "Make sure to include a section on natural sunlight vs supplements."
        }

        # AI generation can take a while (30-90 seconds)
        gen_res = await client.post(
            f"{BASE_URL}/blogs/generate", 
            json=generate_payload, 
            headers=headers,
            timeout=120.0 
        )
        
        if gen_res.status_code != 200:
            print(f"FAILED Draft Generation: {gen_res.status_code} - {gen_res.text}")
            return
            
        draft_data = gen_res.json()["data"]
        print(f"SUCCESS: AI Drafted Blog titled: '{draft_data['title']}'")
        print(f"Cover Image URL: {draft_data['cover_image_url']}")
        print(f"Content Length: {len(draft_data['content'])} characters")


        # ---------------------------------------------------------
        # 2. ADMIN: Save the Draft to Database
        # ---------------------------------------------------------
        print("\n--- Phase 2: Saving Draft to DB ---")
        
        save_payload = {
            "title": draft_data["title"],
            "category": draft_data["category"],
            "content": draft_data["content"],
            "cover_image_url": draft_data["cover_image_url"],
            "is_published": False # Keep as draft for now
        }

        save_res = await client.post(
            f"{BASE_URL}/blogs", 
            json=save_payload, 
            headers=headers
        )
        
        if save_res.status_code != 201:
            print(f"FAILED Saving Blog: {save_res.text}")
            return
            
        blog_id = save_res.json()["data"]["id"]
        print(f"SUCCESS: Blog saved to database. ID: {blog_id}")


        # ---------------------------------------------------------
        # 3. PUBLIC: List Published Blogs
        # ---------------------------------------------------------
        print("\n--- Phase 3: Listing Blogs ---")
        # Note: We saved it as is_published=False, so standard list won't show it
        # unless we specify is_published=false in the query
        list_res = await client.get(
            f"{BASE_URL}/blogs?is_published=false", 
            headers=headers
        )
        
        if list_res.status_code == 200:
            blogs = list_res.json()["data"]
            print(f"SUCCESS: Found {len(blogs)} total blogs (including drafts).")
        else:
            print(f"FAILED Listing: {list_res.text}")


        # ---------------------------------------------------------
        # 4. ADMIN: Update/Publish the Blog
        # ---------------------------------------------------------
        print("\n--- Phase 4: Publishing the Blog ---")
        update_payload = {
            "title": f"[PUBLISHED] {draft_data['title']}",
            "is_published": True
        }
        
        update_res = await client.patch(
            f"{BASE_URL}/blogs/{blog_id}", 
            json=update_payload, 
            headers=headers
        )

        if update_res.status_code == 200:
            print(f"SUCCESS: Blog updated and published. Title: {update_res.json()['data']['title']}")
        else:
            print(f"FAILED Update: {update_res.text}")


        # ---------------------------------------------------------
        # 5. ADMIN: Delete the Blog
        # ---------------------------------------------------------
        print("\n--- Phase 5: Deleting the Blog ---")
        delete_res = await client.delete(
            f"{BASE_URL}/blogs/{blog_id}", 
            headers=headers
        )

        if delete_res.status_code == 204:
            print("SUCCESS: Blog deleted successfully.")
        else:
            print(f"FAILED Delete: {delete_res.status_code} - {delete_res.text}")


if __name__ == "__main__":
    asyncio.run(test_blog_workflow())