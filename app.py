from flask import Flask
from dotenv import load_dotenv
import os

from routes.auth import auth_bp
from routes.api import api_bp
from routes.pages import pages_bp
from config import Config

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(pages_bp)
    
    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 3000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)
