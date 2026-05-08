"""
═══════════════════════════════════════════
TeamFit AI — Flask Backend
JWT Authentication + SQLite Database
Production-ready with logging & CORS.
═══════════════════════════════════════════
"""

import logging
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import blueprints
from routes.auth import auth_bp
from routes.students import students_bp
from routes.execute import execute_bp
from routes.dashboard import dashboard_bp
from routes.ai_insights import ai_insights_bp
from routes.session import session_bp

# Import database
from models.database import init_db, seed_users, seed_students

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("teamfit")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── CORS — allow configured origins (or all in dev) ──
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Initialize database ──
    try:
        init_db()
        seed_users()
        seed_students()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    # ── Register all blueprints under /api ──
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(students_bp, url_prefix="/api")
    app.register_blueprint(execute_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(ai_insights_bp, url_prefix="/api")
    app.register_blueprint(session_bp, url_prefix="/api")

    # ── Health check ──
    @app.route("/api/health")
    def health():
        from models.database import _use_postgres
        return jsonify({
            "status": "operational",
            "service": "TeamFit AI",
            "db": "PostgreSQL" if _use_postgres else "SQLite",
            "auth": "JWT",
        })

    # ── Global error handlers ──
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    # ── Request logging ──
    @app.before_request
    def log_request():
        from flask import request
        if not request.path.startswith('/api/health'):
            logger.info(f"{request.method} {request.path}")

    return app


app = create_app()

if __name__ == "__main__":
    import socket
    from models.database import _use_postgres
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "unknown"
    port = Config.PORT
    db_label = "PostgreSQL" if _use_postgres else "SQLite (teamfit.db)"
    print(f"🚀 TeamFit AI Backend running!")
    print(f"📡 Local:   http://localhost:{port}/api")
    print(f"📡 Network: http://{local_ip}:{port}/api")
    print(f"❤️  Health:  http://localhost:{port}/api/health")
    print("🔐 Auth: JWT (Bearer token)")
    print(f"💾 Database: {db_label}")
    app.run(debug=Config.FLASK_DEBUG, port=port, host="0.0.0.0")
