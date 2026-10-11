"""Installation-wide, durable AI budgets, including retries and scheduled work."""
import json
import sqlite3
import time

PROMPT_LIMIT = 4000
MAX_CONVERSATIONS = 5
MODEL_HOURLY_LIMIT = 200
MODEL_DAILY_LIMIT = 1000


class UsageLimit(ValueError):
    pass


class UsageBudget:
    def __init__(self, root):
        root.mkdir(parents=True, exist_ok=True)
        self.path = root / 'usage.sqlite3'
        with sqlite3.connect(self.path) as db:
            db.execute('CREATE TABLE IF NOT EXISTS usage(kind TEXT, run TEXT, stamp REAL)')
            db.execute('CREATE INDEX IF NOT EXISTS usage_time ON usage(kind,stamp)')
            db.execute('CREATE TABLE IF NOT EXISTS ai_workspaces(scope TEXT PRIMARY KEY, expires REAL)')

    def capacity(self, scope, acquire=False):
        now = time.time()
        with sqlite3.connect(self.path, timeout=20) as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM ai_workspaces WHERE expires<?',(now,))
            existing = db.execute('SELECT 1 FROM ai_workspaces WHERE scope=?',(scope,)).fetchone()
            count = db.execute('SELECT COUNT(*) FROM ai_workspaces').fetchone()[0]
            available = bool(existing) or count < 100
            if acquire and available:
                db.execute('INSERT OR REPLACE INTO ai_workspaces VALUES(?,?)',(scope,now+1800))
            return {'available':available,'limit':100,'active':count,'workers':3,
                    'message':'' if available else 'AI capacity is full. WhatsApp chat remains available. Try AI again later.'}

    def reserve(self, kind, run, scope=''):
        now = time.time()
        with sqlite3.connect(self.path, timeout=20) as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM usage WHERE stamp < ?', (now-86400,))
            periods = [(600, 120), (86400, 400)] if kind == 'goal' else [(3600, MODEL_HOURLY_LIMIT), (86400, MODEL_DAILY_LIMIT)]
            for seconds, maximum in periods:
                count = db.execute('SELECT COUNT(*) FROM usage WHERE kind=? AND stamp>?', (kind,now-seconds)).fetchone()[0]
                if count >= maximum:
                    label = 'requests' if kind == 'goal' else 'AI calls'
                    raise UsageLimit(f'Usage limit reached: {maximum} {label} per {seconds//60} minutes. Try again after the budget resets.')
            if kind == 'model' and db.execute('SELECT COUNT(*) FROM usage WHERE kind=? AND run=?', (kind,run)).fetchone()[0] >= 16:
                raise UsageLimit('This task reached its 16 AI-call limit. Narrow the request before starting a new task.')
            db.execute('INSERT INTO usage VALUES(?,?,?)', (kind,run,now))
            if kind == 'goal':
                for seconds, maximum in [(600,20),(86400,100)]:
                    if db.execute('SELECT COUNT(*) FROM usage WHERE kind=? AND stamp>?',('workspace:'+scope,now-seconds)).fetchone()[0] >= maximum:
                        raise UsageLimit(f'This workspace allows {maximum} requests per {seconds//60} minutes. WhatsApp chat remains available.')
                db.execute('INSERT INTO usage VALUES(?,?,?)',('workspace:'+scope,run,now))

    def model_call(self, job, scope):
        if len(json.dumps(job['payload'], ensure_ascii=False)) > 80000:
            raise UsageLimit('This task exceeds the 80,000-character AI context limit. Narrow the conversation scope.')
        if not self.capacity(scope,acquire=True)['available']:
            raise UsageLimit('AI capacity is full. WhatsApp chat remains available. Retry later.')
        self.reserve('model', job['run'])
