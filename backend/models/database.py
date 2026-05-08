"""
═══════════════════════════════════════════
Database Layer — TeamFit AI
Supports PostgreSQL (production) and SQLite (dev/fallback).
Reads DATABASE_URL from environment.
═══════════════════════════════════════════
"""

import os
import logging
import threading
import uuid
import random
import string
from datetime import datetime

logger = logging.getLogger("teamfit")

# ═══════════════════════════════════════════
#  CONNECTION FACTORY
# ═══════════════════════════════════════════

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Detect database engine
_use_postgres = DATABASE_URL.startswith("postgres")
_db_lock = threading.Lock()

# SQLite path (fallback)
_SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "teamfit.db")


def _ph(n=1):
    """Return the correct placeholder(s) for the active DB engine.
    _ph()  → '%s' or '?'
    _ph(3) → '%s, %s, %s' or '?, ?, ?'
    """
    p = "%s" if _use_postgres else "?"
    return ", ".join([p] * n)


def get_db():
    """Return a database connection (PostgreSQL or SQLite)."""
    if _use_postgres:
        try:
            import psycopg2
            import psycopg2.extras
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = False
            return conn
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}. Falling back to SQLite.")
            # Fall through to SQLite
    # SQLite fallback
    import sqlite3
    conn = sqlite3.connect(_SQLITE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except Exception:
        pass
    return conn


def _fetchone(conn, sql, params=()):
    """Execute a query and return one row as a dict (or None)."""
    cur = _cursor(conn)
    cur.execute(sql, params)
    row = cur.fetchone()
    cur.close()
    if row is None:
        return None
    return dict(row)


def _fetchall(conn, sql, params=()):
    """Execute a query and return all rows as list of dicts."""
    cur = _cursor(conn)
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]


def _execute(conn, sql, params=()):
    """Execute a write query and return the cursor."""
    cur = _cursor(conn)
    cur.execute(sql, params)
    return cur


def _cursor(conn):
    """Create a cursor with dict support."""
    if _use_postgres:
        import psycopg2.extras
        return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    return conn.cursor()


# ═══════════════════════════════════════════
#  TABLE CREATION
# ═══════════════════════════════════════════


def init_db():
    """Create tables if they don't exist. Works for both PostgreSQL and SQLite."""
    conn = get_db()
    cur = _cursor(conn)

    if _use_postgres:
        # PostgreSQL DDL
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                avatar TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                keystrokes INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0,
                activity TEXT DEFAULT 'idle',
                role TEXT DEFAULT '',
                contribution REAL DEFAULT 0.0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                join_code TEXT UNIQUE NOT NULL,
                title TEXT DEFAULT 'Coding Session',
                created_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS session_members (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                role TEXT DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, user_name)
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS keystroke_log (
                id SERIAL PRIMARY KEY,
                student_name TEXT NOT NULL,
                keystrokes INTEGER NOT NULL,
                activity TEXT DEFAULT 'idle',
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
    else:
        # SQLite DDL
        cur.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                avatar TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                keystrokes INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0,
                activity TEXT DEFAULT 'idle',
                role TEXT DEFAULT '',
                contribution REAL DEFAULT 0.0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                join_code TEXT UNIQUE NOT NULL,
                title TEXT DEFAULT 'Coding Session',
                created_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS session_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                role TEXT DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, user_name)
            );

            CREATE TABLE IF NOT EXISTS keystroke_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_name TEXT NOT NULL,
                keystrokes INTEGER NOT NULL,
                activity TEXT DEFAULT 'idle',
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

    cur.close()
    conn.commit()
    conn.close()
    db_type = "PostgreSQL" if _use_postgres else "SQLite"
    logger.info(f"Database tables initialized ({db_type})")


# ═══════════════════════════════════════════
#  USER OPERATIONS
# ═══════════════════════════════════════════


def seed_users():
    """Seed demo users if they don't exist."""
    conn = get_db()

    demo_users = [
        ("s1", "Daksh", "daksh@teamfit.ai", "demo123", "student", ""),
        ("s2", "Harry", "harry@teamfit.ai", "demo123", "student", ""),
        ("s3", "Rohan", "student@teamfit.ai", "demo123", "student", ""),
        ("s4", "Sarah", "sarah@teamfit.ai", "demo123", "student", ""),
        ("p1", "Dr. Smith", "professor@teamfit.ai", "demo123", "professor", ""),
    ]

    for uid, name, email, pwd, role, avatar in demo_users:
        if _use_postgres:
            _execute(conn,
                f"INSERT INTO users (id, name, email, password, role, avatar) VALUES ({_ph(6)}) ON CONFLICT DO NOTHING",
                (uid, name, email, pwd, role, avatar),
            )
        else:
            _execute(conn,
                f"INSERT OR IGNORE INTO users (id, name, email, password, role, avatar) VALUES ({_ph(6)})",
                (uid, name, email, pwd, role, avatar),
            )

    conn.commit()
    conn.close()


