from flask import Blueprint, request, jsonify, session
from app import db
from app.tables import Users, Friends

bp = Blueprint('friends', __name__, url_prefix = '/friends')

@bp.route('/list', method=['GET'])
def list_friends():
    # проверка авторизации
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401
    
    # сохраняем, что ищем по авторизованому пользователю
    current_user = session['username']

    # сохраняем всех пользователей, подходящих по параметру
    friends_records = Friends.query.filter_by(whosefriend = current_user).all()

    # сохраняем данные друзей, которых мы получили в запросе выше
    result = []
    for record in friends_records:
        friend_user = Users.query.get(record.friend)
        if friend_user:
            result.append({
                "username": friend_user.username,
                "name": friend_user.name,
                "birthday": friend_user.birthday.strftime('%Y-%m-%d') if friend_user.birthday else None
            })
    # выдаём необходимые данные
    return jsonify(result), 200

@bp.route('/add', methods=['POST'])
def add_friend():
    # проверка авторизации
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401
    
    # сохраняем пользователя
    current_user = session['username']

    # принимаем запрос от фронта и тут далее защиты от дурачья
    data = request.json
    if not data:
        return jsonify({"error": "Тело запроса не должно быть пустым"}), 400
    
    friend_username = data.get('friend_username')
    if not friend_username:
        return jsonify({"error": "Не указан логин друга"}), 400
    if friend_username == current_user:
        return jsonify({"error": "Нельзя добавить себя в друзья"}), 400
    friend_user = Users.query.get(friend_username)
    if not friend_user:
        return jsonify({"error": f"Пользователь '{friend_username}' не найден"}), 404
    existing = Friends.query.filter_by(
        whosefriend=current_user,
        friend=friend_username
    ).first()
    if existing:
        return jsonify({"error": f"'{friend_username}' уже у вас в друзьях"}), 409
    
    # создаём записи о дружеской связи
    friend1 = Friends(
        whosefriend=current_user,
        friend=friend_username
    )
    db.session.add(friend1)
    friend2 = Friends(
        whosefriend=friend_username,
        friend=current_user
    )
    db.session.add(friend2)
    db.session.commit()
    
    # отправляем ответ фронту о том, что всё готов
    return jsonify({
        "message": "Друг добавлен",
        "friend": friend_username
    }), 201

@bp.route('/remove/<string:friend_username>', methods=['DELETE'])
def remove_friend(friend_username):
    
    # проверяем авторизацию
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401
    
    # сохраняем пользователя и мне надоело уже одно и тоже в комментах писать....
    current_user = session['username']

    # ищем записи
    friendship1 = Friends.query.filter_by(
        whosefriend=current_user,
        friend=friend_username
    ).first()
    friendship2 = Friends.query.filter_by(
        whosefriend=friend_username,
        friend=current_user
    ).first()

    # проверки на дурака
    if not friendship1 and not friendship2:
        return jsonify({"error": "Этот пользователь не в друзьях"}), 404
    if friendship1:
        db.session.delete(friendship1)
        print(f"Удалена запись: {friendship1.whosefriend} → {friendship1.friend}")
    if friendship2:
        db.session.delete(friendship2)
        print(f"Удалена запись: {friendship2.whosefriend} → {friendship2.friend}")
    db.session.commit()

    
    # отправляем ответ фронту
    return jsonify({
        "message": "Друг удалён",
        "friend": friend_username
    }), 200