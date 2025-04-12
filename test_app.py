# test_app.py

import unittest
from unittest.mock import patch, MagicMock
from main import app

class SpotifyAppTestCase(unittest.TestCase):

    # Set up the test client
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('spotify_helpers.get_saved_albums')
    def test_saved_albums_route(self, mock_get_saved_albums):
        # Mock Spotify response data
        mock_response_data = {
            "items": [
                {
                    "album": {
                        "name": "Album Name",
                        "artists": [{"name": "Artist Name"}],
                        "images": [{"url": "http://image.url"}]
                    }
                }
            ]
        }
        
        # Configure the mock to return a response with mock data
        mock_get_saved_albums.return_value = mock_response_data

        # Mock session to contain 'access_token'
        with self.app.session_transaction() as session:
            session['access_token'] = 'mock_access_token'

        # Make a request to the /saved-albums route
        response = self.app.get('/saved-albums')
        data = response.get_json()

        # Assertions to verify response
        self.assertEqual(response.status_code, 200)
        self.assertIn('items', data)
        self.assertEqual(data['items'][0]['album']['name'], "Album Name")
        self.assertEqual(data['items'][0]['album']['artists'][0]['name'], "Artist Name")
        self.assertEqual(data['items'][0]['album']['images'][0]['url'], "http://image.url")

    def tearDown(self):
        pass

if __name__ == '__main__':
    unittest.main()
