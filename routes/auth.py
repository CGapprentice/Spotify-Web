from flask import Blueprint, request, session, redirect, jsonify
from datetime import datetime
import requests
import urllib.parse
from config import Config
from services.spotify import SpotifyService

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
    
    session['access_token'] = token_info['access_token']
    session['refresh_token'] = token_info['refresh_token']
    session['expires_at'] = datetime.now().timestamp() + token_info['expires_in']
    
    profile_info = SpotifyService.get_user_profile(session['access_token'])
    
    if 'error' in profile_info:
        return jsonify({"error": "Failed to get user profile"})
    
    session['display_name'] = profile_info['display_name']
    session['profile_url'] = profile_info['external_urls']['spotify']
    
    return redirect('/')

@auth_bp.route('/refresh-token')
def refresh_token():
    if 'refresh_token' not in session:
        return redirect('/login')
    
    if datetime.now().timestamp() <= session.get('expires_at', 0):
        return redirect('/')
    
    token_info = SpotifyService.refresh_access_token(session['refresh_token'])
    
    if 'error' in token_info:
        return redirect('/login')
    
    session['access_token'] = token_info['access_token']
    session['expires_at'] = datetime.now().timestamp() + token_info['expires_in']
    
    return redirect('/')
