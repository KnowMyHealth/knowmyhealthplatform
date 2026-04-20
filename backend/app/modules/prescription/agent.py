from typing import List
from loguru import logger
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from app.core.llm import model
from uuid import UUID

class LabTestRecommendation(BaseModel):
    id: UUID = Field(..., description="The EXACT UUID id of the lab test")
    test_name: str = Field(..., description="Name of the recommended lab test")
    organization: str = Field(..., description="The lab or hospital providing the test")

class RecommendationResponse(BaseModel):
    recommendations: List[LabTestRecommendation] = Field(default_factory=list)

PROMPT = """
You are an expert medical diagnostic assistant.
Your goal is to suggest relevant lab tests from the 'AVAILABLE LAB TESTS' list based on the 'PATIENT PRESCRIPTION DATA'.

GUIDELINES:
1. Look for tests that help monitor the extracted diagnosis (e.g., if diagnosis is hypoglycemia, suggest Blood Glucose tests).
2. Look for tests related to the prescribed medicines (e.g., if taking insulin or dextrose, sugar tests are relevant).
3. Be proactive: suggest follow-up or confirmatory tests that a doctor would typically order for such symptoms.
4. ONLY suggest tests that exist in the provided 'AVAILABLE LAB TESTS' list.
5. Return the id, test_name, and organization exactly as they appear in the available list.
6. If no relevant tests match at all, return an empty list.
7. You MUST return the 'id' exactly as provided in the available list.
8. The 'id' must be a valid UUID string. Do not add quotes, labels, or extra text inside the ID field.
"""

def _create_test_recommendation_agent() -> Agent:
    return Agent(
        model=model,
        system_prompt=PROMPT,
        output_type=RecommendationResponse,
    )

async def get_lab_test_recommendation(available_tests: list[dict], data: dict) -> List[LabTestRecommendation]:
    agent = _create_test_recommendation_agent()
    
    prompt = f"""
AVAILABLE LAB TESTS:
{available_tests}

PATIENT PRESCRIPTION DATA:
{data}
"""
    result = await agent.run(prompt)
    logger.debug(f"AI recommendation raw output: {result.output.recommendations}")
    return result.output.recommendations