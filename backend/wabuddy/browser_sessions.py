"""Persistent browser capabilities. Raw browser tokens never enter the database."""
import hashlib
import secrets
import sqlite3
import time

LIFETIME = 90 * 86400


class BrowserSessions:
    def __init__(self, root):
        root.mkdir(parents=True, exist_ok=True)
        self.path = root / 'browsers.sqlite3'
        with sqlite3.connect(self.path) as db:
            db.execute('CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, csrf TEXT, expires REAL, slot TEXT, owner TEXT)')

    @staticmethod
    def key(token):
        return hashlib.sha256(token.encode()).hexdigest()

    def get(self, token):
        with sqlite3.connect(self.path, timeout=20) as db:
            row = db.execute('SELECT csrf,expires,slot,owner FROM sessions WHERE token=? AND expires>?', (self.key(token),time.time())).fetchone()
        return row

    def save(self, token, entry):
        with sqlite3.connect(self.path, timeout=20) as db:
            db.execute('INSERT OR REPLACE INTO sessions VALUES(?,?,?,?,?)', (self.key(token),*entry))

    def create(self, slot, owner):
        token = secrets.token_urlsafe(32)
        entry = (secrets.token_urlsafe(32), time.time()+LIFETIME, slot, owner)
        self.save(token, entry)
        return token, entry

    def visitor_count(self):
        with sqlite3.connect(self.path, timeout=20) as db:
            return db.execute("SELECT COUNT(DISTINCT owner) FROM sessions WHERE owner!='local' AND expires>?", (time.time(),)).fetchone()[0]
