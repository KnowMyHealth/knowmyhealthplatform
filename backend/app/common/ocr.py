from pydantic_ai import Agent, BinaryContent
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.core.llm import model

class MedicineSchema(BaseModel):
    name: str = Field(..., description="Name of the medicine")

    dosage: Optional[str] = Field(
        None,
        description="Dosage like 500mg, 10ml, etc."
    )

    frequency: Optional[str] = Field(
        None,
        description="How often to take, e.g. twice daily"
    )

    duration: Optional[str] = Field(
        None,
        description="Duration like 5 days"
    )

    instructions: Optional[str] = Field(
        None,
        description="Extra instructions like after food"
    )

class PrescriptionSchema(BaseModel):
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None

    diagnosis: Optional[str] = Field(
        None,
        description="Disease or condition"
    )

    prescription_date: Optional[datetime] = None

    medicines: List[MedicineSchema] = Field(
        default_factory=list,
        description="List of medicines"
    )

SYSTEM_PROMPT = """
You are a medical vision OCR extraction agent.
You will receive an image of a medical prescription.
Your task is to carefully read the image and extract structured prescription data.
You MUST return ONLY valid JSON that strictly matches the schema.
If unsure about a field, return null.
Never return an empty medicines list if medicines are present in the image.

---

## OUTPUT FORMAT (STRICT)

Return a JSON object with this exact structure:

{
  "doctor_name": string | null,
  "hospital_name": string | null,
  "diagnosis": string | null,
  "prescription_date": string | null,
  "medicines": [
    {
      "name": string,
      "dosage": string | null,
      "frequency": string | null,
      "duration": string | null,
      "instructions": string | null
    }
  ]
}

---

## CORE INSTRUCTIONS

1. VISUAL READING
- Carefully read all visible text in the image
- Pay attention to handwritten and printed text
- Use layout clues (top = doctor/hospital, middle = diagnosis, bottom = medicines)

---

2. STRICT EXTRACTION
- Extract ONLY what is visible
- DO NOT guess unclear text
- If unsure, return null for that field

---

3. DOCTOR & HOSPITAL
- Usually found at the top
- Extract doctor name (e.g., "Dr. Sharma")
- Extract hospital/clinic name if present

---

4. DIAGNOSIS
- Look for keywords:
  - Diagnosis
  - Dx
  - Symptoms section
- If not clearly visible → return null

---

5. DATE
- Extract prescription date
- Convert to YYYY-MM-DD if clearly readable
- Otherwise return null

---

6. MEDICINES (CRITICAL)

Identify medicine entries, usually listed line by line.

For each medicine:
- name (REQUIRED if visible)
- dosage (e.g., 500mg, 10ml)
- frequency (once daily, twice daily, etc.)
- duration (e.g., 5 days)
- instructions (e.g., after food)

---

7. MEDICAL ABBREVIATIONS

Interpret common abbreviations:
- OD → once daily
- BD → twice daily
- TDS → three times daily
- QID → four times daily
- HS → at bedtime

---

8. CLEANING RULES

- Remove prefixes:
  - Tab, Tablet, Cap, Capsule, Syrup
- Normalize values:
  - "BD" → "twice daily"
- Keep output clean and readable

---

9. HANDWRITING UNCERTAINTY

- If a medicine name is unclear:
  → still include it if partially readable
- If completely unreadable:
  → skip that entry

---

10. STRICT OUTPUT RULE

- Output ONLY JSON
- No explanations
- No markdown
- No comments
- No trailing commas

---

## IMPORTANT

- Never hallucinate medicines or diagnosis
- Never invent values
- If something is not clearly visible → return null

---

## GOAL

Accurately convert the prescription image into structured medical data.
"""

def create_ocr_agent() -> Agent:
    return Agent(
        name="Prescription OCR Agent",
        description="Extracts structured prescription data from prescription images",
        model=model,
        output_type=PrescriptionSchema,
        system_prompt=SYSTEM_PROMPT,
    )

async def extract_prescription_data(image_bytes: bytes) -> PrescriptionSchema:
    agent = create_ocr_agent()
    
    result = await agent.run([
        "Analyze the following image and extract prescription data:",
        BinaryContent(
            data=image_bytes,
            media_type="image/webp",
        )
    ])
    return result.output

if __name__ == "__main__":
    import asyncio
    import os

    async def main():
        with open("samples/prescription.webp", "rb") as f:
            image_bytes = f.read()
        
        prescription_data = await extract_prescription_data(image_bytes)
        print(prescription_data.model_dump_json(indent=2))

    asyncio.run(main())

