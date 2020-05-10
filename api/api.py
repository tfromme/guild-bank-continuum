import sqlite3
import datetime
from contextlib import contextmanager

from flask import Flask, request, jsonify
app = Flask(__name__)


@app.route('/getPlayers', methods=['GET'])
def getPlayers():
    with getDb() as db:
        rows = {row['guid']: dict(row) for row in db.execute('SELECT * FROM players')}

    mains = {}
    alts = {}

    for row in rows.values():
        if row['mainId'] is None:
            mains[row['name']] = {k: row[k] for k in ('points',)}
        else:
            alts[row['name']] = rows[row['mainId']]['name']

    return jsonify({'mains': mains, 'alts': alts})


@app.route('/setPoints', methods=['POST'])
def setPoints():
    data = request.get_json()['points']
    with getDb() as db:
        playercache = [row['name'] for row in db.execute('SELECT * FROM players')]
        for player, points in data.items():
            if player in playercache:
                db.execute('UPDATE players SET points=? WHERE name=?', (points, player))
            else:
                db.execute('INSERT INTO players (name, points) VALUES (?, ?)', (player, points))

    return '', 204


@app.route('/addAlts', methods=['POST'])
def addAlts():
    data = request.get_json()['alts']
    with getDb() as db:
        playercache = {row['name']: row['guid'] for row in db.execute('SELECT * FROM players')}
        for alt, main in data.items():
            db.execute('INSERT INTO players (name, mainId) VALUES (?, ?)', (alt, playercache[main]))

    return '', 204


@app.route('/getStorage', methods=['GET'])
def getStorage():
    with getDb() as db:
        rows = [dict(row) for row in db.execute('SELECT * FROM storage')]

    organized = {}
    for row in rows:
        organized[row['itemId']][row['character']] = organized.setdefault(row['itemId'], {}).setdefault(row['character'], 0) + row['count']

    return jsonify(organized)


@app.route('/updateStorage', methods=['POST'])
def updateStorage():
    data = request.get_json()
    bags = data['bags']
    bank = data.get('bank', None)
    character = data['character']

    with getDb() as db:
        if bank is None:
            db.execute('DELETE FROM storage WHERE character=? AND location!=?', (character, 'bank'))
        else:
            db.execute('DELETE FROM storage WHERE character=?', (character,))

        for itemId, count in bags.items():
            db.execute('INSERT INTO storage (itemId, count, location, character) values (?, ?, ?, ?)', (itemId, count, 'bags', character))

        if bank is not None:
            for itemId, count in bank.items():
                db.execute('INSERT INTO storage (itemId, count, location, character) values (?, ?, ?, ?)', (itemId, count, 'bank', character))

    return '', 204


@app.route('/getItems', methods=['GET'])
def getItems():
    with getDb() as db:
        return jsonify([dict(row) for row in db.execute('SELECT * FROM items')])


@app.route('/addTransactions', methods=['POST'])
def addTransactions():
    transactions = request.get_json()['transactions']
    today = int(datetime.date.today().strftime('%y%m%d'))
    with getDb() as db:
        for transaction in transactions:
            db.execute('INSERT INTO transactions (character, date, money, type) VALUES (?, ?, ?, ?)', (transaction['sender'], today, transaction['money'], transaction.get('type', 'test')))
            transactionId = db.lastrowid
            for itemId, count in transaction['items'].items():
                db.execute('INSERT INTO transactionItems (transactionId, itemId, count) values (?, ?, ?)', (transactionId, itemId, count))

    return '', 204


@app.route('/getTransactions', methods=['GET'])
def getTransactions():
    page = int(request.args.get('page', 1))
    pageSize = int(request.args.get('pageSize', 20))

    with getDb() as db:
        transactions = {row['guid']: dict(row) for row in db.execute('SELECT * FROM transactions ORDER BY guid DESC LIMIT ?, ?', ((page - 1) * pageSize, pageSize))}

        for transaction in transactions.values():
            del transaction['guid']
            transaction['items'] = {}

        idList = '(' + ','.join(map(str, transactions)) + ')'
        transactionItems = [dict(row) for row in db.execute('SELECT * FROM TransactionItems WHERE transactionId IN ' + idList)]

        for item in transactionItems:
            transactions[item['transactionId']]['items'][item['itemId']] = {'count': item['count'], 'points': item['points']}

    return jsonify(transactions)


@contextmanager
def getDb():
    conn = sqlite3.connect('gbc.db')
    conn.row_factory = sqlite3.Row
    db = conn.cursor()
    try:
        yield db
        conn.commit()
    finally:
        conn.close()
