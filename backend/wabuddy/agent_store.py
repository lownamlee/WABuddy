"""Private durable agent queue. Separate from the fictional UI workspace."""
from contextlib import contextmanager
import json
import sqlite3
import time
import threading
import uuid


def encode(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False)


class AgentStore:
    def __init__(self, root):
        root.mkdir(parents=True, exist_ok=True)
        self.root = root
        self.path = root / 'agents.sqlite3'
        self.local = threading.local()
        with self.db() as db:
            db.executescript('''
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS documents(ns TEXT,kind TEXT,id TEXT,body TEXT,
                    PRIMARY KEY(ns,kind,id));
                CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,ns TEXT,run TEXT,kind TEXT,
                    status TEXT,payload TEXT,result TEXT,lease TEXT,expires REAL,created REAL,error TEXT);
                CREATE INDEX IF NOT EXISTS jobs_account ON jobs(ns,status,created);
            ''')
            columns={row[1] for row in db.execute('PRAGMA table_info(jobs)')}
            for name in ('started','finished'):
                if name not in columns:
                    db.execute(f'ALTER TABLE jobs ADD COLUMN {name} REAL DEFAULT 0')

    @contextmanager
    def db(self):
        existing = getattr(self.local, 'connection', None)
        if existing is not None:
            yield existing
            return
        db = sqlite3.connect(self.path, timeout=20)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    @contextmanager
    def atomic(self):
        """Publish a completion and its dependent tasks in the same transaction."""
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            self.local.connection = db
            try:
                yield
            finally:
                self.local.connection = None

    def get(self, ns, kind, key, default=None):
        with self.db() as db:
            row = db.execute('SELECT body FROM documents WHERE ns=? AND kind=? AND id=?', (ns,kind,key)).fetchone()
        return json.loads(row[0]) if row else default

    def put(self, ns, kind, key, value):
        with self.db() as db:
            db.execute('INSERT OR REPLACE INTO documents VALUES(?,?,?,?)', (ns,kind,key,encode(value)))

    def list(self, ns, kind):
        with self.db() as db:
            rows = db.execute('SELECT body FROM documents WHERE ns=? AND kind=? ORDER BY rowid DESC', (ns,kind)).fetchall()
        return [json.loads(r[0]) for r in rows]

    def enqueue(self, ns, run, kind, payload, key=None):
        key = key or uuid.uuid4().hex
        with self.db() as db:
            db.execute('INSERT OR IGNORE INTO jobs(id,ns,run,kind,status,payload,result,lease,expires,created,error) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
                       (key,ns,run,kind,'queued',encode(payload),'{}','',0,time.time(),''))
        return key

    def jobs(self, ns, run=None):
        with self.db() as db:
            rows = db.execute('SELECT * FROM jobs WHERE ns=? AND (? IS NULL OR run=?) ORDER BY created', (ns,run,run)).fetchall()
        return [self.decode(row) for row in rows]

    @staticmethod
    def decode(row):
        return {**dict(row), 'payload': json.loads(row['payload']), 'result': json.loads(row['result'])}

    def claim(self, ns):
        now = time.time()
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute("SELECT * FROM jobs WHERE ns=? AND (status='queued' OR (status='working' AND expires<?)) ORDER BY created LIMIT 1", (ns,now)).fetchone()
            if not row:
                return None
            lease = uuid.uuid4().hex
            db.execute("UPDATE jobs SET status='working',lease=?,expires=?,started=? WHERE id=?", (lease,now+300,now,row['id']))
            return {**self.decode(row), 'status':'working','lease':lease,'expires':now+300}

    def leased(self, ns, job_id, lease):
        with self.db() as db:
            row = db.execute('SELECT * FROM jobs WHERE ns=? AND id=?', (ns,job_id)).fetchone()
        if not row or row['lease'] != lease:
            raise ValueError('Job lease is invalid for this account.')
        if row['status'] == 'done':
            return self.decode(row)
        if row['status'] != 'working' or row['expires'] < time.time():
            raise ValueError('Job lease expired. Claim again before completing it.')
        return self.decode(row)

    def finish(self, ns, job_id, lease, result):
        self.leased(ns,job_id,lease)
        with self.db() as db:
            db.execute("UPDATE jobs SET status='done',result=?,error='',finished=? WHERE id=? AND ns=? AND lease=?", (encode(result),time.time(),job_id,ns,lease))

    def fail(self, ns, job_id, lease, error):
        self.leased(ns,job_id,lease)
        with self.db() as db:
            db.execute("UPDATE jobs SET status='failed',error=?,finished=? WHERE ns=? AND id=? AND lease=?", (error[:1000],time.time(),ns,job_id,lease))

    def retry(self, ns, run):
        with self.db() as db:
            db.execute("UPDATE jobs SET status='queued',lease='',expires=0,error='' WHERE ns=? AND run=? AND status='failed'", (ns,run))
