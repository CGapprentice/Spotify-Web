from dotenv import load_dotenv
import os
import base64
import json
import requests
import urllib.parse
from datetime import datetime
import calendar
from flask import Flask, redirect, request, jsonify, session, render_template
from spotify_helpers import get_saved_albums
# from spotify_helpers import get_saved_albums


app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv("SECRET_KEY")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = "http://localhost:3000/callback"

AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE_URL = "https://api.spotify.com/v1/"


@app.route('/')
def index():
    logged_in = 'access_token' in session and datetime.now().timestamp() < session['expires_at']
    display_name = session.get('display_name', None)
    profile_url = session.get('profile_url', None)
    return render_template('index.html', logged_in=logged_in, display_name=display_name, profile_url=profile_url)

@app.route('/login')
def login():
    scope = 'user-read-private user-read-email user-library-read'

    params = {
        'client_id': CLIENT_ID,
        'response_type': 'code',
        'scope': scope,
        'redirect_uri': REDIRECT_URI,
        'show_dialog': True #force user to login every time
    }

    auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    return redirect(auth_url)

@app.route('/callback')
def callback():
    if 'error' in request.args:
        return jsonify({"error": request.args['error']})
    
    if 'code' in request.args:
        req_body = {
            'code': request.args['code'],
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET
        }
    response = requests.post(TOKEN_URL, data=req_body)
    token_info = response.json()


    session['access_token'] = token_info['access_token']
    session['refresh_token'] = token_info['refresh_token']
    session['expires_at'] = datetime.now().timestamp() + token_info['expires_in']

    headers = {
        'Authorization': f"Bearer {session['access_token']}"
    }
    profile_response = requests.get(API_BASE_URL + 'me', headers=headers)
    profile_info = profile_response.json()
    print("Profile Info:", profile_info)

    session['display_name'] = profile_info['display_name']
    session['profile_url'] = profile_info['external_urls']['spotify']
    print("Profile url:", session['profile_url'])
    
    return redirect('/')


@app.route('/playlists')
def get_playlists():
    if 'access_token' not in session:
        return redirect('/login')
    if datetime.now().timestamp() > session['expires_at']:
        return redirect('/refresh-token')
    
    headers = {
        'Authorization': f"Bearer {session['access_token']}"
    }

    response = requests.get(API_BASE_URL + 'me/playlists', headers=headers)
    playlists = response.json()

    return jsonify(playlists)

@app.route('/artist/<artist_id>/albums')
def get_artist_albums(artist_id):
    # Check if the access token is in the session
    if 'access_token' not in session:
        return redirect('/login')
    
    # Prepare headers for the API call
    headers = {
        'Authorization': f"Bearer {session['access_token']}"
    }

    # Make the API call to fetch the artist's albums
    response = requests.get(f"{API_BASE_URL}artists/{"14Ah9L7Sei8VOOty0tZrOR"}/albums", headers=headers)
    
    if response.status_code == 200:
        albums_info = response.json()
        return jsonify(albums_info)
    else:
        return jsonify({"error": "Failed to retrieve artist's albums", "details": response.json()})


@app.route('/refresh-token')
def refresh_token():
    if 'refresh_token' not in session:
        return redirect('/login')
    
    if datetime.now().timestamp() > session['expires_at']:
        req_body = {
            'grant_type': 'refresh_token',
            'refresh_token': session['refresh_token'],
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET
        }
    response = requests.post(TOKEN_URL, data=req_body)
    new_token_info = response.json()

    session['access_token'] = new_token_info['access_token']
    session['expires_at'] = datetime.now().timestamp() + new_token_info['expires_in']

    return redirect('/')

    
@app.route('/saved-albums')
def saved_albums():
    if 'access_token' not in session:
        return redirect('/login')
    
    access_token = session['access_token']
    saved_albums = get_saved_albums(access_token)  # Call the helper function
    return jsonify(saved_albums)
    

@app.route('/albums')
def albums_page():
    logged_in = 'access_token' in session and datetime.now().timestamp() < session['expires_at']
    
    # If not logged in, redirect to login
    if not logged_in:
        return redirect('/login')
    
    display_name = session.get('display_name', None)
    profile_url = session.get('profile_url', None)
    
    return render_template('albums.html', logged_in=logged_in, display_name=display_name, profile_url=profile_url)

if __name__ == "__main__":
    app.run(debug=True, port=3000)







'''def get_token():
    auth_string = client_id + ":" + client_secret
    auth_bytes = auth_string.encode("utf-8")
    auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

    headers = {
        "Authorization" : "Basic " + auth_base64,
        "Content-Type" : "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    result = post(token_url, headers=headers, data=data)
    json_result = json.loads(result.content)
    token = json_result["access_token"]
    return token

def get_auth_header(token):
    return {"Authorization": "Bearer " + token}


token = get_token()
print(token)
    '''