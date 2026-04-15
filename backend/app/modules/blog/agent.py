from typing import Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent, WebSearchTool
from app.core.llm import model
from app.modules.blog.tools import fetch_images, look_at_image

SYSTEM_PROMPT = """
You are an expert SEO medical blog writer for 'Know My Health'. 
Your task is to write highly engaging, factually accurate, and well-structured blog posts in Markdown format.

RULES & WORKFLOW:
1. RESEARCH: Use the WebSearchTool to find the latest, accurate information on the topic.
2. VISUALS: Use the `fetch_images` tool to search for relevant images. Request at least 3 to 4 images.
3. COVER IMAGE: Select the best image URL from the fetch_images response and place it in the `cover_image_url` field.
4. INLINE IMAGES: Embed the remaining image URLs directly inside your Markdown `content` field. Place them between paragraphs to break up text visually. Use standard Markdown image syntax: `![Descriptive Alt Text](image_url)`.
5. FORMATTING: Structure the content with clear H2 and H3 headings, bullet points, bold text for emphasis, and a strong conclusion.
6. OUTPUT: Return the exact requested schema (title, category, content, cover_image_url).


NOTE: Always call the look_at_image tool on any image URL you plan to use to ensure it fits the context of the blog. You can call this tool multiple times if needed.
"""

class AIBlogSchema(BaseModel):
    title: str = Field(..., description="The title of the blog post.")
    category: str = Field(..., description="The category of the blog post (e.g., Nutrition, Diagnostics, Wellness).")
    content: str = Field(..., description="The main body of the blog post in markdown format. MUST INCLUDE inline images using Markdown syntax.")
    cover_image_url: str = Field(..., description="URL of the cover image for the blog post.")

def _create_blog_agent() -> Agent:
    return Agent(
        name="BlogAgent",
        description="An agent that creates visually rich SEO blog content.",
        model=model,
        output_type=AIBlogSchema,
        system_prompt=SYSTEM_PROMPT,
        tools=[fetch_images, look_at_image],
        retries=3
    )

async def run_blog_agent(
    research_topic: str, 
    target_audience: str, 
    tone_of_voice: str, 
    additional_instructions: Optional[str]
) -> AIBlogSchema:
    agent = _create_blog_agent()
    
    prompt = (
        f"Create a BLOG in markdown format.\n"
        f"Research topic: {research_topic}\n"
        f"Target audience: {target_audience}\n"
        f"Tone of voice: {tone_of_voice}\n"
        f"Additional instructions: {additional_instructions or 'None'}\n"
        f"Remember to use fetch_images to get URLs and embed them in the content!"
    )
    
    result = await agent.run(prompt)
    return result.output

if __name__ == "__main__":
    import asyncio
    test_params = {
        "research_topic": "The benefits of a Mediterranean diet for heart health",
        "target_audience": "General Public",
        "tone_of_voice": "Empathetic and Informative",
        "additional_instructions": "Include recent studies and statistics. Use engaging language."
    }
    blog_draft = asyncio.run(run_blog_agent(**test_params))
    print(blog_draft.model_dump_json(indent=2))