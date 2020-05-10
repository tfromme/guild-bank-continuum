import json
import sqlite3

if __name__ == '__main__':
    conn = sqlite3.connect('gbc.db')
    c = conn.cursor()

    c.execute('CREATE TABLE items (itemId integer primary key, name text)')
    c.execute('CREATE TABLE storage (guid integer primary key, itemId integer, count integer, location text, character text)')
    c.execute('CREATE TABLE transactions (guid integer primary key, character text, date integer, money integer, type text)')
    c.execute('CREATE TABLE transactionItems (guid integer primary key, transactionId integer, itemId integer, count integer, points real, FOREIGN KEY(transactionId) REFERENCES transactions(guid))')
    c.execute('CREATE TABLE players (guid integer primary key, name text UNIQUE, mainId integer, points real)')
    c.execute('INSERT INTO items VALUES(1, "Gold")')

    with open('items.json') as f:
        item_dict = json.loads(f.read())

    for itemId, itemName in item_dict.items():
        c.execute('INSERT INTO items VALUES (?, ?)', (itemId, itemName))

    conn.commit()
    conn.close()
