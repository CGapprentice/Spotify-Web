import requests


def get_saved_albums(access_token, limit=50):
    """
    Fetches all saved albums of a Spotify user by handling pagination.
    Requires an access token with the `user-library-read` scope.
    """
    all_albums = {"items": []}
    url = "https://api.spotify.com/v1/me/albums"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    params = {
        "limit": limit,
        "offset": 0
    }
    
    while True:
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            return {"error": response.json()}
        
        data = response.json()
        all_albums["items"].extend(data["items"])
        
        # Check if there are more items to fetch
        if data["next"] is None:
            break
            
        # Update offset for the next request
        params["offset"] += limit
    
    return all_albums