from . import db
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from .rating import Rating

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    profile_url = db.Column(db.String(200))
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    token_expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    
    # Relationships
    ratings = db.relationship('Rating', backref='user', lazy=True, cascade='all, delete-orphan')
    album_sessions = db.relationship('AlbumSession', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.display_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'spotify_id': self.spotify_id,
            'display_name': self.display_name,
            'email': self.email,
            'profile_url': self.profile_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def find_by_spotify_id(spotify_id):
        return User.query.filter_by(spotify_id=spotify_id).first()
    
    def update_tokens(self, access_token, refresh_token=None, expires_at=None):
        self.access_token = access_token
        if refresh_token:
            self.refresh_token = refresh_token
        if expires_at:
            self.token_expires_at = expires_at
        self.updated_at = datetime.now(timezone.utc)
        db.session.commit()
    
    def get_rating_stats(self):
        from sqlalchemy import func
        stats = db.session.query(
            func.count(Rating.id).label('total_ratings'),
            func.avg(Rating.rating).label('average_rating'),
            func.count(db.distinct(Rating.album_spotify_id)).label('albums_rated')
        ).filter(Rating.user_id == self.id).first()
        
        return {
            'total_ratings': stats.total_ratings or 0,
            'average_rating': round(float(stats.average_rating), 2) if stats.average_rating else 0,
            'albums_rated': stats.albums_rated or 0
        }
