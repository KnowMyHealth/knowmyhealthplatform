from typing import Union
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage

from app.core.llm import model, groq_model
from app.modules.symptom_checker.schemas import FinalReport

SYSTEM_PROMPT = """
You are an expert AI Medical Symptom Checker. 
Interact with the patient to narrow down possible causes of their symptoms.

RULES & WORKFLOW:
1. ONGOING CONVERSATION: If you need more information, you must ask EXACTLY ONE conversational follow-up question. Do NOT ask multiple questions at the same time. Do not use bullet points or numbered lists. Wait for the user to answer before asking the next thing. (Max 5 turns). Ensure the question is to the point and one liner.
2. FINAL REPORT: If you have enough info OR have reached 5 conversation turns, you MUST generate the Final Report.
3. STRICT REQUIREMENT: Never invent lab tests. Only recommend tests from the provided 'AVAILABLE LAB TESTS' list.
"""


def _create_symptom_agent() -> Agent:
    return Agent(
        model=groq_model,
        system_prompt=SYSTEM_PROMPT,
        # The magic happens here: AI can return text OR trigger the FinalReport tool
        output_type=Union[str, FinalReport], 
        retries=2
    )

async def run_symptom_checker(
    message_history: list[ModelMessage], 
    current_message: str, 
    available_tests: list[dict]
) -> Union[str, FinalReport]:
    
    agent = _create_symptom_agent()
    
    prompt = f"""
AVAILABLE LAB TESTS:
{available_tests}

LATEST USER MESSAGE:
{current_message}

when needed ask user question one by one, each question should be small to the point one liner.
"""
    result = await agent.run(prompt, message_history=message_history)
    return result.output