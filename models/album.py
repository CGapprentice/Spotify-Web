from . import db
from datetime import datetime

class Album(db.Model):
    __tablename__ = 'albums'
    
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    artist_name = db.Column(db.String(200), nullable=False)
    artist_spotify_id = db.Column(db.String(50))
    image_url = db.Column(db.String(500))
    release_date = db.Column(db.String(20))
    total_tracks = db.Column(db.Integer)
    album_type = db.Column(db.String(20))
    genres = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tracks = db.relationship('Track', backref='album', lazy=True, cascade='all, delete-orphan')
    album_sessions = db.relationship('AlbumSession', backref='album', lazy=True)
    
    def __repr__(self):
        return f'<Album {self.name} by {self.artist_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'spotify_id': self.spotify_id,
            'name': self.name,
            'artist_name': self.artist_name,
            'artist_spotify_id': self.artist_spotify_id,
            'image_url': self.image_url,
            'release_date': self.release_date,
            'total_tracks': self.total_tracks,
            'album_type': self.album_type,
            'genres': self.genres
        }
    
    @staticmethod
    def find_by_spotify_id(spotify_id):
        return Album.query.filter_by(spotify_id=spotify_id).first()
    
    @staticmethod
    def create_from_spotify_data(album_data):
        album = Album(
            spotify_id=album_data['id'],
            name=album_data['name'],
            artist_name=album_data['artists'][0]['name'] if album_data['artists'] else '',
            artist_spotify_id=album_data['artists'][0]['id'] if album_data['artists'] else None,
            image_url=album_data['images'][0]['url'] if album_data['images'] else None,
            release_date=album_data.get('release_date', ''),
            total_tracks=album_data.get('total_tracks', 0),
            album_type=album_data.get('album_type', 'album'),
            genres=album_data.get('genres', [])
        )
        db.session.add(album)
        db.session.commit()
        return album
    
    def get_user_ratings(self, user_id):
        from .rating import Rating
        ratings = Rating.query.filter_by(
            user_id=user_id, 
            album_spotify_id=self.spotify_id
        ).all()
        return {rating.track_spotify_id: rating.rating for rating in ratings}
    
    def get_average_rating(self, user_id):
        from .rating import Rating
        from sqlalchemy import func
        
        avg_rating = db.session.query(func.avg(Rating.rating)).filter_by(
            user_id=user_id,
            album_spotify_id=self.spotify_id
        ).scalar()
        
        return round(float(avg_rating), 1) if avg_rating else 0
