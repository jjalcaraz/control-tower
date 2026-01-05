"""
Custom exceptions for the SMS Control Tower application
"""

class SMSControlTowerException(Exception):
    """Base exception for SMS Control Tower"""
    pass


class SMSServiceError(SMSControlTowerException):
    """Exception raised for SMS service errors"""
    pass


class DatabaseError(SMSControlTowerException):
    """Exception raised for database errors"""
    pass


class ValidationError(SMSControlTowerException):
    """Exception raised for validation errors"""
    pass


class AuthenticationError(SMSControlTowerException):
    """Exception raised for authentication errors"""
    pass


class AuthorizationError(SMSControlTowerException):
    """Exception raised for authorization errors"""
    pass


class RateLimitError(SMSControlTowerException):
    """Exception raised when rate limits are exceeded"""
    pass


class ComplianceError(SMSControlTowerException):
    """Exception raised for compliance violations"""
    pass


class IntegrationError(SMSControlTowerException):
    """Exception raised for integration errors"""
    pass


class TemplateError(SMSControlTowerException):
    """Exception raised for template errors"""
    pass