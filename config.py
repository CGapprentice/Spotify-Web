import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    CLIENT_ID = os.getenv("CLIENT_ID")
    CLIENT_SECRET = os.getenv("CLIENT_SECRET")
    REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:3000/callback")
    
    # Spotify URLs
    AUTH_URL = "https://accounts.spotify.com/authorize"
    TOKEN_URL = "https://accounts.spotify.com/api/token"
    API_BASE_URL = "https://api.spotify.com/v1/"
    
    # Scopes
    SPOTIFY_SCOPE = 'user-read-private user-read-email user-library-read streaming user-read-playback-state user-modify-playback-state'
