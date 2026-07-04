from flask import Blueprint, request, jsonify, session
from app import db
from app.tables import Users, Groups, GroupMembers

bp = Blueprint('groups', __name__, url_prefix='/groups')

@bp.route('/all', methods=['GET'])
def get_all_groups():
    
    all_groups = Groups.query.all()
    result = [{"name": g.name} for g in all_groups]

    return jsonify(result), 200

@bp.route('/user/<string:username>', methods=['GET'])
def get_user_groups(username):
    # Проверяем, существует ли пользователь в БД
    user = Users.query.get(username)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    # Получаем группы пользователя
    groups = GroupMembers.query.filter_by(user_username=username).all()
    group_names = [g.group_name for g in groups]

    return jsonify({
        "username": username,
        "groups": group_names
    }), 200

@bp.route('/create', methods=['POST'])
def create_group():
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401

    current_user = session['username']

    data = request.json

    # проверки на дурачьё, далее в коде будут такие же
    if not data:
        return jsonify({"error": "Тело запроса не должно быть пустым"}), 400
    group_name = data.get('name')
    if not group_name:
        return jsonify({"error": "Не указано название группы"}), 400
    existing_group = Groups.query.get(group_name)
    if existing_group:
        return jsonify({"error": "Группа с таким названием уже существует"}), 409

    new_group = Groups(name=group_name)
    db.session.add(new_group)

    membership = GroupMembers(
        group_name=group_name,
        user_username=current_user
    )
    db.session.add(membership)
    db.session.commit()

    return jsonify({
        "message": "Группа создана",
        "group": group_name
    }), 201

@bp.route('/join', methods=['POST'])
def join_group():
    
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401

    current_user = session['username']
    data = request.json

    if not data:
        return jsonify({"error": "Тело запроса не должно быть пустым"}), 400
    group_name = data.get('group_name')
    if not group_name:
        return jsonify({"error": "Не указано название группы"}), 400
    group = Groups.query.get(group_name)
    if not group:
        return jsonify({"error": "Группа не найдена"}), 404
    existing = GroupMembers.query.filter_by(
        group_name=group_name,
        user_username=current_user
    ).first()
    if existing:
        return jsonify({"error": "Вы уже состоите в этой группе"}), 409

    membership = GroupMembers(
        group_name=group_name,
        user_username=current_user
    )
    db.session.add(membership)
    db.session.commit()

    return jsonify({
        "message": "Вы вступили в группу",
        "group": group_name
    }), 200

@bp.route('/leave', methods=['POST'])
def leave_group():
    
    if 'username' not in session:
        return jsonify({"error": "Не авторизован"}), 401

    current_user = session['username']
    data = request.json

    if not data:
        return jsonify({"error": "Тело запроса не должно быть пустым"}), 400
    group_name = data.get('group_name')
    if not group_name:
        return jsonify({"error": "Не указано название группы"}), 400
    group = Groups.query.get(group_name)
    if not group:
        return jsonify({"error": "Группа не найдена"}), 404
    membership = GroupMembers.query.filter_by(
        group_name=group_name,
        user_username=current_user
    ).first()
    if not membership:
        return jsonify({"error": "Вы не состоите в этой группе"}), 404

    db.session.delete(membership)
    db.session.commit()

    return jsonify({
        "message": "Вы вышли из группы",
        "group": group_name
    }), 200