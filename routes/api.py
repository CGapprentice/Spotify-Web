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

@api_bp.route('/search')
@require_auth
def search():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', '20'))
    
    if not query:
        return jsonify({'artists': []})
    
    access_token = get_user_access_token()
    
    # Enhanced search with better exact matching
    artists = []
    
    # For short queries (like "Cher", "Res"), try exact match first
    if len(query.strip()) <= 4 or not query.strip().endswith('*'):
        exact_query = f'artist:"{query}"'
        exact_results = SpotifyService.search(access_token, exact_query, 'artist', limit, 0)
        
        if not exact_results.get('error') and exact_results.get('artists', {}).get('items'):
            artists.extend(exact_results['artists']['items'])
    
    # If we don't have enough results, try regular fuzzy search
    if len(artists) < limit:
        remaining_limit = limit - len(artists)
        fuzzy_results = SpotifyService.search(access_token, query, 'artist', remaining_limit, 0)
        
        if not fuzzy_results.get('error') and fuzzy_results.get('artists', {}).get('items'):
            # Avoid duplicates by checking IDs
            existing_ids = {artist['id'] for artist in artists}
            for artist in fuzzy_results['artists']['items']:
                if artist['id'] not in existing_ids and len(artists) < limit:
                    artists.append(artist)
    
    # If still no results, try one more search without field qualifier
    if not artists:
        fallback_results = SpotifyService.search(access_token, query, 'artist', limit, 0)
        if not fallback_results.get('error'):
            artists = fallback_results.get('artists', {}).get('items', [])
    
    simplified_artists = []
    for artist in artists[:limit]:  # Ensure we don't exceed limit
        artist_data = {
            'id': artist['id'],
            'name': artist['name'],
            'images': artist['images'],
            'popularity': artist['popularity'],
            'followers': artist['followers']['total'],
            'genres': artist['genres'],
            'external_urls': artist['external_urls']
        }
        simplified_artists.append(artist_data)
    
    # Sort results to prioritize exact matches and popular artists
    def sort_key(artist):
        name_lower = artist['name'].lower()
        query_lower = query.lower().strip()
        
        if name_lower == query_lower:
            return (0, -artist['popularity'])
        
        # Starts with query gets second priority
        if name_lower.startswith(query_lower):
            return (1, -artist['popularity'])
        
        # Contains query gets third priority
        if query_lower in name_lower:
            return (2, -artist['popularity'])
        
        # Everything else sorted by popularity
        return (3, -artist['popularity'])
    
    simplified_artists.sort(key=sort_key)
    
    return jsonify({
        'artists': simplified_artists,
        'total': len(simplified_artists)
    })

@api_bp.route('/artist/<artist_id>/albums')
@require_auth
def get_artist_albums_api(artist_id):
    access_token = get_user_access_token()
    albums_data = SpotifyService.get_artist_albums(access_token, artist_id)
    
    if 'error' in albums_data:
        return jsonify(albums_data), 500
    
    return jsonify(albums_data)

@api_bp.route('/album/<album_id>')
@require_auth
def get_album_details(album_id):
    access_token = get_user_access_token()
    album_details = SpotifyService.get_album_details(access_token, album_id)
    
    if 'error' in album_details:
        return jsonify(album_details), 500
    
    return jsonify(album_details)

@api_bp.route('/artist/<artist_id>/info')
@require_auth
def get_artist_info(artist_id):
    access_token = get_user_access_token()
    artist_info = SpotifyService.get_artist_info(access_token, artist_id)
    
    if 'error' in artist_info:
        return jsonify(artist_info), 500
    
    return jsonify(artist_info)
