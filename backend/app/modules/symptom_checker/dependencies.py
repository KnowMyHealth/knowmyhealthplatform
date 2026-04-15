from app.modules.symptom_checker.service import SymptomCheckerService

def get_symptom_checker_service() -> SymptomCheckerService:
    return SymptomCheckerService()