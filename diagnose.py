"""Diagnostic script to check all user accounts and identify issues."""
from app import create_app
app = create_app()

with app.app_context():
    from models import User, Role

    print("=" * 60)
    print("USER ACCOUNT DIAGNOSTICS")
    print("=" * 60)

    roles = Role.query.all()
    print(f"\nRoles: {[r.name for r in roles]}")

    users = User.query.all()
    for u in users:
        pwd_guess = u.username + "123"
        pw_ok = u.check_password(pwd_guess)
        print(f"\n  User: {u.username}")
        print(f"    Email: {u.email}")
        print(f"    Role: {u.role.name} (id={u.role_id})")
        print(f"    Locked: {u.is_locked()}")
        print(f"    Failed logins: {u.failed_logins}")
        print(f"    Locked until: {u.locked_until}")
        print(f"    Password '{pwd_guess}' valid: {pw_ok}")

    # Check the role name mapping - the frontend might expect 'Admin' but seed uses 'Owner'
    print("\n" + "=" * 60)
    print("ROLE NAME ANALYSIS")
    print("=" * 60)
    for r in roles:
        user_count = User.query.filter_by(role_id=r.id).count()
        print(f"  Role '{r.name}': {user_count} users")

    # Check what the login endpoint returns as role name
    print("\n" + "=" * 60)
    print("LOGIN API ROLE MAPPING CHECK")
    print("=" * 60)
    admin_user = User.query.filter_by(username='admin').first()
    print(f"  admin's role.name = '{admin_user.role.name}'")
    print(f"  Frontend expects 'Admin' for security nav visibility")
    print(f"  Match: {'Admin' == admin_user.role.name}")
