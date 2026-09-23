"""SecureBank Application Entry Point.

Initializes Flask, registers blueprint modules, configures error handlers,
and provides system health check endpoints.
"""

import os
import logging
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from backend.app.config import get_config, Config
from backend.app.security.utils import error_response, success_response

# Import Blueprints
from backend.app.auth.routes import auth_bp
from backend.app.customers.routes import customers_bp
from backend.app.accounts.routes import accounts_bp
from backend.app.transactions.routes import transactions_bp
from backend.app.beneficiaries.routes import beneficiaries_bp
from backend.app.loans.routes import loans_bp
from backend.app.compliance.routes import compliance_bp
from backend.app.audit.routes import audit_bp
from backend.app.reports.routes import reports_bp

# Set up standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("securebank")


def create_app(config_class: type[Config] = None) -> Flask:
    """Application factory for SecureBank."""
    app = Flask(__name__)

    if config_class is None:
        config_class = get_config()

    app.config.from_object(config_class)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(beneficiaries_bp)
    app.register_blueprint(loans_bp)
    app.register_blueprint(compliance_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(reports_bp)

    # Health Check Endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Public health check endpoint returning system status."""
        return success_response({
            "status": "ok",
            "app": "SecureBank API",
            "version": "1.0.0"
        }, status_code=200)

    # Root Endpoint
    @app.route("/", methods=["GET"])
    def root():
        """Root welcome endpoint."""
        return success_response({
            "message": "Welcome to SecureBank Backend API",
            "documentation": "/docs",
            "health": "/api/health"
        }, status_code=200)

    # Error Handlers
    @app.errorhandler(400)
    def handle_bad_request(e):
        return error_response(str(e.description) if hasattr(e, "description") else "Bad request.", code="BAD_REQUEST", status_code=400)

    @app.errorhandler(401)
    def handle_unauthorized(e):
        return error_response("Authentication required.", code="UNAUTHORIZED", status_code=401)

    @app.errorhandler(403)
    def handle_forbidden(e):
        return error_response("Access forbidden.", code="FORBIDDEN", status_code=403)

    @app.errorhandler(404)
    def handle_not_found(e):
        return error_response("The requested resource was not found.", code="NOT_FOUND", status_code=404)

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return error_response("HTTP method not allowed for this endpoint.", code="METHOD_NOT_ALLOWED", status_code=405)

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return error_response(e.description, code="HTTP_ERROR", status_code=e.code)

    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        logger.error(f"Unhandled server error: {e}", exc_info=True)
        return error_response(
            "An internal server error occurred.",
            code="INTERNAL_SERVER_ERROR",
            status_code=500
        )

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=app.config.get("DEBUG", True))
