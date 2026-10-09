from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, timezone
import bcrypt

db = SQLAlchemy()

# ----------------- ROLE & USER TABLES -----------------
class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # Admin, Manager, Warehouse, Sales
    description = db.Column(db.String(255))
    
    users = db.relationship('User', backref='role', lazy=True)

    def __repr__(self):
        return f"<Role {self.name}>"

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # 2FA / Security Config
    two_factor_enabled = db.Column(db.Boolean, default=False)
    otp_secret = db.Column(db.String(100), nullable=True)  # Secret key for OTP generation
    failed_logins = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    login_history = db.relationship('LoginHistory', backref='user', lazy=True, cascade="all, delete-orphan")
    devices = db.relationship('AuthorizedDevice', backref='user', lazy=True, cascade="all, delete-orphan")
    audit_logs = db.relationship('AuditLog', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")
    
    # Track actions done by user in business flows
    created_pos = db.relationship('PurchaseOrder', foreign_keys='PurchaseOrder.created_by_id', backref='created_by', lazy=True)
    approved_pos = db.relationship('PurchaseOrder', foreign_keys='PurchaseOrder.approved_by_id', backref='approved_by', lazy=True)
    sales = db.relationship('SalesOrder', backref='created_by', lazy=True)
    stock_movements = db.relationship('StockMovement', backref='employee', lazy=True)

    def set_password(self, password):
        # Generate salt and hash the password with bcrypt
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def is_locked(self):
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def record_failed_login(self):
        self.failed_logins += 1
        if self.failed_logins >= 5:
            # Lock for 15 minutes
            from config import Config
            from datetime import timedelta
            self.locked_until = datetime.utcnow() + timedelta(minutes=Config.ACCOUNT_LOCK_DURATION_MINS)
        database_commit()

    def reset_failed_logins(self):
        self.failed_logins = 0
        self.locked_until = None
        database_commit()

    def __repr__(self):
        return f"<User {self.username}>"


# ----------------- STORES & SUPPLIERS -----------------
class Branch(db.Model):
    __tablename__ = 'branches'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    location = db.Column(db.String(255))
    
    warehouses = db.relationship('Warehouse', backref='branch', lazy=True)

class Warehouse(db.Model):
    __tablename__ = 'warehouses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    location = db.Column(db.String(255))
    capacity = db.Column(db.Integer, default=5000)  # Max items it can store
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)

    inventories = db.relationship('Inventory', backref='warehouse', lazy=True, cascade="all, delete-orphan")
    movements_from = db.relationship('StockMovement', foreign_keys='StockMovement.from_warehouse_id', backref='from_warehouse', lazy=True)
    movements_to = db.relationship('StockMovement', foreign_keys='StockMovement.to_warehouse_id', backref='to_warehouse', lazy=True)

    def get_filled_percentage(self):
        total_stock = sum([inv.current_stock for inv in self.inventories])
        if self.capacity <= 0:
            return 0
        return round((total_stock / self.capacity) * 100, 2)

    def __repr__(self):
        return f"<Warehouse {self.name}>"

class Supplier(db.Model):
    __tablename__ = 'suppliers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150))
    phone = db.Column(db.String(50))
    address = db.Column(db.String(255))
    rating = db.Column(db.Float, default=5.0)  # out of 5
    performance_score = db.Column(db.Float, default=100.0)  # e.g., On-Time Delivery score 0-100%
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship('Product', backref='supplier', lazy=True)
    purchase_orders = db.relationship('PurchaseOrder', backref='supplier', lazy=True)

    def __repr__(self):
        return f"<Supplier {self.name}>"


