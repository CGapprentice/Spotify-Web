from . import db
from datetime import datetime

class AlbumSession(db.Model):
    __tablename__ = 'album_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    album_id = db.Column(db.Integer, db.ForeignKey('albums.id'))
    album_spotify_id = db.Column(db.String(50), nullable=False)
    total_tracks = db.Column(db.Integer)
    rated_tracks = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Float)
    is_completed = db.Column(db.Boolean, default=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('user_id', 'album_spotify_id', name='unique_user_album_session'),
    )
    
    def __repr__(self):
        return f'<AlbumSession {self.album_spotify_id} - {self.completion_percentage}% complete>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'album_spotify_id': self.album_spotify_id,
            'total_tracks': self.total_tracks,
            'rated_tracks': self.rated_tracks,
            'average_rating': round(self.average_rating, 2) if self.average_rating else None,
            'is_completed': self.is_completed,
            'completion_percentage': self.completion_percentage,
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'last_activity': self.last_activity.isoformat()
        }
    
    @property
    def completion_percentage(self):
        if not self.total_tracks or self.total_tracks == 0:
            return 0
        return round((self.rated_tracks / self.total_tracks) * 100, 1)
    
    @staticmethod
    def get_or_create(user_id, album_spotify_id, total_tracks):
        session = AlbumSession.query.filter_by(
            user_id=user_id,
            album_spotify_id=album_spotify_id
        ).first()
        
        if not session:
            session = AlbumSession(
                user_id=user_id,
                album_spotify_id=album_spotify_id,
                total_tracks=total_tracks
            )
            db.session.add(session)
            db.session.commit()
        
        return session
    
    def update_progress(self):
        from .rating import Rating
        from sqlalchemy import func
        
        # Count rated tracks
        rated_count = Rating.query.filter_by(
            user_id=self.user_id,
            album_spotify_id=self.album_spotify_id
        ).count()
        
        # Calculate average rating
        avg_rating = db.session.query(func.avg(Rating.rating)).filter_by(
            user_id=self.user_id,
            album_spotify_id=self.album_spotify_id
        ).scalar()
        
        self.rated_tracks = rated_count
        self.average_rating = round(float(avg_rating), 2) if avg_rating else None
        self.last_activity = datetime.utcnow()
        
        # Check if completed
        if self.total_tracks and rated_count >= self.total_tracks:
            self.is_completed = True
            if not self.completed_at:
                self.completed_at = datetime.utcnow()
        
        db.session.commit()
        return self
    
    @staticmethod
    def get_user_sessions(user_id, completed_only=False):
        query = AlbumSession.query.filter_by(user_id=user_id)
        if completed_only:
            query = query.filter_by(is_completed=True)
        return query.order_by(AlbumSession.last_activity.desc()).all()
    
    @staticmethod
    def get_user_stats(user_id):
        from sqlalchemy import func
        
        stats = db.session.query(
            func.count(AlbumSession.id).label('total_sessions'),
            func.count(AlbumSession.id).filter(AlbumSession.is_completed == True).label('completed_sessions'),
            func.avg(AlbumSession.average_rating).label('overall_average')
        ).filter(AlbumSession.user_id == user_id).first()
        
        return {
            'total_sessions': stats.total_sessions or 0,
            'completed_sessions': stats.completed_sessions or 0,
            'overall_average': round(float(stats.overall_average), 2) if stats.overall_average else 0
        }
