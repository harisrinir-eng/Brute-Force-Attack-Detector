"""
sample_data/generate_samples.py

Standalone script to pre-populate the database with realistic demo data.
Run this AFTER starting the backend at least once (to init the DB).

Usage:
    cd backend
    python ../sample_data/generate_samples.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from db.database import init_db, get_connection
from datetime import datetime, timezone, timedelta
import random

def insert_attempt(username, ip, success, status, risk_score, reason, action, minutes_ago):
    conn = get_connection()
    c = conn.cursor()
    ts = (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat()
    c.execute("""
        INSERT INTO login_attempts
            (username, ip_address, timestamp, success, status, risk_score, reason, action)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (username, ip, ts, int(success), status, risk_score, reason, action))
    conn.commit()
    conn.close()

def main():
    os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'backend', 'data'), exist_ok=True)
    init_db()

    print("Generating sample data...")

    # Normal users
    for i in range(8):
        insert_attempt('alice', '10.0.0.10', True, 'normal', 2.0, 'Successful login', 'none', random.randint(5, 60))
    for i in range(3):
        insert_attempt('alice', '10.0.0.10', False, 'normal', 5.0, 'Single failed attempt', 'none', random.randint(30, 90))

    for i in range(5):
        insert_attempt('bob', '10.0.0.20', True, 'normal', 1.5, 'Successful login', 'none', random.randint(2, 50))

    insert_attempt('student', '10.0.0.30', False, 'normal', 8.0, 'Wrong password', 'none', 45)
    insert_attempt('student', '10.0.0.30', True, 'normal', 0.0, 'Successful login', 'none', 44)

    # Attack simulation
    attack_ip = '192.168.99.1'
    base = 12
    for i in range(12):
        risk = min(100, 20 + i * 7)
        status = 'normal' if i < 3 else 'suspicious' if i < 6 else 'attack'
        action = 'none' if i < 3 else 'captcha' if i < 6 else 'lockout'
        reason = f"Attempt {i+1}: {'high failure count' if i >= 5 else 'normal'}"
        insert_attempt('admin', attack_ip, False, status, float(risk), reason, action, base - i * 0.1)

    print("✅ Sample data inserted successfully.")
    print("Open the dashboard to see the populated data.")

if __name__ == '__main__':
    main()
