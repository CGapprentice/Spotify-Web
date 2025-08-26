from . import db
from datetime import datetime

class Track(db.Model):
    __tablename__ = 'tracks'
    
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False)
    album_id = db.Column(db.Integer, db.ForeignKey('albums.id'), nullable=False)
    album_spotify_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    artist_name = db.Column(db.String(200))
    track_number = db.Column(db.Integer)
    duration_ms = db.Column(db.Integer)
    preview_url = db.Column(db.String(500))
    explicit = db.Column(db.Boolean, default=False)
    is_playable = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    ratings = db.relationship('Rating', backref='track', lazy=True)
    
    def __repr__(self):
        return f'<Track {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'spotify_id': self.spotify_id,
            'album_spotify_id': self.album_spotify_id,
            'name': self.name,
            'artist_name': self.artist_name,
            'track_number': self.track_number,
            'duration_ms': self.duration_ms,
            'preview_url': self.preview_url,
            'explicit': self.explicit,
            'is_playable': self.is_playable
        }
    
    @staticmethod
    def find_by_spotify_id(spotify_id):
        return Track.query.filter_by(spotify_id=spotify_id).first()
    
    @staticmethod
    def create_from_spotify_data(track_data, album_id, album_spotify_id):
        track = Track(
            spotify_id=track_data['id'],
            album_id=album_id,
            album_spotify_id=album_spotify_id,
            name=track_data['name'],
            artist_name=track_data['artists'][0]['name'] if track_data['artists'] else '',
            track_number=track_data.get('track_number', 0),
            duration_ms=track_data.get('duration_ms', 0),
            preview_url=track_data.get('preview_url'),
            explicit=track_data.get('explicit', False),
            is_playable=track_data.get('is_playable', True)
        )
        db.session.add(track)
        db.session.commit()
        return track
    
    def get_user_rating(self, user_id):
        from .rating import Rating
        rating = Rating.query.filter_by(
            user_id=user_id,
            track_spotify_id=self.spotify_id
        ).first()
        return rating.rating if rating else None
    
    def format_duration(self):
        if not self.duration_ms:
            return "0:00"
        minutes = self.duration_ms // 60000
        seconds = (self.duration_ms % 60000) // 1000
        return f"{minutes}:{seconds:02d}"
