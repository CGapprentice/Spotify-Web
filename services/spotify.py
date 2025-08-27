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
    
    @staticmethod
    def play_track(access_token, track_uri, device_id=None):
        url = f"{Config.API_BASE_URL}me/player/play"
        headers = SpotifyService.get_auth_header(access_token)
        headers['Content-Type'] = 'application/json'
        
        params = {}
        if device_id:
            params['device_id'] = device_id
        
        data = {"uris": [track_uri]}
        
        response = requests.put(url, headers=headers, json=data, params=params)
        
        if response.status_code not in [200, 204]:
            error_detail = response.json() if response.content else "Playback failed"
            return {"error": error_detail}
        
        return {"success": True}
    
    @staticmethod
    def transfer_playback(access_token, device_id):
        url = f"{Config.API_BASE_URL}me/player"
        headers = SpotifyService.get_auth_header(access_token)
        headers['Content-Type'] = 'application/json'
        
        data = {
            "device_ids": [device_id],
            "play": False
        }
        
        response = requests.put(url, headers=headers, json=data)
        
        if response.status_code not in [200, 204]:
            error_detail = response.json() if response.content else "Transfer failed"
            return {"error": error_detail}
        
        return {"success": True}
    
    @staticmethod
    def search(access_token, query, search_type='album,artist', limit=20, offset=0):
        url = f"{Config.API_BASE_URL}search"
        headers = SpotifyService.get_auth_header(access_token)
        
        params = {
            'q': query,
            'type': search_type,
            'limit': limit,
            'offset': offset,
            'market': 'US'
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        return response.json()
    
    @staticmethod
    def get_artist_albums(access_token, artist_id, limit=15):
        url = f"{Config.API_BASE_URL}artists/{artist_id}/albums"
        headers = SpotifyService.get_auth_header(access_token)
        
        params = {
            'include_groups': 'album,single',
            'market': 'US',
            'limit': limit
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        return response.json()
    
    @staticmethod
    def get_album_details(access_token, album_id):
        url = f"{Config.API_BASE_URL}albums/{album_id}"
        headers = SpotifyService.get_auth_header(access_token)
        params = {'market': 'US'}
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        return response.json()
    
    @staticmethod
    def get_artist_info(access_token, artist_id):
        url = f"{Config.API_BASE_URL}artists/{artist_id}"
        headers = SpotifyService.get_auth_header(access_token)
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        return response.json()
