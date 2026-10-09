import os
from flask import Flask, render_template
from flask_login import LoginManager
from flask_mail import Mail
from datetime import datetime, date, timedelta
import random

from config import Config
from models import db, User, Role, Branch, Warehouse, Supplier, Category, Product, Inventory, StockMovement, SalesOrder, SalesItem, Customer

mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Make folders if they don't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'cloud'), exist_ok=True)
    os.makedirs(app.config['CODES_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['BASE_DIR'], 'static', 'models'), exist_ok=True)

    # Initialize Database
    db.init_app(app)

    # Initialize Mail
    mail.init_app(app)

    # Initialize Login Manager
    login_manager = LoginManager()
    login_manager.login_view = 'routes.api_login'  # API auth route
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register Routing Blueprints
    from routes import routes_bp
    app.register_blueprint(routes_bp)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def index(path):
        return render_template('index.html')

    # Create Tables & Inject Seed Data
    with app.app_context():
        db.create_all()
        seed_database()

    return app

def seed_database():
    """
    Checks if database is empty and seeds initial data (Roles, Users, Products,
    Suppliers, Categories, Warehouses, Inventory, Sales, CRM) so the system is ready to use.
    """
    # 1. Check if roles exist, if not create them
    if Role.query.count() == 0:
        roles = [
            Role(name='Admin', description='System Administrator with full access to security controls & financial data.'),
            Role(name='Manager', description='Inventory Manager with operational authorization on stock & purchasing.'),
            Role(name='Warehouse', description='Warehouse staff with stock adjustment and movement rights.'),
            Role(name='Sales', description='Sales staff with POS billing, invoicing, and customer management rights.'),
            Role(name='Customer', description='Customer portal access for viewing products and placing orders.')
        ]
        db.session.add_all(roles)
        db.session.commit()
    else:
        # Ensure Customer role exists even if DB was already seeded without it
        if not Role.query.filter_by(name='Customer').first():
            cust_role = Role(name='Customer', description='Customer portal access for viewing products and placing orders.')
            db.session.add(cust_role)
            db.session.commit()

    # 2. Seed Default Users
    if User.query.count() == 0:
        admin_role = Role.query.filter_by(name='Admin').first()
        mgr_role = Role.query.filter_by(name='Manager').first()
        wh_role = Role.query.filter_by(name='Warehouse').first()
        sales_role = Role.query.filter_by(name='Sales').first()
        cust_role = Role.query.filter_by(name='Customer').first()

        admin = User(username='admin', email='admin@stocksense.com', role_id=admin_role.id)
        admin.set_password('admin123')

        manager = User(username='manager', email='manager@stocksense.com', role_id=mgr_role.id)
        manager.set_password('manager123')

        warehouse = User(username='warehouse', email='warehouse@stocksense.com', role_id=wh_role.id)
        warehouse.set_password('warehouse123')

        sales = User(username='sales', email='sales@stocksense.com', role_id=sales_role.id)
        sales.set_password('sales123')

        customer = User(username='customer', email='customer@stocksense.com', role_id=cust_role.id)
        customer.set_password('customer123')

        db.session.add_all([admin, manager, warehouse, sales, customer])
        db.session.commit()
    else:
        # Ensure customer demo user exists even if DB was seeded before Customer role was added
        cust_role = Role.query.filter_by(name='Customer').first()
        if cust_role and not User.query.filter_by(username='customer').first():
            customer = User(username='customer', email='customer@stocksense.com', role_id=cust_role.id)
            customer.set_password('customer123')
            db.session.add(customer)
            db.session.commit()

    # 3. Seed Branches & Warehouses
    if Branch.query.count() == 0:
        b1 = Branch(name='Central HQ Branch', location='Dallas, Industrial District')
        b2 = Branch(name='East Sector Branch', location='New York, Logistics park')
        db.session.add_all([b1, b2])
        db.session.commit()

        w1 = Warehouse(name='HQ Central Warehouse', location='Aisle A-D', capacity=5000, branch_id=b1.id)
        w2 = Warehouse(name='East Distribution Depot', location='Building 2', capacity=2000, branch_id=b2.id)
        db.session.add_all([w1, w2])
        db.session.commit()

    # 4. Seed Suppliers
    if Supplier.query.count() == 0:
        sups = [
            Supplier(name='TechCorp Wholesale', email='orders@techcorp.com', phone='555-0199', address='San Jose, CA', rating=4.8, performance_score=98.0),
            Supplier(name='OfficeSupplies Inc', email='sales@officesupplies.com', phone='555-0144', address='Chicago, IL', rating=4.3, performance_score=89.5),
            Supplier(name='ModernFurniture Dist', email='info@modernfurn.com', phone='555-0122', address='Grand Rapids, MI', rating=4.5, performance_score=92.0)
        ]
        db.session.add_all(sups)
        db.session.commit()

    # 5. Seed Categories
    if Category.query.count() == 0:
        cats = [
            Category(name='Electronics', description='Computing, sensors, laptops, chips, and accessories.'),
            Category(name='Furniture', description='Office chairs, standing desks, workspaces, and lights.'),
            Category(name='Stationery', description='Notebooks, pens, paper supplies, labels, and files.')
        ]
        db.session.add_all(cats)
        db.session.commit()

    # 6. Seed Products
    if Product.query.count() == 0:
        elec_cat = Category.query.filter_by(name='Electronics').first()
        furn_cat = Category.query.filter_by(name='Furniture').first()
        stat_cat = Category.query.filter_by(name='Stationery').first()

        tech_sup = Supplier.query.filter_by(name='TechCorp Wholesale').first()
        furn_sup = Supplier.query.filter_by(name='ModernFurniture Dist').first()
        stat_sup = Supplier.query.filter_by(name='OfficeSupplies Inc').first()

        today_date = date.today()
        p1 = Product(id='ITM-001', name='MacBook Air M2', description='Apple M2, 8GB RAM, 256GB SSD', category_id=elec_cat.id, brand='Apple', supplier_id=tech_sup.id, purchase_price=800.00, selling_price=1099.00, tax_rate=0.18, serial_number='SN-MAC-8821', batch_number='B-M2-2026', expiry_date=today_date + timedelta(days=365), warranty_months=12)
        p2 = Product(id='ITM-002', name='Ergonomic Office Chair', description='Chamber lumbar support, mesh backing', category_id=furn_cat.id, brand='Steelcase', supplier_id=furn_sup.id, purchase_price=120.00, selling_price=199.00, tax_rate=0.12, serial_number='SN-CHR-4011', batch_number='B-CH-44', expiry_date=today_date + timedelta(days=730), warranty_months=24)
        p3 = Product(id='ITM-003', name='Wireless Mouse', description='2.4GHz rechargeable wireless optical mouse', category_id=elec_cat.id, brand='Logitech', supplier_id=tech_sup.id, purchase_price=15.00, selling_price=35.00, tax_rate=0.18, serial_number='SN-MS-0099', batch_number='B-MS-99', expiry_date=today_date + timedelta(days=180), warranty_months=6)
        p4 = Product(id='ITM-004', name='Standing Desk', description='Dual motor electric adjustable steel frame', category_id=furn_cat.id, brand='Fully', supplier_id=furn_sup.id, purchase_price=220.00, selling_price=399.00, tax_rate=0.12, serial_number='SN-DK-7721', batch_number='B-DK-01', expiry_date=today_date + timedelta(days=1095), warranty_months=36)
        p5 = Product(id='ITM-005', name='Notebook A5', description='Lined hardcover notebook 200 pages', category_id=stat_cat.id, brand='Moleskine', supplier_id=stat_sup.id, purchase_price=3.50, selling_price=9.50, tax_rate=0.05, serial_number='SN-NT-1011', batch_number='B-NT-101', expiry_date=today_date + timedelta(days=15), warranty_months=0) # Expiring soon
        p6 = Product(id='ITM-006', name='Gel Pens Set of 10', description='Black gel pens 0.5mm tip smooth click', category_id=stat_cat.id, brand='Pilot', supplier_id=stat_sup.id, purchase_price=4.00, selling_price=12.00, tax_rate=0.05, serial_number='SN-PN-9920', batch_number='B-PN-20', expiry_date=today_date + timedelta(days=360), warranty_months=0)

        db.session.add_all([p1, p2, p3, p4, p5, p6])
        db.session.commit()

        # Set codes
        for p in [p1, p2, p3, p4, p5, p6]:
            p.barcode = f"barcode-{p.id}.png"
            p.qrcode = p.id
        db.session.commit()

        # 7. Seed Inventories
        w_central = Warehouse.query.filter_by(name='HQ Central Warehouse').first()
        w_east = Warehouse.query.filter_by(name='East Distribution Depot').first()

        # MacBook
        db.session.add_all([
            Inventory(product_id=p1.id, warehouse_id=w_central.id, shelf_location='Aisle A-Row 1', current_stock=35, min_stock=5, safety_stock=15, max_stock=100),
            Inventory(product_id=p1.id, warehouse_id=w_east.id, shelf_location='Sec B-Shelf 2', current_stock=12, min_stock=3, safety_stock=8, max_stock=50)
        ])
        # Chair
        db.session.add_all([
            Inventory(product_id=p2.id, warehouse_id=w_central.id, shelf_location='Zone F-Pallet 4', current_stock=3, min_stock=10, safety_stock=20, max_stock=150),
            Inventory(product_id=p2.id, warehouse_id=w_east.id, shelf_location='Zone E-Row 2', current_stock=1, min_stock=5, safety_stock=10, max_stock=60)
        ])
        # Mouse
        db.session.add_all([
            Inventory(product_id=p3.id, warehouse_id=w_central.id, shelf_location='Aisle B-Bin 12', current_stock=150, min_stock=20, safety_stock=40, max_stock=500),
            Inventory(product_id=p3.id, warehouse_id=w_east.id, shelf_location='Aisle A-Bin 4', current_stock=45, min_stock=10, safety_stock=20, max_stock=200)
        ])
        # Desk
        db.session.add_all([
            Inventory(product_id=p4.id, warehouse_id=w_central.id, shelf_location='Zone D-Pallet 2', current_stock=2, min_stock=4, safety_stock=8, max_stock=50)
        ])
        # Notebooks
        db.session.add_all([
            Inventory(product_id=p5.id, warehouse_id=w_central.id, shelf_location='Bin S-Row 1', current_stock=340, min_stock=30, safety_stock=60, max_stock=1000)
        ])
        # Pens
        db.session.add_all([
            Inventory(product_id=p6.id, warehouse_id=w_central.id, shelf_location='Bin S-Row 1', current_stock=4, min_stock=15, safety_stock=30, max_stock=400)
        ])

        db.session.commit()
        for p in [p1, p2, p3, p4, p5, p6]:
            p.update_stock_status()

    # 8. Seed Customers & Sales Data (Crucial for ML prediction model training)
    if Customer.query.count() == 0:
        custs = [
            Customer(name='John Doe International', email='john@international.com', phone='555-0811', loyalty_status='Gold'),
            Customer(name='Sarah Jenkins Ltd', email='sarah@jenkins.co.uk', phone='555-0822', loyalty_status='Silver'),
            Customer(name='Central School Depot', email='purchases@schooldept.org', phone='555-0899', loyalty_status='Bronze')
        ]
        db.session.add_all(custs)
        db.session.commit()
        
    if SalesOrder.query.count() == 0:
        c1 = Customer.query.first()
        sales_staff = User.query.filter_by(username='sales').first()
        prods = Product.query.all()
        
        # Build 30 days of sales history to train forecasting models
        start_date = datetime.now() - timedelta(days=30)
        
        for d_offset in range(30):
            order_date = start_date + timedelta(days=d_offset)
            
            # Record 1 to 3 orders per day
            for order_idx in range(random.randint(1, 3)):
                invoice_number = f"INV-{order_date.strftime('%Y%m%d')}-{random.randint(100, 999)}"
                
                # Pick randomized products to purchase
                items_ordered = []
                num_items = random.randint(1, 3)
                chosen_prods = random.sample(prods, num_items)
                
                gross_sum = 0.0
                tax_sum = 0.0
                
                for pr in chosen_prods:
                    qty = random.randint(1, 5) if pr.id != 'ITM-001' else 1  # Laptops are lower qty
                    unit_p = pr.selling_price
                    item_tax = (unit_p * qty) * pr.tax_rate
                    
                    gross_sum += (unit_p * qty)
                    tax_sum += item_tax
                    
                    items_ordered.append((pr.id, qty, unit_p, pr.tax_rate))
                
                net_sum = gross_sum + tax_sum
                
                new_so = SalesOrder(
                    invoice_number=invoice_number,
                    customer_id=c1.id,
                    order_date=order_date,
                    total_amount=gross_sum,
                    tax_amount=tax_sum,
                    net_amount=net_sum,
                    payment_status='Paid',
                    created_by_id=sales_staff.id
                )
                db.session.add(new_so)
                db.session.flush()
                
                for item_tuple in items_ordered:
                    s_item = SalesItem(
                        sales_order_id=new_so.id,
                        product_id=item_tuple[0],
                        quantity=item_tuple[1],
                        unit_price=item_tuple[2],
                        tax_rate=item_tuple[3]
                    )
                    db.session.add(s_item)
                    
                    # Create stock movement records in history
                    move = StockMovement(
                        product_id=item_tuple[0],
                        quantity=item_tuple[1],
                        movement_type="Sale",
                        employee_id=sales_staff.id,
                        timestamp=order_date
                    )
                    db.session.add(move)
                    
        db.session.commit()

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5001)
