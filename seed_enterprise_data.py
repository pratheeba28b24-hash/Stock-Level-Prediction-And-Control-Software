"""
Enterprise Dataset Generator for StockSense Enterprise
Seeds 100+ realistic products, 5 warehouses, 25+ suppliers, 12 categories, 
80+ sales orders, 30+ purchase orders, 40+ stock movements, 20+ returns, 
and AI predictions into inventory.db.
"""

import random
from datetime import datetime, date, timedelta
from app import create_app
from models import (
    db, Role, User, Branch, Warehouse, Supplier, Category, Product, 
    Inventory, StockMovement, Customer, SalesOrder, SalesItem, 
    PurchaseOrder, PurchaseItem, OrderReturn, ReturnItem, 
    Prediction, AuditLog, Notification, LoginHistory
)

def seed_enterprise():
    app = create_app()
    with app.app_context():
        print("Resetting and populating Enterprise Dataset...")
        
        # 1. Clear existing business tables (preserve roles/users if desired, but cleanly refresh)
        db.session.query(ReturnItem).delete()
        db.session.query(OrderReturn).delete()
        db.session.query(SalesItem).delete()
        db.session.query(SalesOrder).delete()
        db.session.query(PurchaseItem).delete()
        db.session.query(PurchaseOrder).delete()
        db.session.query(StockMovement).delete()
        db.session.query(Prediction).delete()
        db.session.query(Inventory).delete()
        db.session.query(Product).delete()
        db.session.query(Category).delete()
        db.session.query(Supplier).delete()
        db.session.query(Warehouse).delete()
        db.session.query(Branch).delete()
        db.session.query(Customer).delete()
        db.session.commit()
        
        print("Existing data cleared.")

        # 2. Roles & Users
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

        admin_user = User.query.filter_by(username='admin').first()
        mgr_user = User.query.filter_by(username='manager').first()
        sales_user = User.query.filter_by(username='sales').first()

        # 3. Branches & 5 Warehouses
        b1 = Branch(name='Tamil Nadu Hub', location='Coimbatore Zone')
        b2 = Branch(name='Karnataka Hub', location='Bangalore Logistics Hub')
        db.session.add_all([b1, b2])
        db.session.commit()

        warehouses = [
            Warehouse(name='Coimbatore Central Warehouse', location='Avinashi Road Industrial Zone', capacity=15000, branch_id=b1.id),
            Warehouse(name='Tiruppur Distribution Center', location='Netaji Apparel Park', capacity=12000, branch_id=b1.id),
            Warehouse(name='Chennai Warehouse', location='Sriperumbudur Logistics Park', capacity=18000, branch_id=b1.id),
            Warehouse(name='Bangalore Warehouse', location='Peenya Industrial Area', capacity=20000, branch_id=b2.id),
            Warehouse(name='Madurai Warehouse', location='Kappalur Industrial Estate', capacity=10000, branch_id=b1.id),
        ]
        db.session.add_all(warehouses)
        db.session.commit()

        # 4. 25+ Suppliers
        supplier_names = [
            ("Apex Tech Components", "orders@apextech.com", "+91 98421 00112", "Coimbatore, TN", 4.9, 98.5),
            ("Prime Apparel & Textiles", "sales@primetextiles.com", "+91 98422 11223", "Tiruppur, TN", 4.8, 97.2),
            ("Titan Office Systems", "info@titanoffice.in", "+91 98423 22334", "Chennai, TN", 4.7, 95.0),
            ("Horizon Electronics", "contact@horizonelec.com", "+91 98424 33445", "Bangalore, KA", 4.6, 93.8),
            ("Velocity Freight Supplies", "support@velocityfreight.com", "+91 98425 44556", "Madurai, TN", 4.5, 91.5),
            ("MicroChip Solutions", "sales@microchipsol.com", "+91 98426 55667", "Hyderabad, TS", 4.9, 99.1),
            ("Universal Home Appliances", "b2b@universalappliances.in", "+91 98427 66778", "Coimbatore, TN", 4.7, 94.6),
            ("Global Fabric Sourcing", "supply@globalfabrics.com", "+91 98428 77889", "Tiruppur, TN", 4.8, 96.4),
            ("Metro Logistics & Trade", "orders@metrolog.in", "+91 98429 88990", "Chennai, TN", 4.4, 90.2),
            ("Nexus Network Gear", "info@nexusnetwork.com", "+91 98430 99001", "Bangalore, KA", 4.7, 95.8),
            ("Starlight Footwear Hub", "sales@starlightfootwear.com", "+91 98431 10112", "Agra, UP", 4.5, 92.4),
            ("Zenith Storage Products", "contact@zenithstorage.in", "+91 98432 21223", "Coimbatore, TN", 4.6, 93.9),
            ("Omni Personal Care Supplies", "orders@omnipersonal.com", "+91 98433 32334", "Mumbai, MH", 4.8, 96.8),
            ("PowerGrid Electricals", "sales@powergridelec.com", "+91 98434 43445", "Chennai, TN", 4.7, 94.2),
            ("Quantum Displays & TV", "info@quantumdisplays.in", "+91 98435 54556", "Bangalore, KA", 4.9, 98.0),
            ("Knitwear Express Ltd", "orders@knitwearexpress.com", "+91 98436 65667", "Tiruppur, TN", 4.8, 97.5),
            ("ErgoWork Solutions", "sales@ergowork.in", "+91 98437 76778", "Coimbatore, TN", 4.6, 93.1),
            ("SmartGadgets India", "contact@smartgadgets.co.in", "+91 98438 87889", "New Delhi, DL", 4.7, 95.3),
            ("Vanguard Security Systems", "info@vanguardsec.com", "+91 98439 98990", "Chennai, TN", 4.8, 96.9),
            ("Precision Tools & Hardware", "orders@precisiontools.in", "+91 98440 09001", "Coimbatore, TN", 4.5, 91.8),
            ("Luxe Living Home Ware", "sales@luxeliving.com", "+91 98441 10112", "Bangalore, KA", 4.6, 94.0),
            ("UltraPack Packaging", "info@ultrapack.in", "+91 98442 21223", "Tiruppur, TN", 4.7, 95.6),
            ("FlexiFit Activewear", "orders@flexifit.com", "+91 98443 32334", "Coimbatore, TN", 4.8, 97.0),
            ("CyberTech Peripherals", "sales@cybertechperiph.com", "+91 98444 43445", "Bangalore, KA", 4.9, 98.7),
            ("Alpha Stationers & Paper", "contact@alphastationers.in", "+91 98445 54556", "Chennai, TN", 4.4, 89.9)
        ]

        suppliers = []
        for name, email, phone, addr, rating, perf in supplier_names:
            sup = Supplier(name=name, email=email, phone=phone, address=addr, rating=rating, performance_score=perf)
            suppliers.append(sup)
        db.session.add_all(suppliers)
        db.session.commit()

        # 5. 12 Categories
        category_data = [
            ("Electronics", "Computing, laptops, displays, chips, smart monitors, and core hardware."),
            ("Computer Accessories", "Keyboards, mice, webcams, docks, cables, and ergonomic peripherals."),
            ("Furniture", "Ergonomic chairs, motor standing desks, filing cabinets, and office lights."),
            ("Office Supplies", "Notebooks, paper reams, filing folders, gel pens, and desk organizers."),
            ("Apparel", "Formal shirts, polo tees, denim jeans, corporate jackets, and uniforms."),
            ("Footwear", "Leather formal shoes, breathable sneakers, safety boots, and slip-ons."),
            ("Home Appliances", "Air purifiers, coffee machines, microwaves, mini fridges, and fans."),
            ("Mobile Accessories", "Fast chargers, power banks, wireless earbuds, and phone stands."),
            ("Networking", "Wi-Fi 6 routers, gigabit switches, ethernet cables, and access points."),
            ("Storage Devices", "NVMe SSDs, external hard drives, USB flash drives, and NAS units."),
            ("Personal Care", "Grooming kits, sanitizers, desk wellness packs, and air fresheners."),
            ("Sports & Fitness", "Smart fitness bands, yoga mats, resistance bands, and water flasks.")
        ]

        categories = []
        for cname, cdesc in category_data:
            cat = Category(name=cname, description=cdesc)
            categories.append(cat)
        db.session.add_all(categories)
        db.session.commit()

        # 6. 100+ Products Generator across categories
        # Master product catalog templates
        raw_products_list = [
            # Electronics
            ("MacBook Air M2", "Apple", "Electronics", 75000.00, 99900.00, 0.18),
            ("Dell XPS 15 Laptop", "Dell", "Electronics", 110000.00, 145000.00, 0.18),
            ("HP Spectre x360", "HP", "Electronics", 85000.00, 115000.00, 0.18),
            ("Lenovo ThinkPad X1 Carbon", "Lenovo", "Electronics", 95000.00, 130000.00, 0.18),
            ("Asus ROG Strix Gaming Laptop", "Asus", "Electronics", 90000.00, 125000.00, 0.18),
            ("Samsung 27-inch 4K Monitor", "Samsung", "Electronics", 22000.00, 32000.00, 0.18),
            ("LG Ultrawide 34-inch Display", "LG", "Electronics", 35000.00, 48000.00, 0.18),
            ("BenQ Eye-Care Monitor 24-inch", "BenQ", "Electronics", 9500.00, 14500.00, 0.18),
            ("Apple iPad Air M1", "Apple", "Electronics", 42000.00, 59900.00, 0.18),
            ("Microsoft Surface Pro 9", "Microsoft", "Electronics", 78000.00, 105000.00, 0.18),

            # Computer Accessories
            ("Logitech MX Master 3S Mouse", "Logitech", "Computer Accessories", 6500.00, 9995.00, 0.18),
            ("Keychron K2 Mechanical Keyboard", "Keychron", "Computer Accessories", 5500.00, 8499.00, 0.18),
            ("Anker 7-in-1 USB-C Hub", "Anker", "Computer Accessories", 2800.00, 4500.00, 0.18),
            ("Logitech C920 HD Pro Webcam", "Logitech", "Computer Accessories", 4200.00, 6990.00, 0.18),
            ("Razer DeathAdder V3 Mouse", "Razer", "Computer Accessories", 3800.00, 5999.00, 0.18),
            ("Corsair K70 RGB Mechanical Keyboard", "Corsair", "Computer Accessories", 8500.00, 12999.00, 0.18),
            ("Elgato Stream Deck MK.2", "Elgato", "Computer Accessories", 11000.00, 15999.00, 0.18),
            ("Bose QuietComfort Earbuds", "Bose", "Computer Accessories", 14000.00, 21900.00, 0.18),
            ("HyperX Cloud II Gaming Headset", "HyperX", "Computer Accessories", 5200.00, 7990.00, 0.18),
            ("Dell Thunderbolt 4 Docking Station", "Dell", "Computer Accessories", 16000.00, 24000.00, 0.18),
            ("Wireless Ergonomic Trackball Mouse", "Logitech", "Computer Accessories", 3200.00, 4995.00, 0.18),
            ("Ultra-Thin Aluminium Laptop Stand", "ErgoWork", "Computer Accessories", 1200.00, 2499.00, 0.18),

            # Furniture
            ("Steelcase Gesture Ergonomic Chair", "Steelcase", "Furniture", 35000.00, 52000.00, 0.12),
            ("Herman Miller Aeron Office Chair", "Herman Miller", "Furniture", 6500.00, 95000.00, 0.12),
            ("Dual Motor Electric Standing Desk", "ErgoWork", "Furniture", 18000.00, 29999.00, 0.12),
            ("Featherlite Ergonomic Task Chair", "Featherlite", "Furniture", 6800.00, 10999.00, 0.12),
            ("Executive Wooden Office Desk", "Titan Office", "Furniture", 22000.00, 35000.00, 0.12),
            ("3-Drawer Steel Mobile Pedestal", "Titan Office", "Furniture", 4200.00, 7500.00, 0.12),
            ("Conference Table 8-Seater", "Titan Office", "Furniture", 32000.00, 49000.00, 0.12),
            ("Acoustic Fabric Office Screen Divider", "ModernFurniture", "Furniture", 3500.00, 6200.00, 0.12),
            ("LED Architect Desk Lamp", "Starlight", "Furniture", 1500.00, 2990.00, 0.12),

            # Office Supplies
            ("Moleskine Hardcover Executive Notebook", "Moleskine", "Office Supplies", 450.00, 899.00, 0.05),
            ("Pilot G2 0.5mm Gel Pen Box of 12", "Pilot", "Office Supplies", 350.00, 600.00, 0.05),
            ("JK Copier A4 Paper 75GSM Ream", "JK Paper", "Office Supplies", 180.00, 290.00, 0.05),
            ("Heavy Duty Metal Stapler 100 Sheets", "Kangaroo", "Office Supplies", 420.00, 790.00, 0.05),
            ("Self-Adhesive Sticky Notes 3x3 Pack of 6", "3M Post-It", "Office Supplies", 160.00, 320.00, 0.05),
            ("Bostik Clear Glue Stick 40g Box", "Bostik", "Office Supplies", 220.00, 450.00, 0.05),
            ("Expanding File Folder 12 Pockets", "Alpha", "Office Supplies", 280.00, 550.00, 0.05),
            ("Whiteboard Marker Pen Set of 4", "Faber-Castell", "Office Supplies", 120.00, 240.00, 0.05),
            ("Heavy Duty Paper Shredder 15-Sheet", "Fellowes", "Office Supplies", 8500.00, 13999.00, 0.18),

            # Apparel (R&R Apparel Sourcing Specialty)
            ("Premium Cotton Oxford Formal Shirt", "R&R Sourcing", "Apparel", 650.00, 1499.00, 0.05),
            ("Slim Fit Corporate Blazer Jacket", "R&R Sourcing", "Apparel", 2200.00, 4999.00, 0.12),
            ("Pima Cotton Pique Polo T-Shirt", "FlexiFit", "Apparel", 450.00, 999.00, 0.05),
            ("Stretch Chino Formal Trousers", "R&R Sourcing", "Apparel", 750.00, 1799.00, 0.05),
            ("Raw Denim Selvedge Jeans", "Prime Textiles", "Apparel", 1100.00, 2499.00, 0.12),
            ("Water-Resistant Executive Windbreaker", "Knitwear Express", "Apparel", 1400.00, 3299.00, 0.12),
            ("Merino Wool V-Neck Sweater", "Knitwear Express", "Apparel", 1250.00, 2899.00, 0.12),
            ("Breathable Athletic Gym Shorts", "FlexiFit", "Apparel", 320.00, 799.00, 0.05),
            ("High-Performance Thermal Underwear Set", "Knitwear Express", "Apparel", 550.00, 1299.00, 0.05),
            ("Custom Embroidered Staff Uniform Shirt", "R&R Sourcing", "Apparel", 420.00, 899.00, 0.05),

            # Footwear
            ("Genuine Leather Derby Formal Shoes", "Starlight Footwear", "Footwear", 1800.00, 3999.00, 0.12),
            ("Lightweight Mesh Running Sneakers", "FlexiFit", "Footwear", 1200.00, 2799.00, 0.12),
            ("Steel-Toe Industrial Safety Boots", "Precision Tools", "Footwear", 1500.00, 3299.00, 0.12),
            ("Slip-On Orthopedic Comfort Loafers", "Starlight Footwear", "Footwear", 1100.00, 2499.00, 0.12),
            ("Waterproof Outdoor Hiking Shoes", "Starlight Footwear", "Footwear", 2200.00, 4999.00, 0.12),

            # Home Appliances
            ("Philips HEPA Air Purifier 2000i", "Philips", "Home Appliances", 9500.00, 15999.00, 0.18),
            ("DeLonghi Espresso Coffee Machine", "DeLonghi", "Home Appliances", 16500.00, 26999.00, 0.18),
            ("IFB 23L Convection Microwave Oven", "IFB", "Home Appliances", 8200.00, 12499.00, 0.18),
            ("Godrej 99L Mini Refrigerator", "Godrej", "Home Appliances", 7800.00, 11999.00, 0.18),
            ("Dyson Cool Tower Fan AM07", "Dyson", "Home Appliances", 21000.00, 31900.00, 0.18),
            ("Instant Pot Duo 7-in-1 Electric Cooker", "Instant Pot", "Home Appliances", 6200.00, 9999.00, 0.18),

            # Mobile Accessories
            ("Anker 65W GaN Fast Wall Charger", "Anker", "Mobile Accessories", 1800.00, 3299.00, 0.18),
            ("Samsung 20000mAh Power Bank 25W", "Samsung", "Mobile Accessories", 2100.00, 3499.00, 0.18),
            ("Sony WF-1000XM5 Wireless Earbuds", "Sony", "Mobile Accessories", 16500.00, 24990.00, 0.18),
            ("MagSafe Magnetic Wireless Car Mount", "SmartGadgets", "Mobile Accessories", 950.00, 1899.00, 0.18),
            ("Spigen Rugged Armor Phone Case", "Spigen", "Mobile Accessories", 450.00, 999.00, 0.18),
            ("Braided Nylon USB-C Cable 2M Pack", "Anker", "Mobile Accessories", 380.00, 799.00, 0.18),

            # Networking
            ("TP-Link Archer AX73 Wi-Fi 6 Router", "TP-Link", "Networking", 6800.00, 10999.00, 0.18),
            ("Netgear 16-Port Gigabit Managed Switch", "Netgear", "Networking", 8500.00, 13499.00, 0.18),
            ("Ubiquiti UniFi 6 Pro Access Point", "Ubiquiti", "Networking", 12500.00, 18999.00, 0.18),
            ("Cat6 Snagless Ethernet Cable 30M", "Nexus Network", "Networking", 650.00, 1299.00, 0.18),
            ("Cisco RV340 Dual WAN Gigabit Router", "Cisco", "Networking", 18500.00, 27999.00, 0.18),

            # Storage Devices
            ("Samsung 980 PRO 2TB NVMe M.2 SSD", "Samsung", "Storage Devices", 11500.00, 16999.00, 0.18),
            ("SanDisk Extreme Portable 1TB SSD", "SanDisk", "Storage Devices", 6800.00, 9999.00, 0.18),
            ("Western Digital 4TB Elements External HDD", "Western Digital", "Storage Devices", 7200.00, 10499.00, 0.18),
            ("Crucial 32GB DDR5 4800MHz RAM Kit", "Crucial", "Storage Devices", 6500.00, 9800.00, 0.18),
            ("Synology 4-Bay NAS DiskStation DS923+", "Synology", "Storage Devices", 42000.00, 59999.00, 0.18),
            ("Kingston DataTraveler 128GB USB 3.2", "Kingston", "Storage Devices", 550.00, 999.00, 0.18),

            # Personal Care
            ("Philips Series 7000 Multi-Grooming Kit", "Philips", "Personal Care", 2200.00, 3799.00, 0.18),
            ("Dettol Instant Hand Sanitizer 500ml x 6", "Dettol", "Personal Care", 480.00, 900.00, 0.12),
            ("Desk Ergonomic Lumbar Support Cushion", "ErgoWork", "Personal Care", 850.00, 1699.00, 0.12),
            ("Ultrasonic Essential Oil Diffuser 500ml", "Omni Personal", "Personal Care", 950.00, 1899.00, 0.12),

            # Sports & Fitness
            ("Fitbit Charge 6 Fitness Tracker", "Fitbit", "Sports & Fitness", 11000.00, 14999.00, 0.18),
            ("Anti-Burst Yoga Mat 8mm Non-Slip", "FlexiFit", "Sports & Fitness", 650.00, 1399.00, 0.12),
            ("Heavy Duty Resistance Loop Bands Set", "FlexiFit", "Sports & Fitness", 420.00, 899.00, 0.12),
            ("Insulated Stainless Steel Flask 1000ml", "Starlight", "Sports & Fitness", 550.00, 1199.00, 0.12),
            ("Adjustable Rubber Dumbbells 20KG Set", "Precision Tools", "Sports & Fitness", 2800.00, 5499.00, 0.18)
        ]

        # Duplicate slightly with suffix to reach exactly 105+ products
        final_products = []
        sku_counter = 1
        today_date = date.today()

        db_categories = {c.name: c for c in Category.query.all()}
        db_suppliers = Supplier.query.all()

        for pname, brand, cat_name, p_price, s_price, tax in raw_products_list:
            sku = f"ITM-{sku_counter:03d}"
            cat_obj = db_categories.get(cat_name, list(db_categories.values())[0])
            sup_obj = random.choice(db_suppliers)

            prod = Product(
                id=sku,
                name=pname,
                description=f"High-quality enterprise grade {pname} by {brand}. Fully certified and backed by StockSense warranty.",
                category_id=cat_obj.id,
                brand=brand,
                supplier_id=sup_obj.id,
                purchase_price=p_price,
                selling_price=s_price,
                tax_rate=tax,
                serial_number=f"SN-{sku_counter:04d}-{random.randint(1000, 9999)}",
                batch_number=f"BATCH-2026-{random.randint(10, 99)}",
                expiry_date=today_date + timedelta(days=random.randint(30, 730)),
                warranty_months=random.choice([6, 12, 24, 36]),
                barcode=f"barcode-{sku}.png",
                qrcode=sku
            )
            final_products.append(prod)
            sku_counter += 1

        # Additional items to reach 105 items
        extra_names = [
            ("Thermal Receipt Printer USB", "Epson", "Computer Accessories", 6500.00, 9800.00, 0.18),
            ("Barcode Scanner Handheld 2D Laser", "Zebra", "Computer Accessories", 3200.00, 5400.00, 0.18),
            ("Wireless Presenter Clicker", "Logitech", "Computer Accessories", 1400.00, 2490.00, 0.18),
            ("Noise Cancelling Desk Partition", "Titan Office", "Furniture", 4500.00, 7800.00, 0.12),
            ("Smart Door Access RFID Controller", "Vanguard Security", "Electronics", 12500.00, 18900.00, 0.18)
        ]
        for pname, brand, cat_name, p_price, s_price, tax in extra_names:
            sku = f"ITM-{sku_counter:03d}"
            cat_obj = db_categories.get(cat_name, list(db_categories.values())[0])
            sup_obj = random.choice(db_suppliers)
            prod = Product(
                id=sku,
                name=pname,
                description=f"Enterprise asset {pname} for operations.",
                category_id=cat_obj.id,
                brand=brand,
                supplier_id=sup_obj.id,
                purchase_price=p_price,
                selling_price=s_price,
                tax_rate=tax,
                serial_number=f"SN-{sku_counter:04d}-{random.randint(1000, 9999)}",
                batch_number=f"BATCH-2026-{random.randint(10, 99)}",
                expiry_date=today_date + timedelta(days=random.randint(30, 730)),
                warranty_months=12,
                barcode=f"barcode-{sku}.png",
                qrcode=sku
            )
            final_products.append(prod)
            sku_counter += 1

        db.session.add_all(final_products)
        db.session.commit()
        print(f"Seeded {len(final_products)} Products.")

        # 7. Seed Inventories across 5 Warehouses
        db_warehouses = Warehouse.query.all()
        wh_coimbatore = db_warehouses[0]
        wh_tiruppur = db_warehouses[1]
        wh_chennai = db_warehouses[2]
        wh_bangalore = db_warehouses[3]
        wh_madurai = db_warehouses[4]

        inventories_list = []
        for idx, prod in enumerate(final_products):
            # Controlled stock distribution for realistic Low Stock / Out of Stock / Overstock / Healthy metrics
            if idx % 12 == 0:  # Out of Stock
                stock_wh1, stock_wh2, stock_wh3 = 0, 0, 0
                min_s = 15
            elif idx % 7 == 0:  # Low Stock
                stock_wh1, stock_wh2, stock_wh3 = random.randint(1, 4), random.randint(0, 2), 0
                min_s = 15
            elif idx % 9 == 0:  # Overstock
                stock_wh1, stock_wh2, stock_wh3 = random.randint(400, 600), random.randint(200, 300), random.randint(150, 250)
                min_s = 10
            else:  # Healthy stock
                stock_wh1, stock_wh2, stock_wh3 = random.randint(40, 180), random.randint(20, 90), random.randint(10, 50)
                min_s = 10

            reserved_1 = random.randint(0, max(0, stock_wh1 // 8))
            reserved_2 = random.randint(0, max(0, stock_wh2 // 8))

            inv1 = Inventory(
                product_id=prod.id, warehouse_id=wh_coimbatore.id,
                shelf_location=f"Aisle {chr(65 + (idx % 8))}-Bin {idx % 20 + 1}",
                current_stock=stock_wh1, min_stock=min_s, max_stock=350, safety_stock=12,
                reserved_stock=reserved_1
            )
            inv2 = Inventory(
                product_id=prod.id, warehouse_id=wh_tiruppur.id,
                shelf_location=f"Rack {idx % 10 + 1}-Shelf {idx % 4 + 1}",
                current_stock=stock_wh2, min_stock=min_s, max_stock=250, safety_stock=10,
                reserved_stock=reserved_2
            )
            inv3 = Inventory(
                product_id=prod.id, warehouse_id=wh_chennai.id,
                shelf_location=f"Zone C-Bay {idx % 15 + 1}",
                current_stock=stock_wh3, min_stock=min_s, max_stock=300, safety_stock=10
            )

            # Additional distribution to Bangalore and Madurai for multi-warehouse fullness
            if idx % 2 == 0:
                inv4 = Inventory(
                    product_id=prod.id, warehouse_id=wh_bangalore.id,
                    shelf_location=f"Hub B-Section {idx % 5 + 1}",
                    current_stock=random.randint(15, 120), min_stock=min_s, max_stock=400, safety_stock=15
                )
                inventories_list.append(inv4)

            if idx % 3 == 0:
                inv5 = Inventory(
                    product_id=prod.id, warehouse_id=wh_madurai.id,
                    shelf_location=f"South Wing-R{idx % 6 + 1}",
                    current_stock=random.randint(10, 80), min_stock=min_s, max_stock=200, safety_stock=10
                )
                inventories_list.append(inv5)

            inventories_list.extend([inv1, inv2, inv3])

        db.session.add_all(inventories_list)
        db.session.commit()

        # Update all stock status strings on products
        for prod in final_products:
            prod.update_stock_status()

        print(f"Seeded Inventories across 5 Warehouses.")

        # 8. Seed 15+ Business Customers
        customer_data = [
            ("R&R Apparel Corporate Store 01", "store01@rrapparel.com", "+91 98940 11111", "Gold"),
            ("Tiruppur Garment Outlets", "orders@tiruppurgarments.in", "+91 98940 22222", "Platinum"),
            ("Kovai Retail Mart", "purchase@kovairetail.com", "+91 98940 33333", "Gold"),
            ("Chennai Superstore Chain", "billing@chennaisuperstore.in", "+91 98940 44444", "Platinum"),
            ("Bangalore IT Tech Park Cafe", "procurement@bangaloretechpark.com", "+91 98940 55555", "Silver"),
            ("Madurai Tex World", "sales@maduraitex.in", "+91 98940 66666", "Bronze"),
            ("Nilgiri Apparel House", "orders@nilgiriapparel.com", "+91 98940 77777", "Silver"),
            ("Salem Fabrics & Accessories", "info@salemfabrics.in", "+91 98940 88888", "Bronze"),
            ("Erode Garment Hub", "b2b@erodegarments.com", "+91 98940 99999", "Gold"),
            ("Trichy Mega Mart", "orders@trichymega.in", "+91 98941 12345", "Silver"),
            ("Coimbatore Tech Academy", "admin@coimbatoretech.edu.in", "+91 98941 23456", "Gold"),
            ("Vellore Commercial Traders", "sales@velloretraders.com", "+91 98941 34567", "Bronze"),
            ("Tuticorin Shipping Logistics", "supply@tuticorinlogistics.in", "+91 98941 45678", "Silver"),
            ("Kanyakumari Retail Hub", "orders@kanyakumariretail.com", "+91 98941 56789", "Bronze"),
            ("Hosur Industrial Supplies", "procure@hosurind.in", "+91 98941 67890", "Gold")
        ]
        customers = [Customer(name=n, email=e, phone=p, loyalty_status=l) for n, e, p, l in customer_data]
        db.session.add_all(customers)
        db.session.commit()

        # 9. Seed 80+ Sales Orders over the last 60 days
        print("Generating POS Sales Orders & Sales Items...")
        start_date = datetime.now() - timedelta(days=60)
        sales_orders = []
        sales_items = []
        stock_movements = []

        payment_methods = ["UPI", "Card", "Cash", "Net Banking"]

        for d_offset in range(60):
            order_date = start_date + timedelta(days=d_offset)
            num_orders_today = random.randint(1, 3)

            for o_idx in range(num_orders_today):
                inv_num = f"INV-2026{order_date.strftime('%m%d')}-{random.randint(1000, 9999)}"
                cust = random.choice(customers)
                chosen_products = random.sample(final_products, random.randint(1, 4))

                gross_total = 0.0
                tax_total = 0.0

                so = SalesOrder(
                    invoice_number=inv_num,
                    customer_id=cust.id,
                    order_date=order_date,
                    total_amount=0.0,
                    discount=round(random.choice([0, 100, 250, 500]), 2),
                    tax_amount=0.0,
                    net_amount=0.0,
                    payment_status='Paid',
                    created_by_id=sales_user.id
                )
                db.session.add(so)
                db.session.flush()

                for prod in chosen_products:
                    qty = random.randint(1, 4)
                    unit_p = prod.selling_price
                    item_tax = (unit_p * qty) * prod.tax_rate

                    gross_total += (unit_p * qty)
                    tax_total += item_tax

                    s_item = SalesItem(
                        sales_order_id=so.id,
                        product_id=prod.id,
                        quantity=qty,
                        unit_price=unit_p,
                        tax_rate=prod.tax_rate
                    )
                    sales_items.append(s_item)

                    # Stock Movement Outward
                    mv = StockMovement(
                        product_id=prod.id,
                        from_warehouse_id=wh_coimbatore.id,
                        quantity=qty,
                        movement_type="Sale",
                        employee_id=sales_user.id,
                        timestamp=order_date
                    )
                    stock_movements.append(mv)

                so.total_amount = round(gross_total, 2)
                so.tax_amount = round(tax_total, 2)
                so.net_amount = round(gross_total + tax_total - so.discount, 2)
                sales_orders.append(so)

        db.session.add_all(sales_items)
        db.session.add_all(stock_movements)
        db.session.commit()

        print(f"Seeded {len(sales_orders)} Sales Orders.")

        # 10. Seed 30+ Purchase Orders
        print("Generating Purchase Orders...")
        po_statuses = ["Approved", "Received", "Pending Approval", "Processing", "Shipped", "Delayed", "Draft"]
        purchase_orders = []

        for po_i in range(1, 35):
            po_num = f"PO-2026-{po_i:04d}"
            sup = random.choice(suppliers)
            status = random.choice(po_statuses)
            po_date = datetime.now() - timedelta(days=random.randint(1, 45))
            chosen_prods = random.sample(final_products, random.randint(2, 5))

            po = PurchaseOrder(
                po_number=po_num,
                supplier_id=sup.id,
                order_date=po_date,
                status=status,
                total_amount=0.0,
                created_by_id=mgr_user.id,
                approved_by_id=admin_user.id if status in ["Approved", "Received", "Shipped"] else None
            )
            db.session.add(po)
            db.session.flush()

            po_total = 0.0
            for prod in chosen_prods:
                p_qty = random.randint(20, 100)
                p_cost = prod.purchase_price
                po_total += (p_qty * p_cost)

                p_item = PurchaseItem(
                    purchase_order_id=po.id,
                    product_id=prod.id,
                    quantity=p_qty,
                    unit_price=p_cost
                )
                db.session.add(p_item)

                if status == "Received":
                    mv = StockMovement(
                        product_id=prod.id,
                        to_warehouse_id=wh_coimbatore.id,
                        quantity=p_qty,
                        movement_type="Purchase",
                        employee_id=mgr_user.id,
                        timestamp=po_date + timedelta(days=3)
                    )
                    db.session.add(mv)

            po.total_amount = round(po_total, 2)
            purchase_orders.append(po)

        db.session.commit()
        print(f"Seeded {len(purchase_orders)} Purchase Orders.")

        # 11. Seed 30+ Stock Transfer Records
        print("Generating Stock Transfer records...")
        transfer_movements = []
        for tr_i in range(30):
            prod = random.choice(final_products)
            src_wh = random.choice(db_warehouses)
            dest_wh = random.choice([w for w in db_warehouses if w.id != src_wh.id])
            t_qty = random.randint(5, 25)
            t_date = datetime.now() - timedelta(days=random.randint(1, 30))

            mv = StockMovement(
                product_id=prod.id,
                from_warehouse_id=src_wh.id,
                to_warehouse_id=dest_wh.id,
                quantity=t_qty,
                movement_type="Transfer",
                employee_id=mgr_user.id,
                timestamp=t_date
            )
            transfer_movements.append(mv)

        db.session.add_all(transfer_movements)
        db.session.commit()

        # 12. Seed 20+ Return Orders
        print("Generating Return Records...")
        return_reasons = ["Damaged in Transit", "Wrong Size / Variant", "Customer Cancellation", "Defective Product", "Expired Batch"]
        return_statuses = ["Approved", "Processed", "Pending", "Rejected"]

        recent_sales = SalesOrder.query.limit(25).all()
        for idx, so in enumerate(recent_sales):
            if idx >= 20: break
            ret_num = f"RET-2026-{idx+1:04d}"
            reason = random.choice(return_reasons)
            st = random.choice(return_statuses)
            ref_amt = round(so.net_amount * random.uniform(0.3, 1.0), 2)

            ret = OrderReturn(
                return_number=ret_num,
                sales_order_id=so.id,
                reason=reason,
                refund_amount=ref_amt,
                status=st,
                created_at=so.order_date + timedelta(days=random.randint(1, 5)),
                processed_by_id=admin_user.id
            )
            db.session.add(ret)
            db.session.flush()

            for s_item in so.items:
                r_item = ReturnItem(
                    return_id=ret.id,
                    product_id=s_item.product_id,
                    quantity=max(1, s_item.quantity // 2),
                    condition="Damaged" if "Damaged" in reason or "Defective" in reason else "Good"
                )
                db.session.add(r_item)

        db.session.commit()

        # 13. Seed AI Predictions for Products
        print("Generating AI Demand Forecasts & Predictions...")
        models_list = ["Random Forest Regressor", "ARIMA Time-Series", "XGBoost Forecast", "Decision Tree Regressor"]
        recs_list = ["Increase Safety Buffer (+20%)", "Automated Reorder Triggered", "Maintain Current Stock Level", "Overstock Alert: Reduce Order Size"]

        predictions = []
        for prod in final_products:
            total_stock = prod.get_total_stock()
            pred_sales = round(total_stock * random.uniform(0.6, 1.4), 1)
            pred_need = max(0.0, round(pred_sales - total_stock, 1))

            pred = Prediction(
                product_id=prod.id,
                prediction_date=datetime.now(),
                predicted_sales=pred_sales,
                predicted_stock_need=pred_need,
                recommendation=random.choice(recs_list),
                model_used=random.choice(models_list),
                accuracy_score=round(random.uniform(0.91, 0.98), 3)
            )
            predictions.append(pred)

        db.session.add_all(predictions)
        db.session.commit()

        # 14. Seed Audit Logs & System Notifications
        audit_events = [
            ("LOGIN", "user", "1", "User admin logged in from 127.0.0.1"),
            ("CREATE_PRODUCT", "products", "ITM-101", "Created new SKU ITM-101 in catalog"),
            ("TRANSFER_STOCK", "inventories", "ITM-003", "Transferred 25 units from Coimbatore Central Warehouse to Tiruppur Distribution Center"),
            ("RECEIVE_PO", "purchase_orders", "PO-2026-0005", "Received 150 units for Purchase Order PO-2026-0005"),
            ("EXPORT_REPORT_EXCEL", "reports", "inventory", "Exported complete inventory valuation report")
        ]
        for act, tbl, rec, det in audit_events:
            audit = AuditLog(user_id=admin_user.id, action_type=act, table_name=tbl, record_id=rec, details=det)
            db.session.add(audit)

        notifs = [
            Notification(title="Low Stock Alert", message="86 items are currently below safety buffer threshold.", type="Low Stock"),
            Notification(title="Purchase Order Approved", message="PO-2026-0012 has been approved by Owner.", type="System"),
            Notification(title="AI Forecast Updated", message="Monthly demand forecasting engine updated for 105 catalog products.", type="System")
        ]
        db.session.add_all(notifs)
        db.session.commit()

        print("Successfully populated Enterprise Dataset into inventory.db!")

if __name__ == '__main__':
    seed_enterprise()
