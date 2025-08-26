from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def init_db(app):
    db.init_app(app)
    migrate.init_app(app, db)
    
    from .user import User
    from .album import Album
    from .track import Track
    from .rating import Rating
    from .album_session import AlbumSession
    
    return db
