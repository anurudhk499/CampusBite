CampusBite - Updated Project

Run locally (Windows PowerShell)
1. Open this folder in VS Code.
2. Create and activate a virtual environment:
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
3. Install dependencies:
   python -m pip install -r requirements.txt
4. Set a session secret in the same terminal:
   $env:CAMPUSBITE_SECRET_KEY = python -c "import secrets; print(secrets.token_hex(32))"
5. Start the app:
   python app.py
6. Open student page: http://127.0.0.1:5000/student
   Staff login:        http://127.0.0.1:5000/staff/login

Staff menu and pickup settings
- Staff dashboard includes Order Management, Menu & Availability, and Slots & Settings.
- Staff can add menu items, upload/replace food photos (PNG/JPG/WEBP/GIF, max 2 MB), change prices, toggle availability, and remove dishes.
- Menu data and uploaded image data are stored in SQLite. Student menu cards read from the same database and refresh while the page is open.
- Slot times, intervals, capacity, advance booking and ordering availability are stored in SQLite and read by the student pickup-slot panel.
- The student header uses a cart icon and a yellow quantity badge. The staff portal link is not shown in student navigation; staff can open /staff/login directly.
- Existing orders are retained in campusbite.db. On first startup after this update, the menu/settings tables are created and seeded only if empty.

Important
- Keep the terminal running while using the site.
- Use the same Flask server for student and staff pages so they share the same database/session backend.
- This is a college demonstration project. Before production use, add CSRF protection, enforce pickup-slot capacity and time validation server-side, and review image storage limits and access controls.
