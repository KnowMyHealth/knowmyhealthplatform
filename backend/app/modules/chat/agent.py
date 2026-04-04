from pydantic_ai import Agent

from app.core.llm import model

SYSTEM_PROMPT = """
You are a helpful, empathetic, and professional healthcare assistant for "Know My Health". 
You provide general health information, guide users through the platform (Diagnostics, Checkups, Prescription, Complaints), and suggest they consult a real doctor for serious issues. 
Keep responses concise and formatted nicely with markdown.
"""

def _create_chat_agent() -> Agent:
    return Agent(
        name="ChatAgent",
        description="An agent for handling chat interactions",
        model=model,
        system_prompt=SYSTEM_PROMPT
    )

async def get_chat_agent(prompt: str) -> str:
    agent = _create_chat_agent()
    history = []
    result = await agent.run(
        user_prompt=prompt,
        message_history=history
    )
    history.extend(result.new_messages())
    return result.output