def get_user_by_email(email: str) -> dict:
    conn = get_db()
    row = _fetchone(conn, f"SELECT * FROM users WHERE email = {_ph()}", (email,))
    conn.close()
    return row


def create_user(uid: str, name: str, email: str, password: str, role: str) -> dict:
    with _db_lock:
        conn = get_db()
        _execute(conn,
            f"INSERT INTO users (id, name, email, password, role) VALUES ({_ph(5)})",
            (uid, name, email, password, role),
        )
        conn.commit()
        conn.close()
    return {"id": uid, "name": name, "email": email, "role": role, "avatar": ""}


# ═══════════════════════════════════════════
#  STUDENT OPERATIONS
# ═══════════════════════════════════════════


def seed_students():
    """Seed demo students if they don't exist."""
    conn = get_db()

    demo_students = [
        ("Daksh", 0, 0, "idle", "Lead Developer"),
        ("Harry", 0, 0, "idle", "UI Designer"),
    ]

    for name, ks, score, act, role in demo_students:
        if _use_postgres:
            _execute(conn,
                f"INSERT INTO students (name, keystrokes, score, activity, role) VALUES ({_ph(5)}) ON CONFLICT DO NOTHING",
                (name, ks, score, act, role),
            )
        else:
            _execute(conn,
                f"INSERT OR IGNORE INTO students (name, keystrokes, score, activity, role) VALUES ({_ph(5)})",
                (name, ks, score, act, role),
            )

    conn.commit()
    conn.close()


def upsert_student(name: str, keystrokes: int = 0, score: int = 0, activity: str = "idle", role: str = "") -> dict:
    """Insert or update student. Keystrokes are INCREMENTED, not overwritten."""
    now = datetime.utcnow().isoformat()
    with _db_lock:
        conn = get_db()
        existing = _fetchone(conn, f"SELECT * FROM students WHERE name = {_ph()}", (name,))

        if existing:
            # INCREMENT keystrokes
            new_ks = existing["keystrokes"] + keystrokes
            new_score = score if score > 0 else existing["score"]
            _execute(conn,
                f"""UPDATE students SET keystrokes = {_ph()}, score = {_ph()}, activity = {_ph()},
                   role = CASE WHEN {_ph()} != '' THEN {_ph()} ELSE role END, updated_at = {_ph()}
                   WHERE name = {_ph()}""",
                (new_ks, new_score, activity, role, role, now, name),
            )
        else:
            _execute(conn,
                f"INSERT INTO students (name, keystrokes, score, activity, role, updated_at) VALUES ({_ph(6)})",
                (name, keystrokes, score, activity, role, now),
            )

        # Log the keystroke batch
        if keystrokes > 0:
            _execute(conn,
                f"INSERT INTO keystroke_log (student_name, keystrokes, activity) VALUES ({_ph(3)})",
                (name, keystrokes, activity),
            )

        conn.commit()

        # Recalculate ALL contributions
        _recalculate_contributions(conn)

        row = _fetchone(conn, f"SELECT * FROM students WHERE name = {_ph()}", (name,))
        conn.close()
    return row if row else {}


def get_all_students() -> list:
    conn = get_db()
    rows = _fetchall(conn, "SELECT * FROM students ORDER BY keystrokes DESC")
    conn.close()
    return rows


def get_student_by_name(name: str) -> dict:
    conn = get_db()
    row = _fetchone(conn, f"SELECT * FROM students WHERE name = {_ph()}", (name,))
    conn.close()
    return row


def delete_student(name: str) -> bool:
    with _db_lock:
        conn = get_db()
        cur = _execute(conn, f"DELETE FROM students WHERE name = {_ph()}", (name,))
        affected = cur.rowcount
        cur.close()
        conn.commit()
        conn.close()
        return affected > 0


def _recalculate_contributions(conn):
    """Recalculates contribution percentages for ALL students based on keystrokes."""
    row = _fetchone(conn, "SELECT SUM(keystrokes) as total FROM students")
    total = (row["total"] if row else 0) or 0

    if total > 0:
        students = _fetchall(conn, "SELECT name, keystrokes FROM students")
        for s in students:
            contrib = round((s["keystrokes"] / total) * 100, 1)
            _execute(conn, f"UPDATE students SET contribution = {_ph()} WHERE name = {_ph()}", (contrib, s["name"]))
    conn.commit()


def update_student_score(name: str, score: int, activity: str = "submitted"):
    """Update just the score and activity for a student."""
    now = datetime.utcnow().isoformat()
    with _db_lock:
        conn = get_db()
        _execute(conn,
            f"UPDATE students SET score = {_ph()}, activity = {_ph()}, updated_at = {_ph()} WHERE name = {_ph()}",
            (score, activity, now, name),
        )
        conn.commit()
        conn.close()


