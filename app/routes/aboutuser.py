from flask import Blueprint, jsonify
from app import db
from app.tables import Users, GroupMembers, Gifts

bp = Blueprint('users', __name__, url_prefix='/users')

@bp.route('/<string:username>', methods=['GET'])
def get_user_profile(username):

    # проверяем, существует ли пользователь
    user = Users.query.get(username)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    # получаем группы пользователя
    groups = GroupMembers.query.filter_by(user_username=username).all()
    group_names = [g.group_name for g in groups]

    # получаем подарки пользователя
    gifts = Gifts.query.filter_by(user=username).all()
    gift_list = [{"gift": g.gift} for g in gifts]

    # возвращаем всё вместе
    return jsonify({
        "username": user.username,
        "name": user.name,
        "birthday": user.birthday.strftime('%Y-%m-%d') if user.birthday else None,
        "groups": group_names,
        "gifts": gift_list
    }), 200