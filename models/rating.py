from . import db
from datetime import datetime

class Rating(db.Model):
    __tablename__ = 'ratings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('tracks.id'))
    track_spotify_id = db.Column(db.String(50), nullable=False)
    album_spotify_id = db.Column(db.String(50), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('user_id', 'track_spotify_id', name='unique_user_track_rating'),
        db.CheckConstraint('rating >= 1 AND rating <= 10', name='rating_range'),
    )
    
    def __repr__(self):
        return f'<Rating {self.rating}/10 for track {self.track_spotify_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'track_spotify_id': self.track_spotify_id,
            'album_spotify_id': self.album_spotify_id,
            'rating': self.rating,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def get_or_create(user_id, track_spotify_id, album_spotify_id, rating):
        existing_rating = Rating.query.filter_by(
            user_id=user_id,
            track_spotify_id=track_spotify_id
        ).first()
        
        if existing_rating:
            existing_rating.rating = rating
            existing_rating.updated_at = datetime.utcnow()
            db.session.commit()
            return existing_rating
        else:
            new_rating = Rating(
                user_id=user_id,
                track_spotify_id=track_spotify_id,
                album_spotify_id=album_spotify_id,
                rating=rating
            )
            db.session.add(new_rating)
            db.session.commit()
            return new_rating
    
    @staticmethod
    def get_user_album_ratings(user_id, album_spotify_id):
        ratings = Rating.query.filter_by(
            user_id=user_id,
            album_spotify_id=album_spotify_id
        ).all()
        return {rating.track_spotify_id: rating.rating for rating in ratings}
    
    @staticmethod
    def get_album_average(user_id, album_spotify_id):
        from sqlalchemy import func
        avg_rating = db.session.query(func.avg(Rating.rating)).filter_by(
            user_id=user_id,
            album_spotify_id=album_spotify_id
        ).scalar()
        return round(float(avg_rating), 1) if avg_rating else 0
    
    @staticmethod
    def delete_user_album_ratings(user_id, album_spotify_id):
        Rating.query.filter_by(
            user_id=user_id,
            album_spotify_id=album_spotify_id
        ).delete()
        db.session.commit()
