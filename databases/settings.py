class Settings:
    SECRET_KEY = 'hackathon-secret-key' # чтоб заработало
    SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/birthday.db' # где создать базу данных и какую
    SQLALCHEMY_TRACK_MODIFICATIONS = False # замедляет работу если не отключить, но хз
    # там вроде может быть проблема с сохранением изменений в данных
    # потому ещё подумаю над этим оставить ли false или заменить на true

    DEBUG = True # переключить на False перед отправкой на сервер и демонстрацией