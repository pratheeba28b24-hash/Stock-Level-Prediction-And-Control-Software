"""
One-time DB fix script:
- Recreates authorized_devices table with composite unique (user_id + device_fingerprint)
- Ensures Customer role and user exist
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'inventory.db')
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# 1. Check the current table schema
c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='authorized_devices'")
row = c.fetchone()
print("Current schema:", row)

# 2. Recreate the table with composite unique constraint
print("Rebuilding authorized_devices table...")
c.execute("PRAGMA foreign_keys=OFF")

# Rename old table
c.execute("ALTER TABLE authorized_devices RENAME TO authorized_devices_old")

# Create new table with composite unique
c.execute("""
CREATE TABLE authorized_devices (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    device_fingerprint VARCHAR(255),
    ip_address VARCHAR(50),
    browser_name VARCHAR(100),
    os_name VARCHAR(100),
    approved BOOLEAN DEFAULT 0,
    token VARCHAR(255),
    UNIQUE (user_id, device_fingerprint)
)
""")

# Copy approved records only
c.execute("""
INSERT INTO authorized_devices (id, user_id, device_fingerprint, ip_address, browser_name, os_name, approved, token)
SELECT id, user_id, device_fingerprint, ip_address, browser_name, os_name, approved, token
FROM authorized_devices_old
WHERE approved = 1
""")

# Drop old table
c.execute("DROP TABLE authorized_devices_old")

# Re-create the index
c.execute("CREATE INDEX IF NOT EXISTS ix_authorized_devices_device_fingerprint ON authorized_devices (device_fingerprint)")

c.execute("PRAGMA foreign_keys=ON")
conn.commit()

print("authorized_devices table rebuilt successfully.")

# 3. Verify Customer role
c.execute("SELECT id, name FROM roles WHERE name='Customer'")
cust_role = c.fetchone()
if not cust_role:
    c.execute("INSERT INTO roles (name, description) VALUES ('Customer', 'Customer portal access for viewing products and placing orders.')")
    conn.commit()
    c.execute("SELECT id FROM roles WHERE name='Customer'")
    cust_role = c.fetchone()
    print("Customer role created.")
else:
    print(f"Customer role exists: id={cust_role[0]}")

# 4. Verify customer user
c.execute("SELECT id, username FROM users WHERE username='customer'")
cust_user = c.fetchone()
if cust_user:
    print(f"Customer user exists: {cust_user}")
else:
    print("Customer user missing — will be created on next app startup via seed_database().")

conn.close()
print("Done! DB is clean and ready.")
