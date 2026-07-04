from flask import Blueprint, request, jsonify, session
from app import db
from app.tables import Users, Gifts, Friends

bp = Blueprint('gifts', __name__, url_prefix='/gifts')

@bp.route('/<string:username>', methods=['GET'])
def get_user_gifts(username):
    # Проверяем, существует ли пользователь в БД
    user = Users.query.get(username)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    # Получаем подарки
    gifts = Gifts.query.filter_by(user=username).all()
    result = [{"gift": g.gift} for g in gifts]

    return jsonify({
        "username": username,
        "gifts": result
    }), 200

@bp.route('/add', methods=['POST'])
def add_gift():
    
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401

    current_user = session['username']
    data = request.json

    if not data:
        return jsonify({"error": "Тело запроса не должно быть пустым"}), 400
    gift_name = data.get('gift')
    if not gift_name:
        return jsonify({"error": "Не указан подарок"}), 400
    existing = Gifts.query.filter_by(
        user=current_user,
        gift=gift_name
    ).first()
    if existing:
        return jsonify({"error": "Такой подарок уже есть в вашем списке"}), 409

    new_gift = Gifts(
        user=current_user,
        gift=gift_name
    )
    db.session.add(new_gift)
    db.session.commit()

    return jsonify({
        "message": "Подарок добавлен",
        "gift": gift_name
    }), 201

@bp.route('/remove/<string:gift_name>', methods=['DELETE'])
def remove_gift(gift_name):
    
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401

    current_user = session['username']

    if not gift_name:
        return jsonify({"error": "Не указан подарок"}), 400
    gift = Gifts.query.filter_by(
        user=current_user,
        gift=gift_name
    ).first()
    if not gift:
        return jsonify({"error": "Такого подарка нет в вашем списке"}), 404

    db.session.delete(gift)
    db.session.commit()

    return jsonify({
        "message": "Подарок удалён",
        "gift": gift_name
    }), 200