# ----------------- PRODUCT & INVENTORY TABLES -----------------
class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255))

    products = db.relationship('Product', backref='category', lazy=True)

    def __repr__(self):
        return f"<Category {self.name}>"

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.String(100), primary_key=True)  # SKU / Item ID
    name = db.Column(db.String(150), nullable=False, index=True)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    brand = db.Column(db.String(100))
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    purchase_price = db.Column(db.Float, nullable=False)
    selling_price = db.Column(db.Float, nullable=False)
    tax_rate = db.Column(db.Float, default=0.18)  # Default 18% GST
    serial_number = db.Column(db.String(100), nullable=True)
    batch_number = db.Column(db.String(100))
    expiry_date = db.Column(db.Date, nullable=True)
    warranty_months = db.Column(db.Integer, default=0)
    stock_status = db.Column(db.String(50), default='In Stock')  # In Stock, Low Stock, Out of Stock
    barcode = db.Column(db.String(255))  # Filename to dynamically generated barcode image
    qrcode = db.Column(db.String(255))   # QR data or filename
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    inventories = db.relationship('Inventory', backref='product', lazy=True, cascade="all, delete-orphan")
    movements = db.relationship('StockMovement', backref='product', lazy=True, cascade="all, delete-orphan")
    purchase_items = db.relationship('PurchaseItem', backref='product', lazy=True)
    sales_items = db.relationship('SalesItem', backref='product', lazy=True)
    predictions = db.relationship('Prediction', backref='product', lazy=True, cascade="all, delete-orphan")

    def get_total_stock(self):
        return sum([inv.current_stock for inv in self.inventories])

    def update_stock_status(self):
        total = self.get_total_stock()
        # Fallback thresholds if inventories are not specific
        min_threshold = 5
        if self.inventories:
            min_threshold = sum([inv.min_stock for inv in self.inventories])
            
        if total == 0:
            self.stock_status = 'Out of Stock'
        elif total <= min_threshold:
            self.stock_status = 'Low Stock'
        else:
            self.stock_status = 'In Stock'
        database_commit()

    def __repr__(self):
        return f"<Product {self.name} ({self.id})>"

class Inventory(db.Model):
    __tablename__ = 'inventories'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(100), db.ForeignKey('products.id'), nullable=False)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=False)
    shelf_location = db.Column(db.String(100))
    current_stock = db.Column(db.Integer, default=0)
    min_stock = db.Column(db.Integer, default=5)
    max_stock = db.Column(db.Integer, default=200)
    safety_stock = db.Column(db.Integer, default=10)
    reserved_stock = db.Column(db.Integer, default=0)
    damaged_stock = db.Column(db.Integer, default=0)
    expired_stock = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_available(self):
        return max(0, self.current_stock - self.reserved_stock - self.damaged_stock - self.expired_stock)

class StockMovement(db.Model):
    __tablename__ = 'stock_movements'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(100), db.ForeignKey('products.id'), nullable=False)
    from_warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=True)
    to_warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=True)
    quantity = db.Column(db.Integer, nullable=False)
    movement_type = db.Column(db.String(50), nullable=False)  # Purchase, Sale, Transfer, Adjustment, Damage, Return
    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


