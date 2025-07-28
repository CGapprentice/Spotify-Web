from flask import Blueprint, session, jsonify, redirect
from datetime import datetime
from services.spotify import SpotifyService
from utils.auth import require_auth

api_bp = Blueprint('api', __name__)

@api_bp.route('/saved-albums')
@require_auth
def saved_albums():
    albums = SpotifyService.get_saved_albums(session['access_token'])
    return jsonify(albums)

@api_bp.route('/album-tracks/<album_id>')
@require_auth
def album_tracks(album_id):
    tracks = SpotifyService.get_album_tracks(session['access_token'], album_id)
    
    if 'error' in tracks:
        return jsonify(tracks), 500
    
    return jsonify(tracks)
