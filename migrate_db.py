import sqlite3
conn = sqlite3.connect("inventory.db")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(products)")
existing_cols = [row[1] for row in cursor.fetchall()]
print("Existing columns:", existing_cols)
new_cols = {"serial_number": "TEXT", "min_stock": "INTEGER DEFAULT 5", "safety_stock": "INTEGER DEFAULT 10", "max_stock": "INTEGER DEFAULT 200"}
for col, col_type in new_cols.items():
    if col not in existing_cols:
        cursor.execute("ALTER TABLE products ADD COLUMN " + col + " " + col_type)
        print("Added:", col)
    else:
        print("OK:", col)
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='order_returns'")
if not cursor.fetchone():
    cursor.execute("CREATE TABLE order_returns (id INTEGER PRIMARY KEY AUTOINCREMENT, return_number TEXT UNIQUE NOT NULL, sales_order_id INTEGER NOT NULL, reason TEXT, refund_amount REAL DEFAULT 0.0, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    print("Created: order_returns")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='return_items'")
if not cursor.fetchone():
    cursor.execute("CREATE TABLE return_items (id INTEGER PRIMARY KEY AUTOINCREMENT, return_id INTEGER NOT NULL, product_id TEXT NOT NULL, quantity INTEGER DEFAULT 1, unit_price REAL DEFAULT 0.0)")
    print("Created: return_items")
conn.commit()
conn.close()
print("Migration complete")