# ----------------- PURCHASING & TRANSACTION TABLES -----------------
class PurchaseOrder(db.Model):
    __tablename__ = 'purchase_orders'
    id = db.Column(db.Integer, primary_key=True)
    po_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False)
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='Draft')  # Draft, Pending Approval, Approved, Ordered, Received, Cancelled
    total_amount = db.Column(db.Float, default=0.0)
    invoice_file = db.Column(db.String(255), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    items = db.relationship('PurchaseItem', backref='purchase_order', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PurchaseOrder {self.po_number}>"

class PurchaseItem(db.Model):
    __tablename__ = 'purchase_items'
    id = db.Column(db.Integer, primary_key=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id'), nullable=False)
    product_id = db.Column(db.String(100), db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)


# ----------------- SALES & CRM TABLES -----------------
class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150))
    phone = db.Column(db.String(50))
    loyalty_status = db.Column(db.String(50), default='Bronze')  # Bronze, Silver, Gold, Platinum
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sales_orders = db.relationship('SalesOrder', backref='customer', lazy=True)

    def __repr__(self):
        return f"<Customer {self.name}>"

class SalesOrder(db.Model):
    __tablename__ = 'sales_orders'
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Float, nullable=False)     # Gross total before taxes & discount
    discount = db.Column(db.Float, default=0.0)            # Discount amount
    tax_amount = db.Column(db.Float, default=0.0)          # GST amount
    net_amount = db.Column(db.Float, nullable=False)        # Total customer paid
    payment_status = db.Column(db.String(50), default='Paid')  # Paid, Unpaid, Refunded
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    items = db.relationship('SalesItem', backref='sales_order', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SalesOrder {self.invoice_number}>"

class SalesItem(db.Model):
    __tablename__ = 'sales_items'
    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_orders.id'), nullable=False)
    product_id = db.Column(db.String(100), db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    tax_rate = db.Column(db.Float, default=0.18)


class OrderReturn(db.Model):
    __tablename__ = 'order_returns'
    id = db.Column(db.Integer, primary_key=True)
    return_number = db.Column(db.String(100), unique=True, nullable=False)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_orders.id'), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    refund_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='Pending')  # Pending, Approved, Processed, Rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    sales_order = db.relationship('SalesOrder', backref='returns', lazy=True)
    items = db.relationship('ReturnItem', backref='order_return', lazy=True, cascade="all, delete-orphan")


class ReturnItem(db.Model):
    __tablename__ = 'return_items'
    id = db.Column(db.Integer, primary_key=True)
    return_id = db.Column(db.Integer, db.ForeignKey('order_returns.id'), nullable=False)
    product_id = db.Column(db.String(100), db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    condition = db.Column(db.String(50), default='Good')  # Good, Damaged, Expired

    product = db.relationship('Product', backref='return_items', lazy=True)


# ----------------- SECURITY & AUDIT TABLES -----------------
class LoginHistory(db.Model):
    __tablename__ = 'login_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ip_address = db.Column(db.String(50), nullable=False)
    device_name = db.Column(db.String(100))
    os_name = db.Column(db.String(100))
    browser_name = db.Column(db.String(100))
    location_name = db.Column(db.String(100), default='Unknown')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    login_status = db.Column(db.String(50), nullable=False)  # Success, Failed, Flagged, MFA_Required
    alert_sent = db.Column(db.Boolean, default=False)

class AuthorizedDevice(db.Model):
    __tablename__ = 'authorized_devices'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    device_fingerprint = db.Column(db.String(255), index=True)  # Unique per user (see __table_args__)
    ip_address = db.Column(db.String(50))
    browser_name = db.Column(db.String(100))
    os_name = db.Column(db.String(100))
    approved = db.Column(db.Boolean, default=False)
    token = db.Column(db.String(255))  # Persistent cookie token

    __table_args__ = (
        db.UniqueConstraint('user_id', 'device_fingerprint', name='uq_user_device_fingerprint'),
    )

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Actions might be automated
    action_type = db.Column(db.String(50), nullable=False)  # Insert, Update, Delete, Export, Login, Logout, Predict, Report
    table_name = db.Column(db.String(50), nullable=True)
    record_id = db.Column(db.String(100), nullable=True)
    details = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50), nullable=True)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # If null, message for all admin/managers
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='System')  # Low Stock, Suspicious Login, Reorder, System
    read_status = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ----------------- CLOUD STORAGE TABLES -----------------
class CloudAsset(db.Model):
    __tablename__ = 'cloud_assets'
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)  # in bytes
    mime_type = db.Column(db.String(100))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    storage_provider = db.Column(db.String(50), default='AWS S3')  # AWS S3, GCP, Azure
    public_url = db.Column(db.String(550))

    def __repr__(self):
        return f"<CloudAsset {self.filename}>"



# ----------------- MACHINE LEARNING TABLES -----------------
class Prediction(db.Model):
    __tablename__ = 'predictions'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(100), db.ForeignKey('products.id'), nullable=False)
    prediction_date = db.Column(db.DateTime, default=datetime.utcnow)
    predicted_sales = db.Column(db.Float, nullable=False)
    predicted_stock_need = db.Column(db.Float, nullable=False)
    recommendation = db.Column(db.String(255))
    model_used = db.Column(db.String(50))  # ARIMA, Random Forest, Decision Tree, Linear Regression, XGBoost
    accuracy_score = db.Column(db.Float)   # Accuracy on validation (e.g. R-squared or custom match)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# Helper helper functions
def database_commit():
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise e
