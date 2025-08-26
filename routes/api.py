from flask import Blueprint, session, jsonify, redirect, request
from datetime import datetime
from services.spotify import SpotifyService
from utils.auth import require_auth, get_current_user, get_user_access_token
from models.rating import Rating
from models.album import Album
from models.track import Track
from models.album_session import AlbumSession
from models import db

api_bp = Blueprint('api', __name__)

@api_bp.route('/saved-albums')
@require_auth
def saved_albums():
    access_token = get_user_access_token()
    albums = SpotifyService.get_saved_albums(access_token)
    return jsonify(albums)

@api_bp.route('/album-tracks/<album_id>')
@require_auth
def album_tracks(album_id):
    user = get_current_user()
    access_token = get_user_access_token()
    
    # Get tracks from Spotify
    tracks_data = SpotifyService.get_album_tracks(access_token, album_id)
    
    if 'error' in tracks_data:
        return jsonify(tracks_data), 500
    
    # Get or create album session
    album_session = AlbumSession.get_or_create(
        user.id, 
        album_id, 
        len(tracks_data.get('items', []))
    )
    
    # Get existing ratings for this album
    existing_ratings = Rating.get_user_album_ratings(user.id, album_id)
    
    # Add ratings to track data
    for track in tracks_data.get('items', []):
        track['user_rating'] = existing_ratings.get(track['id'])
    
    # Add session info
    tracks_data['session_info'] = album_session.to_dict()
    
    return jsonify(tracks_data)

@api_bp.route('/rate-track', methods=['POST'])
@require_auth
def rate_track():
    user = get_current_user()
    data = request.get_json()
    
    track_id = data.get('track_id')
    album_id = data.get('album_id')
    rating = data.get('rating')
    
    if not all([track_id, album_id, rating]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if not (1 <= rating <= 10):
        return jsonify({'error': 'Rating must be between 1 and 10'}), 400
    
    # Save rating
    rating_obj = Rating.get_or_create(user.id, track_id, album_id, rating)
    
    # Update album session progress
    album_session = AlbumSession.get_or_create(user.id, album_id, 0)
    album_session.update_progress()
    
    return jsonify({
        'success': True,
        'rating': rating_obj.to_dict(),
        'session': album_session.to_dict()
    })

@api_bp.route('/album-ratings/<album_id>')
@require_auth
def get_album_ratings(album_id):
    user = get_current_user()
    
    ratings = Rating.get_user_album_ratings(user.id, album_id)
    average = Rating.get_album_average(user.id, album_id)
    
    return jsonify({
        'ratings': ratings,
        'average': average,
        'total_rated': len(ratings)
    })

@api_bp.route('/get-token')
@require_auth
def get_token():
    access_token = get_user_access_token()
    return jsonify({'access_token': access_token})

@api_bp.route('/play-track', methods=['POST'])
@require_auth
def play_track():
    access_token = get_user_access_token()
    data = request.get_json()
    track_uri = data.get('track_uri')
    device_id = data.get('device_id')
    
    result = SpotifyService.play_track(access_token, track_uri, device_id)
    return jsonify(result)

@api_bp.route('/transfer-playback', methods=['POST'])
@require_auth
def transfer_playback():
    access_token = get_user_access_token()
    data = request.get_json()
    device_id = data.get('device_id')
    
    result = SpotifyService.transfer_playback(access_token, device_id)
    return jsonify(result)

@api_bp.route('/user-stats')
@require_auth
def user_stats():
    user = get_current_user()
    
    rating_stats = user.get_rating_stats()
    session_stats = AlbumSession.get_user_stats(user.id)
    
    return jsonify({
        'user': user.to_dict(),
        'rating_stats': rating_stats,
        'session_stats': session_stats
    })
