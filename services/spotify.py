import requests
from datetime import datetime
from config import Config

class SpotifyService:
    @staticmethod
    def get_auth_header(access_token):
        return {"Authorization": f"Bearer {access_token}"}
    
    @staticmethod
    def get_saved_albums(access_token, limit=50):
        all_albums = {"items": []}
        url = f"{Config.API_BASE_URL}me/albums"
        headers = SpotifyService.get_auth_header(access_token)
        params = {"limit": limit, "offset": 0}
        
        while True:
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code != 200:
                return {"error": response.json()}
            
            data = response.json()
            all_albums["items"].extend(data["items"])
            
            if data["next"] is None:
                break
                
            params["offset"] += limit
        
        return all_albums
    
    @staticmethod
    def get_album_tracks(access_token, album_id):
        url = f"{Config.API_BASE_URL}albums/{album_id}/tracks"
        headers = SpotifyService.get_auth_header(access_token)
        params = {"market": "US", "limit": 50}
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        return response.json()
    
    @staticmethod
    def get_user_profile(access_token):
        url = f"{Config.API_BASE_URL}me"
        headers = SpotifyService.get_auth_header(access_token)
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        return response.json()
    
    @staticmethod
    def refresh_access_token(refresh_token):
        req_body = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': Config.CLIENT_ID,
            'client_secret': Config.CLIENT_SECRET
        }
        
        response = requests.post(Config.TOKEN_URL, data=req_body)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        return response.json()
