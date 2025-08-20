from flask import Blueprint, session, jsonify, redirect, request
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

@api_bp.route('/get-token')
@require_auth
def get_token():
    return jsonify({'access_token': session['access_token']})

@api_bp.route('/play-track', methods=['POST'])
@require_auth
def play_track():
    data = request.get_json()
    track_uri = data.get('track_uri')
    device_id = data.get('device_id')
    
    result = SpotifyService.play_track(session['access_token'], track_uri, device_id)
    return jsonify(result)

@api_bp.route('/transfer-playback', methods=['POST'])
@require_auth
def transfer_playback():
    data = request.get_json()
    device_id = data.get('device_id')
    
    result = SpotifyService.transfer_playback(session['access_token'], device_id)
    return jsonify(result)
