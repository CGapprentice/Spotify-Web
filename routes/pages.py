from flask import Blueprint, render_template, session, redirect
from datetime import datetime
from utils.auth import is_authenticated

pages_bp = Blueprint('pages', __name__)

@pages_bp.route('/')
def index():
    logged_in = is_authenticated()
    display_name = session.get('display_name')
    profile_url = session.get('profile_url')
    
    return render_template('index.html', 
                         logged_in=logged_in, 
                         display_name=display_name, 
                         profile_url=profile_url)

@pages_bp.route('/albums')
def albums_page():
    if not is_authenticated():
        return redirect('/login')
    
    display_name = session.get('display_name')
    profile_url = session.get('profile_url')
    
    return render_template('albums.html', 
                         logged_in=True, 
                         display_name=display_name, 
                         profile_url=profile_url)

@pages_bp.route('/album-songs')
def album_songs_page():
    if not is_authenticated():
        return redirect('/login')
    
    display_name = session.get('display_name')
    profile_url = session.get('profile_url')
    
    return render_template('album_songs.html', 
                         logged_in=True, 
                         display_name=display_name, 
                         profile_url=profile_url)

@pages_bp.route('/search')
def search_page():
    if not is_authenticated():
        return redirect('/login')
    
    display_name = session.get('display_name')
    profile_url = session.get('profile_url')
    
    return render_template('search.html', 
                         logged_in=True, 
                         display_name=display_name, 
                         profile_url=profile_url)

@pages_bp.route('/artist/<artist_id>')
def artist_page(artist_id):
    if not is_authenticated():
        return redirect('/login')
    
    display_name = session.get('display_name')
    profile_url = session.get('profile_url')
    
    return render_template('artist.html', 
                         logged_in=True, 
                         display_name=display_name, 
                         profile_url=profile_url,
                         artist_id=artist_id)
