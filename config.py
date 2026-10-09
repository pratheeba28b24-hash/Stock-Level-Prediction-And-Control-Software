import os

class Config:
    # Basic Flask Settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_key_super_secret_stock_ai_2026')
    
    # DB Setup - Fallback to SQLite for testing
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f'sqlite:///{os.path.join(BASE_DIR, "inventory.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Security Config
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 1800  # 30 minutes in seconds (Auto lock / timeout)
    
    # Mail server configurations for Notifications & Alerts
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'mock-sender@gmail.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'mockmailpassword')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'mock-sender@gmail.com')

    # WhatsApp Business API Configuration (optional for direct server-side document sending)
    WHATSAPP_BUSINESS_PHONE_NUMBER = os.environ.get('WHATSAPP_BUSINESS_PHONE_NUMBER', '9751008105')
    WHATSAPP_API_TOKEN = os.environ.get('WHATSAPP_API_TOKEN', None)
    WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', None)

    # File uploads for Invoices and Product images
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB limit
    
    # Static Barcodes & QR folders
    CODES_FOLDER = os.path.join(BASE_DIR, 'static', 'codes')

    # Security Lock settings
    MAX_FAILED_LOGINS = 5
    ACCOUNT_LOCK_DURATION_MINS = 15  # Minutes an account stays locked after too many attempts
