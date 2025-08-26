from flask import Blueprint, request, session, redirect, jsonify
from datetime import datetime, timedelta
import requests
import urllib.parse
from config import Config
from services.spotify import SpotifyService
from models.user import User
from models import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login')
def login():
    params = {
        'client_id': Config.CLIENT_ID,
        'response_type': 'code',
        'scope': Config.SPOTIFY_SCOPE,
        'redirect_uri': Config.REDIRECT_URI,
        'show_dialog': True
    }
    
    auth_url = f"{Config.AUTH_URL}?{urllib.parse.urlencode(params)}"
    return redirect(auth_url)

@auth_bp.route('/callback')
def callback():
    if 'error' in request.args:
        return jsonify({"error": request.args['error']})
    
    if 'code' not in request.args:
        return jsonify({"error": "Authorization code not found"})
    
    req_body = {
        'code': request.args['code'],
        'grant_type': 'authorization_code',
        'redirect_uri': Config.REDIRECT_URI,
        'client_id': Config.CLIENT_ID,
        'client_secret': Config.CLIENT_SECRET
    }
    
    response = requests.post(Config.TOKEN_URL, data=req_body)
    
    if response.status_code != 200:
        return jsonify({"error": "Failed to get access token"})
    
    token_info = response.json()
    access_token = token_info['access_token']
    refresh_token = token_info['refresh_token']
    expires_in = token_info['expires_in']
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    
    # Get user profile from Spotify
    profile_info = SpotifyService.get_user_profile(access_token)
    
    if 'error' in profile_info:
        return jsonify({"error": "Failed to get user profile"})
    
    # Create or update user in database
    user = User.find_by_spotify_id(profile_info['id'])
    
    if user:
        # Update existing user
        user.display_name = profile_info['display_name']
        user.email = profile_info.get('email')
        user.profile_url = profile_info['external_urls']['spotify']
        user.update_tokens(access_token, refresh_token, expires_at)
    else:
        # Create new user
        user = User(
            spotify_id=profile_info['id'],
            display_name=profile_info['display_name'],
            email=profile_info.get('email'),
            profile_url=profile_info['external_urls']['spotify'],
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=expires_at
        )
        db.session.add(user)
        db.session.commit()
    
    # Store user ID in session
    session['user_id'] = user.id
    session['spotify_id'] = user.spotify_id
    session['display_name'] = user.display_name
    session['profile_url'] = user.profile_url
    
    return redirect('/')

@auth_bp.route('/refresh-token')
def refresh_token():
    if 'user_id' not in session:
        return redirect('/login')
    
    user = User.query.get(session['user_id'])
    
    if not user or not user.refresh_token:
        return redirect('/login')
    
    # Check if token is still valid
    if user.token_expires_at and datetime.utcnow() < user.token_expires_at:
        return redirect('/')
    
    token_info = SpotifyService.refresh_access_token(user.refresh_token)
    
    if 'error' in token_info:
        return redirect('/login')
    
    # Update user tokens
    expires_at = datetime.utcnow() + timedelta(seconds=token_info['expires_in'])
    user.update_tokens(token_info['access_token'], expires_at=expires_at)
    
    return redirect('/')

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect('/')
