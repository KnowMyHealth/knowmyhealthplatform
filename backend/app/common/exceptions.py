class BaseDomainException(Exception):
    """
    The parent of ALL internal business exceptions.
    It carries a 'status_code' so the API knows how to 
    translate it automatically.
    """
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code