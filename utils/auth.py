from functools import wraps
from flask import session, redirect, jsonify
from datetime import datetime
from models.user import User

def get_current_user():
    if 'user_id' not in session:
        return None
    
    user = User.query.get(session['user_id'])
    if not user:
        return None
    
    # Check if token is expired
    if user.token_expires_at and datetime.utcnow() >= user.token_expires_at:
        return None
    
    return user

def is_authenticated():
    user = get_current_user()
    return user is not None

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": {"message": "Authentication required"}}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_user_access_token():
    user = get_current_user()
    return user.access_token if user else None
