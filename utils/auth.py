from functools import wraps
from flask import session, redirect, jsonify
from datetime import datetime

def is_authenticated():
    return ('access_token' in session and 
            datetime.now().timestamp() < session.get('expires_at', 0))

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            return jsonify({"error": {"message": "Authentication required"}}), 401
        return f(*args, **kwargs)
    return decorated_function
