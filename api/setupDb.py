import sqlite3

if __name__ == '__main__':
    conn = sqlite3.connect('gbc.db')
    c = conn.cursor()

    c.execute('CREATE TABLE items (itemId integer primary key, name text)')
    c.execute('CREATE TABLE storage (guid integer primary key, itemId integer, count integer, location text, character text)')
    c.execute('CREATE TABLE transactions (guid integer primary key, character text, date integer, money integer, type text)')
    c.execute('CREATE TABLE transactionItems (guid integer primary key, transactionId integer, itemId integer, count integer, FOREIGN KEY(transactionId) REFERENCES transactions(guid))')
    c.execute('CREATE TABLE players (guid integer primary key, name text UNIQUE, mainId integer, points real)')
