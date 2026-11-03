
from getpass import getpass
from werkzeug.security import generate_password_hash
from app import get_db, initialize_database

initialize_database()

print("=== CampusBite: Create Staff Account ===")

username = input("Enter staff username: ").strip()

if not username:
    print("Username cannot be empty.")
    raise SystemExit(1)

password = getpass("Enter staff password: ")
confirm_password = getpass("Confirm staff password: ")

if len(password) < 8:
    print("Use a password with at least 8 characters.")
    raise SystemExit(1)

if password != confirm_password:
    print("Passwords do not match.")
    raise SystemExit(1)

try:
    with get_db() as db:
        db.execute(
            "INSERT INTO staff (username, password_hash) VALUES (?, ?)",
            (username, generate_password_hash(password))
        )

    print(f"Staff account '{username}' created successfully.")

except Exception as error:
    if "UNIQUE constraint failed" in str(error):
        print("That username already exists.")
    else:
        raise
