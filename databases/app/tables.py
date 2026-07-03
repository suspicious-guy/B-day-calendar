from datetime import datetime, date
from app import db
from sqlalchemy import func

class Users(db.Model):
    __tablename__ = "users"

    username = db.Column(db.String(15), primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(67), nullable=False)
    birthday = db.Column(db.Date, nullable=False)

    # для отладки
    def __repr__(self):
        return f'<User {self.username}>'

class Friends(db.Model):
    __tablename__ = "friends"

    whosefriend = db.Column(db.String(15), db.ForeignKey('users.username'), primary_key=True)
    friend = db.Column(db.String(15), db.ForeignKey('users.username'), primary_key=True)

    # для отладки
    def __repr__(self):
        return f'<Friend {self.whosefriend} -> {self.friend}>'

class Gifts(db.Model):
    __tablename__ = "gifts"

    user = db.Column(db.String(15), db.ForeignKey('users.username'), primary_key=True)
    gift = db.Column(db.String(50), primary_key=True)

    # для отладки
    def __repr__(self):
        return f'<Gift {self.gift} for {self.user}>'

class Groups(db.Model):
    __tablename__ = 'groups'
    
    name = db.Column(db.String(50), primary_key=True)

    # для отладки
    def __repr__(self):
        return f'<Group {self.name}>'

class GroupMembers(db.Model):
    __tablename__ = 'group_members'
    
    group_name = db.Column(db.String(50), db.ForeignKey('groups.name'), primary_key=True)
    user_username = db.Column(db.String(15), db.ForeignKey('users.username'), primary_key=True)

    # для отладки
    def __repr__(self):
        return f'<GroupMember {self.user_username} in {self.group_name}>'
    
class Chats(db.Model):
    __tablename__ = 'chats'
    
    birthday_person = db.Column(db.String(15), db.ForeignKey('users.username'), primary_key=True)
    
    # для отладки
    def __repr__(self):
        return f'<Chat for {self.birthday_person}>'
    
class ChatMembers(db.Model):
    __tablename__ = 'chat_members'
    
    birthday_person = db.Column(db.String(15), db.ForeignKey('chats.birthday_person'), primary_key=True)
    member_username = db.Column(db.String(15), db.ForeignKey('users.username'), primary_key=True)
    
    # для отладки
    def __repr__(self):
        return f'<ChatMember {self.member_username} in chat for {self.birthday_person}>'
    
class Messages(db.Model):
    __tablename__ = 'messages'
    
    birthday_person = db.Column(db.String(15), db.ForeignKey('chats.birthday_person'), primary_key=True)
    author = db.Column(db.String(15), db.ForeignKey('users.username'), primary_key=True)
    date = db.Column(db.Date, primary_key=True, default=date.today)
    time = db.Column(db.Time, primary_key=True, default=func.now())
    text = db.Column(db.Text, nullable=False)
    
    # для отладки
    def __repr__(self):
        return f'<Message in chat for {self.birthday_person} from {self.author} at {self.date} {self.time}>'