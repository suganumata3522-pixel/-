import os

from flask import Flask


def create_app(db_path=None):
    app = Flask(__name__)
    app.secret_key = os.environ.get("SEDORI_SECRET", "sedori-local-secret")
    app.config["DB_PATH"] = db_path or os.environ.get(
        "SEDORI_DB", os.path.join(os.path.dirname(os.path.dirname(__file__)), "sedori.db")
    )

    from . import db
    with app.app_context():
        db.init_db()

    @app.teardown_appcontext
    def close_db(exc):
        db.close_db()

    @app.template_filter("yen")
    def yen(value):
        try:
            return f"¥{int(round(float(value))):,}"
        except (TypeError, ValueError):
            return "-"

    @app.template_filter("pct")
    def pct(value):
        try:
            return f"{float(value):.1f}%"
        except (TypeError, ValueError):
            return "-"

    from .routes import bp
    app.register_blueprint(bp)

    return app
