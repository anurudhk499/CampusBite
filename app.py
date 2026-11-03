
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash
)
from werkzeug.security import check_password_hash
from pathlib import Path
import sqlite3
import os
from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)
import json
import re
from datetime import datetime, timedelta
app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "campusbite.db"

# Configure the secret key before starting Flask.
app.secret_key = os.environ.get("CAMPUSBITE_SECRET_KEY")
if not app.secret_key:
    raise RuntimeError(
        "Set CAMPUSBITE_SECRET_KEY before starting the app."
    )

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE") == "1",
)


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                device TEXT,
                customer_name TEXT NOT NULL,
                usn TEXT,
                pickup_date TEXT NOT NULL,
                pickup_slot TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Confirmed',
                items_json TEXT NOT NULL,
                total REAL NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS menu_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL CHECK(price >= 0),
                description TEXT NOT NULL DEFAULT '',
                icon TEXT NOT NULL DEFAULT '🍽',
                image TEXT NOT NULL DEFAULT '',
                available INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                opening_time TEXT NOT NULL,
                closing_time TEXT NOT NULL,
                slot_interval INTEGER NOT NULL,
                slot_capacity INTEGER NOT NULL,
                advance_days INTEGER NOT NULL,
                cutoff_minutes INTEGER NOT NULL,
                ordering_open INTEGER NOT NULL DEFAULT 1,
                advance_booking INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL
            )
        """)
        if db.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0] == 0:
            defaults = [
                ('idli','Idli','South Indian',30,'Two soft steamed idlis with sambar and chutney.','🍥','',1),
                ('vada','Vada','South Indian',30,'Crisp medu vada with sambar and chutney.','🍩','',1),
                ('palav','Palav','South Indian',50,'Fragrant rice cooked with vegetables and mild spices.','🍛','',1),
                ('rice-bath','Rice Bath','South Indian',40,'Soft Karnataka-style rice bath with vegetables.','🍚','',1),
                ('set-dosa','Set Dosa','South Indian',45,'Three soft dosas with chutney and sagu.','🥞','',1),
                ('masala-dosa','Masala Dosa','South Indian',50,'Crisp dosa filled with spiced potato masala.','🌯','',1),
                ('mysore-masala-dosa','Mysore Masala Dosa','South Indian',60,'Dosa with red chutney and potato masala.','🌯','',1),
                ('paneer-masala-dosa','Paneer Masala Dosa','South Indian',80,'Dosa stuffed with spiced paneer and potato.','🧀','',1),
                ('schezwan-masala-dosa','Schezwan Masala Dosa','South Indian',70,'Schezwan dosa with vegetables.','🌶️','',1),
                ('pav-bhaji','Pav Bhaji','Snacks',60,'Vegetable bhaji with toasted pav.','🍞','',1),
                ('gobi-manchurian','Gobi Manchurian','Snacks',70,'Crispy cauliflower in tangy sauce.','🥦','',1),
                ('french-fries','French Fries','Snacks',50,'Golden salted fries with ketchup.','🍟','',1),
                ('peri-peri-fries','Peri-Peri Fries','Snacks',60,'Fries with peri-peri seasoning.','🍟','',0),
                ('veg-fried-rice','Veg Fried Rice','Rice & Noodles',70,'Wok-tossed rice with vegetables.','🍚','',1),
                ('veg-noodles','Veg Noodles','Rice & Noodles',70,'Stir-fried noodles with vegetables.','🍜','',1),
                ('schezwan-noodles','Schezwan Noodles','Rice & Noodles',80,'Spicy schezwan noodles with vegetables.','🍜','',1),
                ('regular-tea','Regular Tea','Beverages',12,'Classic milk tea.','☕','',1),
                ('lemon-tea','Lemon Tea','Beverages',15,'Tea with lemon.','🍋','',1),
                ('filter-coffee','Filter Coffee','Beverages',15,'South Indian filter coffee with milk.','☕','',1),
                ('cold-coffee','Cold Coffee','Beverages',40,'Chilled blended coffee.','🥤','',1)
            ]
            now = datetime.now().isoformat(timespec="seconds")
            db.executemany("""INSERT INTO menu_items
                (id,name,category,price,description,icon,image,available,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?)""", [tuple(x)+(now,) for x in defaults])
        if not db.execute("SELECT 1 FROM app_settings WHERE id=1").fetchone():
            db.execute("""INSERT INTO app_settings
                (id,opening_time,closing_time,slot_interval,slot_capacity,advance_days,cutoff_minutes,ordering_open,advance_booking,updated_at)
                VALUES (1,'09:30','16:30',15,6,2,15,1,1,?)""", (datetime.now().isoformat(timespec="seconds"),))


@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    usn = str(data.get("usn", "")).strip()
    pickup_date = str(data.get("date", ""))
    pickup_slot = str(data.get("slot", ""))
    items = data.get("items")
    device = str(data.get("device", ""))[:100]

    if len(name) < 2:
        return {"error": "Enter a valid name."}, 400

    if not pickup_date or not pickup_slot:
        return {"error": "Select a pickup date and time."}, 400

    try:
        pickup_day = datetime.strptime(pickup_date, "%Y-%m-%d").date()
        slot_hour, slot_minute = map(int, pickup_slot.split(":"))
        if not (0 <= slot_hour <= 23 and 0 <= slot_minute <= 59): raise ValueError
    except (ValueError, TypeError):
        return {"error": "Choose a valid pickup date and time."}, 400

    if not isinstance(items, list) or not items or len(items) > 50:
        return {"error": "Your cart is empty or invalid."}, 400

    # For this first step, validate the item structure.
    clean_items = []
    for item in items:
        if not isinstance(item, dict):
            return {"error": "Invalid cart item."}, 400

        item_id = str(item.get("id", ""))
        item_name = str(item.get("name", "")).strip()

        try:
            quantity = int(item.get("qty", 0))
            price = float(item.get("price", -1))
        except (TypeError, ValueError):
            return {"error": "Invalid item quantity or price."}, 400

        if not item_id or not item_name or not 1 <= quantity <= 50 or price < 0:
            return {"error": "Invalid cart item."}, 400

        with get_db() as db:
            saved_item = db.execute("SELECT name, price, available FROM menu_items WHERE id=?", (item_id,)).fetchone()
        if not saved_item or not saved_item["available"]:
            return {"error": f"{item_name or 'This item'} is currently unavailable."}, 409
        clean_items.append({"id": item_id, "name": saved_item["name"], "qty": quantity, "price": float(saved_item["price"])})

    with get_db() as db:
        settings = db.execute("SELECT * FROM app_settings WHERE id=1").fetchone()
        if settings and not settings["ordering_open"]:
            return {"error": "Online pre-orders are currently paused by the canteen."}, 409
        today = datetime.now().date()
        max_days = int(settings["advance_days"]) if settings and settings["advance_booking"] else 0
        if pickup_day < today or pickup_day > today.fromordinal(today.toordinal() + max_days):
            return {"error": "That pickup date is outside the available booking window."}, 409
        slot_minutes = slot_hour * 60 + slot_minute
        if settings:
            opening = int(settings["opening_time"][:2]) * 60 + int(settings["opening_time"][3:])
            closing = int(settings["closing_time"][:2]) * 60 + int(settings["closing_time"][3:])
            interval = int(settings["slot_interval"])
            cutoff = int(settings["cutoff_minutes"])
            if slot_minutes < opening or slot_minutes > closing or (slot_minutes - opening) % interval != 0:
                return {"error": "That pickup time is not an available slot."}, 409
            pickup_datetime = datetime.combine(pickup_day, datetime.min.time()).replace(hour=slot_hour, minute=slot_minute)
            if pickup_datetime <= datetime.now() + timedelta(minutes=cutoff):
                return {"error": "That pickup slot has closed. Choose another time."}, 409
            used = db.execute("SELECT COUNT(*) FROM orders WHERE pickup_date=? AND pickup_slot=? AND status != 'Cancelled'", (pickup_date, pickup_slot)).fetchone()[0]
            if used >= int(settings["slot_capacity"]):
                return {"error": "That pickup slot is full. Please choose another."}, 409
    total = sum(item["qty"] * item["price"] for item in clean_items)
    created_at = datetime.now().isoformat(timespec="seconds")

    with get_db() as db:
        last = db.execute(
            "SELECT id FROM orders ORDER BY id DESC LIMIT 1"
        ).fetchone()
        next_id = (last["id"] if last else 0) + 1
        token = f"CB-{100 + next_id}"

        db.execute(
            """
            INSERT INTO orders (
                token, device, customer_name, usn,
                pickup_date, pickup_slot, status,
                items_json, total, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?, ?)
            """,
            (
                token, device, name, usn, pickup_date,
                pickup_slot, json.dumps(clean_items),
                total, created_at
            )
        )

    return {
        "message": "Order confirmed.",
        "token": token,
        "status": "Confirmed",
        "total": total
    }, 201


@app.route("/api/orders/<token>", methods=["GET"])
def get_order_status(token):
    """Return the latest database-backed order state for student tracking."""
    with get_db() as db:
        row = db.execute(
            """SELECT token, customer_name, usn, pickup_date, pickup_slot,
                      status, items_json, total, created_at
               FROM orders WHERE token = ?""",
            (token.upper().strip(),)
        ).fetchone()

    if not row:
        return {"error": "Order not found. Check the token and try again."}, 404

    try:
        items = json.loads(row["items_json"])
    except (TypeError, json.JSONDecodeError):
        items = []

    return {
        "token": row["token"],
        "name": row["customer_name"],
        "usn": row["usn"],
        "date": row["pickup_date"],
        "slot": row["pickup_slot"],
        "status": row["status"],
        "items": items,
        "total": row["total"],
        "createdAt": row["created_at"]
    }, 200


@app.route("/api/orders/<token>/cancel", methods=["POST"])
def cancel_order(token):
    """Allow cancellation only while an order is still confirmed."""
    with get_db() as db:
        order = db.execute(
            "SELECT status FROM orders WHERE token = ?",
            (token.upper().strip(),)
        ).fetchone()
        if not order:
            return {"error": "Order not found."}, 404
        if order["status"] != "Confirmed":
            return {"error": "Only confirmed orders can be cancelled."}, 409
        db.execute(
            "UPDATE orders SET status = 'Cancelled' WHERE token = ?",
            (token.upper().strip(),)
        )
    return {"message": "Order cancelled.", "token": token.upper().strip(), "status": "Cancelled"}, 200


@app.route("/staff/register", methods=["GET", "POST"])
def staff_register():
    # Only an authenticated staff member can register another staff member.
    if not session.get("staff_id"):
        return redirect(url_for("staff_login"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not username:
            flash("Username is required.", "error")
        elif len(password) < 12:
            flash("Password must contain at least 12 characters.", "error")
        elif password != confirm_password:
            flash("Passwords do not match.", "error")
        else:
            try:
                with get_db() as db:
                    db.execute(
                        """
                        INSERT INTO staff (username, password_hash)
                        VALUES (?, ?)
                        """,
                        (
                            username,
                            generate_password_hash(password)
                        )
                    )

                flash("Staff account created successfully.", "success")
                return redirect(url_for("staff_dashboard"))

            except sqlite3.IntegrityError:
                flash("That username already exists.", "error")

    return render_template("staff_register.html")

# Welcome / access page
@app.route("/")
def home():
    return render_template("auth.html")


@app.route("/api/slot-usage", methods=["GET"])
def get_slot_usage():
    requested_date = request.args.get("date", "")
    try:
        date_value = datetime.strptime(requested_date, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "Provide a valid date."}, 400
    with get_db() as db:
        settings = db.execute("SELECT * FROM app_settings WHERE id=1").fetchone()
        rows = db.execute("""SELECT pickup_slot, COUNT(*) AS used FROM orders
            WHERE pickup_date=? AND status != 'Cancelled' GROUP BY pickup_slot""", (requested_date,)).fetchall()
    return {"date": requested_date, "used": {row["pickup_slot"]: row["used"] for row in rows},
            "capacity": settings["slot_capacity"], "orderingOpen": bool(settings["ordering_open"])}, 200

# Public menu and pickup settings; changes are managed only by authenticated staff.
def menu_row(row):
    return {"id": row["id"], "name": row["name"], "category": row["category"],
            "price": row["price"], "description": row["description"], "icon": row["icon"],
            "image": row["image"], "available": bool(row["available"])}

def settings_payload(row):
    return {"openingTime": row["opening_time"], "closingTime": row["closing_time"],
            "slotInterval": row["slot_interval"], "slotCapacity": row["slot_capacity"],
            "advanceDays": row["advance_days"], "cutoffMinutes": row["cutoff_minutes"],
            "orderingOpen": bool(row["ordering_open"]), "advanceBooking": bool(row["advance_booking"])}

@app.route("/api/menu", methods=["GET"])
def get_public_menu():
    with get_db() as db:
        rows = db.execute("SELECT * FROM menu_items ORDER BY rowid").fetchall()
    return {"items": [menu_row(r) for r in rows]}, 200

@app.route("/api/settings", methods=["GET"])
def get_public_settings():
    with get_db() as db:
        row = db.execute("SELECT * FROM app_settings WHERE id=1").fetchone()
    return settings_payload(row), 200

@app.route("/api/staff/menu", methods=["POST"])
def save_staff_menu_item():
    if not session.get("staff_id"):
        return {"error": "Staff login required."}, 401
    data = request.get_json(silent=True) or {}
    item_id = str(data.get("id", "")).strip()[:100]
    name = str(data.get("name", "")).strip()[:80]
    category = str(data.get("category", "")).strip()[:50]
    description = str(data.get("description", "")).strip()[:300]
    icon = str(data.get("icon", "🍽"))[:12]
    image = data.get("image", "")
    try: price = float(data.get("price"))
    except (TypeError, ValueError): return {"error": "Enter a valid price."}, 400
    if not item_id or len(name) < 2 or not category or price < 0 or price > 10000:
        return {"error": "Check the dish name, category and price."}, 400
    if not isinstance(image, str) or len(image) > 3_000_000:
        return {"error": "Image is too large. Choose an image under 2 MB."}, 400
    if image and not re.fullmatch(r"data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+", image):
        return {"error": "Please upload a valid PNG, JPG, WEBP or GIF image."}, 400
    available = 1 if data.get("available", True) else 0
    now = datetime.now().isoformat(timespec="seconds")
    with get_db() as db:
        db.execute("""INSERT INTO menu_items
            (id,name,category,price,description,icon,image,available,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category,
            price=excluded.price, description=excluded.description, icon=excluded.icon,
            image=excluded.image, available=excluded.available, updated_at=excluded.updated_at""",
            (item_id,name,category,price,description,icon,image,available,now))
        row = db.execute("SELECT * FROM menu_items WHERE id=?", (item_id,)).fetchone()
    return {"item": menu_row(row), "message": "Menu item saved."}, 200

@app.route("/api/staff/menu/<item_id>", methods=["DELETE"])
def delete_staff_menu_item(item_id):
    if not session.get("staff_id"):
        return {"error": "Staff login required."}, 401
    with get_db() as db:
        result = db.execute("DELETE FROM menu_items WHERE id=?", (item_id,))
        if result.rowcount == 0:
            return {"error": "Menu item not found."}, 404
    return {"message": "Menu item deleted."}, 200

@app.route("/api/staff/settings", methods=["POST"])
def save_staff_settings():
    if not session.get("staff_id"):
        return {"error": "Staff login required."}, 401
    data = request.get_json(silent=True) or {}
    opening = str(data.get("openingTime", "")); closing = str(data.get("closingTime", ""))
    try:
        interval=int(data.get("slotInterval")); capacity=int(data.get("slotCapacity"))
        days=int(data.get("advanceDays")); cutoff=int(data.get("cutoffMinutes"))
    except (TypeError, ValueError):
        return {"error": "Enter valid numbers for slot settings."}, 400
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", opening) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", closing) or opening >= closing:
        return {"error": "Closing time must be later than opening time."}, 400
    if interval not in (10,15,30,60) or not 1 <= capacity <= 500 or not 0 <= days <= 30 or not 0 <= cutoff <= 120:
        return {"error": "One or more settings are outside the allowed range."}, 400
    now = datetime.now().isoformat(timespec="seconds")
    with get_db() as db:
        db.execute("""UPDATE app_settings SET opening_time=?,closing_time=?,slot_interval=?,slot_capacity=?,
            advance_days=?,cutoff_minutes=?,ordering_open=?,advance_booking=?,updated_at=? WHERE id=1""",
            (opening,closing,interval,capacity,days,cutoff,1 if data.get("orderingOpen") else 0,
             1 if data.get("advanceBooking") else 0,now))
        row=db.execute("SELECT * FROM app_settings WHERE id=1").fetchone()
    return {"settings": settings_payload(row), "message": "Settings saved."}, 200

# Student canteen page
@app.route("/student")
def student_home():
    return render_template("index.html")


@app.route("/api/staff/orders", methods=["GET"])
def get_staff_orders():
    if not session.get("staff_id"):
        return {"error": "Please log in as staff."}, 401

    with get_db() as db:
        rows = db.execute("""
            SELECT token, customer_name, usn,
                   pickup_date, pickup_slot, status,
                   items_json, total, created_at
            FROM orders
            ORDER BY id DESC
        """).fetchall()

    orders = []

    for row in rows:
        orders.append({
            "token": row["token"],
            "name": row["customer_name"],
            "usn": row["usn"],
            "date": row["pickup_date"],
            "slot": row["pickup_slot"],
            "status": row["status"],
            "items": json.loads(row["items_json"]),
            "total": row["total"],
            "createdAt": row["created_at"]
        })

    return {"orders": orders}, 200

@app.route("/api/staff/orders/<token>/status", methods=["POST"])
def update_order_status(token):
    if not session.get("staff_id"):
        return {"error": "Staff login required."}, 401

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    allowed_statuses = {
        "Confirmed",
        "Preparing",
        "Ready for Pickup",
        "Completed",
        "Cancelled"
    }

    if new_status not in allowed_statuses:
        return {"error": "Invalid order status."}, 400

    with get_db() as db:
        order = db.execute(
            "SELECT status FROM orders WHERE token = ?",
            (token,)
        ).fetchone()

        if not order:
            return {"error": "Order not found."}, 404

        current_status = order["status"]

        if current_status in ("Completed", "Cancelled"):
            return {"error": "This order is already closed."}, 409

        allowed_next = {
            "Confirmed": {"Preparing", "Cancelled"},
            "Preparing": {"Ready for Pickup", "Cancelled"},
            "Ready for Pickup": {"Completed", "Cancelled"}
        }
        if new_status not in allowed_next.get(current_status, set()):
            return {
                "error": f"Invalid transition from {current_status} to {new_status}."
            }, 400

        db.execute(
            "UPDATE orders SET status = ? WHERE token = ?",
            (new_status, token)
        )

    return {
        "message": "Order status updated.",
        "token": token,
        "status": new_status
    }, 200

# Staff login
@app.route("/staff/login", methods=["GET", "POST"])
def staff_login():
    if session.get("staff_id"):
        return redirect(url_for("staff_dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        with get_db() as db:
            staff = db.execute(
                "SELECT * FROM staff WHERE username = ?",
                (username,)
            ).fetchone()

        if staff and check_password_hash(
            staff["password_hash"], password
        ):
            session.clear()
            session["staff_id"] = staff["id"]
            session["staff_username"] = staff["username"]
            return redirect(url_for("staff_dashboard"))

        flash("Invalid username or password.", "error")

    return render_template("staff_login.html")


# Protected staff dashboard
@app.route("/staff/dashboard")
def staff_dashboard():
    if not session.get("staff_id"):
        return redirect(url_for("staff_login"))

    return render_template("staff.html")


# Staff logout
@app.route("/staff/logout", methods=["POST"])
def staff_logout():
    session.clear()
    return redirect(url_for("staff_login"))


if __name__ == "__main__":
    initialize_database()
    app.run(debug=True)
