import requests

def get_saved_albums(access_token):
    """
    Fetches the saved albums of a Spotify user.
    Requires an access token with the `user-library-read` scope.
    """
    url = "https://api.spotify.com/v1/me/albums"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()  # Return album data if successful
    else:
        return {"error": response.json()}  # Return error message if not successful