def auto_idle_stale_students(timeout_seconds: int = 10):
    """Mark students as 'idle' if they haven't sent an update recently."""
    with _db_lock:
        conn = get_db()
        if _use_postgres:
            _execute(conn,
                f"""UPDATE students SET activity = 'idle'
                   WHERE activity != 'idle'
                   AND updated_at < NOW() - INTERVAL '{timeout_seconds} seconds'""",
            )
        else:
            _execute(conn,
                f"""UPDATE students SET activity = 'idle'
                   WHERE activity != 'idle'
                   AND updated_at < datetime('now', {_ph()} || ' seconds')""",
                (f"-{timeout_seconds}",),
            )
        conn.commit()
        conn.close()


# ═══════════════════════════════════════════
#  ANALYTICS HELPERS
# ═══════════════════════════════════════════


def get_keystroke_history(student_name: str = None, limit: int = 50) -> list:
    """Get recent keystroke log entries."""
    conn = get_db()
    if student_name:
        rows = _fetchall(conn,
            f"SELECT * FROM keystroke_log WHERE student_name = {_ph()} ORDER BY logged_at DESC LIMIT {_ph()}",
            (student_name, limit),
        )
    else:
        rows = _fetchall(conn,
            f"SELECT * FROM keystroke_log ORDER BY logged_at DESC LIMIT {_ph()}",
            (limit,),
        )
    conn.close()
    return rows


# ═══════════════════════════════════════════
#  SESSION OPERATIONS
# ═══════════════════════════════════════════


def _generate_join_code():
    """Generate a 6-char alphanumeric join code like TF-A3K9."""
    chars = string.ascii_uppercase + string.digits
    code = "TF-" + "".join(random.choices(chars, k=4))
    return code


def create_session(created_by: str, title: str = "Coding Session") -> dict:
    """Create a new session with a unique join code."""
    session_id = str(uuid.uuid4())[:8]
    join_code = _generate_join_code()

    with _db_lock:
        conn = get_db()
        # Ensure unique join_code
        while _fetchone(conn, f"SELECT id FROM sessions WHERE join_code = {_ph()}", (join_code,)):
            join_code = _generate_join_code()

        _execute(conn,
            f"INSERT INTO sessions (id, join_code, title, created_by) VALUES ({_ph(4)})",
            (session_id, join_code, title, created_by),
        )
        # Auto-add creator as member
        _execute(conn,
            f"INSERT INTO session_members (session_id, user_name, role) VALUES ({_ph(3)})",
            (session_id, created_by, "owner"),
        )
        conn.commit()
        conn.close()

    return {
        "session_id": session_id,
        "join_code": join_code,
        "title": title,
        "created_by": created_by,
    }


def join_session(user_name: str, session_id: str = None, join_code: str = None) -> dict:
    """Join a session by session_id or join_code."""
    with _db_lock:
        conn = get_db()

        if join_code:
            session = _fetchone(conn,
                f"SELECT * FROM sessions WHERE join_code = {_ph()}", (join_code.upper(),)
            )
        elif session_id:
            session = _fetchone(conn,
                f"SELECT * FROM sessions WHERE id = {_ph()}", (session_id,)
            )
        else:
            conn.close()
            return None

        if not session:
            conn.close()
            return None

        # Add member (skip if already joined)
        if _use_postgres:
            _execute(conn,
                f"INSERT INTO session_members (session_id, user_name) VALUES ({_ph(2)}) ON CONFLICT DO NOTHING",
                (session["id"], user_name),
            )
        else:
            _execute(conn,
                f"INSERT OR IGNORE INTO session_members (session_id, user_name) VALUES ({_ph(2)})",
                (session["id"], user_name),
            )

        # Also ensure student record exists
        existing = _fetchone(conn, f"SELECT * FROM students WHERE name = {_ph()}", (user_name,))
        if not existing:
            _execute(conn,
                f"INSERT INTO students (name, keystrokes, score, activity, role) VALUES ({_ph(5)})",
                (user_name, 0, 0, "idle", ""),
            )

        conn.commit()
        conn.close()

    return session


def get_session_members(session_id: str) -> list:
    """Get all members in a session."""
    conn = get_db()
    rows = _fetchall(conn,
        f"""SELECT sm.user_name, sm.role, sm.joined_at,
                  s.keystrokes, s.activity, s.contribution
           FROM session_members sm
           LEFT JOIN students s ON sm.user_name = s.name
           WHERE sm.session_id = {_ph()}
           ORDER BY sm.joined_at ASC""",
        (session_id,),
    )
    conn.close()
    return rows


def get_session_by_code(join_code: str) -> dict:
    """Look up a session by its join code."""
    conn = get_db()
    row = _fetchone(conn, f"SELECT * FROM sessions WHERE join_code = {_ph()}", (join_code.upper(),))
    conn.close()
    return row


def get_all_sessions() -> list:
    """Get all active sessions (for professor dashboard)."""
    conn = get_db()
    rows = _fetchall(conn, "SELECT * FROM sessions ORDER BY created_at DESC")
    result = []
    for session in rows:
        members = _fetchall(conn,
            f"SELECT user_name FROM session_members WHERE session_id = {_ph()}", (session["id"],)
        )
        session["members"] = [m["user_name"] for m in members]
        session["member_count"] = len(session["members"])
        result.append(session)
    conn.close()
    return result
