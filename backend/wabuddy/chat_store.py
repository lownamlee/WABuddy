"""Private, account-scoped chat cache and durable send idempotency ledger."""
from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from contextlib import contextmanager
import phonenumbers


def display_phone(jid):
    raw='+'+jid.split('@')[0].split(':')[0]
    try:
        return phonenumbers.format_number(phonenumbers.parse(raw),phonenumbers.PhoneNumberFormat.INTERNATIONAL)
    except phonenumbers.NumberParseException:
        return raw


class ChatStore:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with self.db() as db:
            db.executescript('''
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS chats(account TEXT,jid TEXT,name TEXT NOT NULL DEFAULT '',
                    PRIMARY KEY(account,jid));
                CREATE TABLE IF NOT EXISTS messages(account TEXT,chat TEXT,id TEXT,sender TEXT,
                    text TEXT,outgoing INTEGER,ts REAL,status TEXT,PRIMARY KEY(account,chat,id));
                CREATE INDEX IF NOT EXISTS message_order ON messages(account,chat,ts);
                CREATE TABLE IF NOT EXISTS outbox(account TEXT,token TEXT,chat TEXT,text TEXT,
                    status TEXT,result TEXT,PRIMARY KEY(account,token));
                CREATE TABLE IF NOT EXISTS receipts(account TEXT,chat TEXT,id TEXT,status TEXT,
                    PRIMARY KEY(account,chat,id));
                CREATE TABLE IF NOT EXISTS message_aliases(account TEXT,chat TEXT,event_id TEXT,message_id TEXT,
                    PRIMARY KEY(account,chat,event_id));
                CREATE TABLE IF NOT EXISTS reactions(account TEXT,chat TEXT,message_id TEXT,actor TEXT,
                    emoji TEXT,ts REAL,PRIMARY KEY(account,chat,message_id,actor));
            ''')
            columns = {r[1] for r in db.execute('PRAGMA table_info(chats)')}
            for column, kind in [('push_name', "TEXT DEFAULT ''"), ('about', "TEXT DEFAULT ''"), ('photo', 'BLOB'), ('photo_version', 'INTEGER DEFAULT 0'), ('metadata', "TEXT DEFAULT '{}'")]:
                if column not in columns:
                    db.execute(f'ALTER TABLE chats ADD COLUMN {column} {kind}')
            columns = {r[1] for r in db.execute('PRAGMA table_info(messages)')}
            if 'extra' not in columns:
                db.execute("ALTER TABLE messages ADD COLUMN extra TEXT DEFAULT '{}'")
            for _ in range(3):
                db.execute('UPDATE messages SET ts=ts/1000 WHERE ts>100000000000')
            # The old single-emoji cache did not identify the reacting participant.
            # Recover ownership only where a completed command proves it was ours.
            if not db.execute("SELECT 1 FROM meta WHERE key='reaction_migration'").fetchone():
                for row in db.execute("SELECT * FROM outbox WHERE status='sent' ORDER BY rowid"):
                    try:
                        action=json.loads(row['text'])
                        if isinstance(action,list) and len(action)==3 and action[0]=='react':
                            db.execute('INSERT OR REPLACE INTO reactions VALUES(?,?,?,?,?,?)',(row['account'],row['chat'],action[1],row['account'],action[2],0))
                    except (ValueError,TypeError):
                        pass
                db.execute("INSERT INTO meta VALUES('reaction_migration','1')")

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def account(self):
        with self.db() as db:
            row = db.execute("SELECT value FROM meta WHERE key='account'").fetchone()
            return row[0] if row else ''

    def activate(self, jid, name):
        with self.db() as db:
            for key, value in [('account', jid), ('name', name)]:
                db.execute('INSERT OR REPLACE INTO meta VALUES(?,?)', (key, value))

    def deactivate(self):
        with self.db() as db:
            db.execute("DELETE FROM meta WHERE key IN ('account','name')")

    def contact(self, jid, name='', account=None, *, push_name=None, authoritative=False):
        account = account or self.account()
        if not account or not jid or jid.endswith('@broadcast'):
            return
        with self.db() as db:
            db.execute('INSERT INTO chats(account,jid,name) VALUES(?,?,?) ON CONFLICT(account,jid) DO UPDATE SET name=CASE WHEN excluded.name != \'\' OR ? THEN excluded.name ELSE chats.name END', (account,jid,name,authoritative))
            if push_name is not None:
                db.execute('UPDATE chats SET push_name=? WHERE account=? AND jid=?',(push_name,account,jid))

    def chat_metadata(self, jid, **fields):
        self.contact(jid)
        with self.db() as db:
            row = db.execute('SELECT metadata FROM chats WHERE account=? AND jid=?', (self.account(), jid)).fetchone()
            metadata = json.loads(row[0] or '{}') if row else {}
            metadata.update(fields)
            db.execute('UPDATE chats SET metadata=? WHERE account=? AND jid=?', (json.dumps(metadata), self.account(), jid))

    def profile(self, jid, about=None, photo=None):
        with self.db() as db:
            if about is not None:
                db.execute('UPDATE chats SET about=? WHERE account=? AND jid=?',(about,self.account(),jid))
            if photo is not None:
                db.execute('UPDATE chats SET photo=?,photo_version=photo_version+1 WHERE account=? AND jid=?',(photo,self.account(),jid))

    def photo(self, jid):
        with self.db() as db:
            row = db.execute('SELECT photo FROM chats WHERE account=? AND jid=?',(self.account(),jid)).fetchone()
            return row[0] if row else None

    def get_message(self, chat, id):
        with self.db() as db:
            row = db.execute('SELECT * FROM messages WHERE account=? AND chat=? AND id=?',(self.account(),chat,id)).fetchone()
            if not row:
                raise ValueError('Message is not in the synchronized conversation.')
            return dict(row)

    def has_message(self, chat, id):
        with self.db() as db:
            return db.execute('SELECT 1 FROM messages WHERE account=? AND chat=? AND id=?',(self.account(),chat,id)).fetchone() is not None

    def update_message(self, chat, id, *, text=None, **extra):
        with self.db() as db:
            old = self.get_message(chat,id)
            metadata = {**json.loads(old['extra'] or '{}'),**extra}
            db.execute('UPDATE messages SET text=?,extra=? WHERE account=? AND chat=? AND id=?',
                       (old['text'] if text is None else text,json.dumps(metadata),self.account(),chat,id))

    def reaction(self, chat, message_id, actor, emoji, timestamp):
        stamp=float(timestamp)
        while stamp>100_000_000_000:
            stamp/=1000
        with self.db() as db:
            db.execute('''INSERT INTO reactions VALUES(?,?,?,?,?,?)
                ON CONFLICT(account,chat,message_id,actor) DO UPDATE SET emoji=excluded.emoji,ts=excluded.ts
                WHERE excluded.ts>=reactions.ts''',(self.account(),chat,message_id,actor,emoji,stamp))

    def message(self, chat, id, text, outgoing, ts, sender='', name='', status=None, account=None):
        account = account or self.account()
        if not account or not id or not chat or chat.endswith('@broadcast'):
            return
        self.contact(chat, account=account, push_name=name or None)
        # Native callbacks and history use different timestamp units across SDK versions.
        ts = float(ts)
        while ts > 100_000_000_000:
            ts /= 1000
        with self.db() as db:
            # Echo/history replays must not downgrade a delivered/read receipt.
            db.execute('''INSERT INTO messages(account,chat,id,sender,text,outgoing,ts,status) VALUES(?,?,?,?,?,?,?,?)
                ON CONFLICT(account,chat,id) DO UPDATE SET text=CASE
                    WHEN json_extract(messages.extra,'$.edited') OR json_extract(messages.extra,'$.deleted')
                    THEN messages.text ELSE excluded.text END''',
                (account,chat,id,sender,text,int(outgoing),ts,status or ('sent' if outgoing else 'received')))
            early = db.execute('SELECT status FROM receipts WHERE account=? AND chat=? AND id=?',(account,chat,id)).fetchone()
            if early and outgoing:
                db.execute("UPDATE messages SET status=? WHERE account=? AND chat=? AND id=? AND status!='read'",(early[0],account,chat,id))

    def link_message_event(self, chat, event_id, message_id):
        """An edit has its own transport ID, but its receipts belong to the visible message."""
        if not event_id or event_id == message_id:
            return
        with self.db() as db:
            if db.execute('SELECT 1 FROM message_aliases WHERE account=? AND chat=? AND event_id=?', (self.account(),chat,event_id)).fetchone():
                return
            db.execute('INSERT OR REPLACE INTO message_aliases VALUES(?,?,?,?)', (self.account(),chat,event_id,message_id))
            # WhatsApp starts a new delivery/read cycle for the edited revision.
            db.execute("UPDATE messages SET status='sent',extra=json_remove(extra,'$.readAt','$.deliveredAt') WHERE account=? AND chat=? AND id=? AND outgoing=1", (self.account(),chat,message_id))
            early = db.execute('SELECT status FROM receipts WHERE account=? AND chat=? AND id=?', (self.account(),chat,event_id)).fetchone()
        if early:
            self.receipt(chat,[message_id],early['status'])

    def receipt(self, chat, ids, status, timestamp=None, own_read=False):
        ranks = {'sent': 0, 'delivered': 1, 'read': 2}
        with self.db() as db:
            for id in ids:
                alias = db.execute('SELECT message_id FROM message_aliases WHERE account=? AND chat=? AND event_id=?', (self.account(),chat,id)).fetchone()
                if alias:
                    id = alias['message_id']
                if own_read:
                    db.execute("UPDATE messages SET status='read' WHERE account=? AND chat=? AND id=? AND outgoing=0",(self.account(),chat,id))
                    continue
                previous = db.execute('SELECT status FROM receipts WHERE account=? AND chat=? AND id=?',(self.account(),chat,id)).fetchone()
                if not previous or ranks.get(status,-1)>ranks.get(previous[0],-1):
                    db.execute('INSERT OR REPLACE INTO receipts VALUES(?,?,?,?)',(self.account(),chat,id,status))
                row = db.execute('SELECT status FROM messages WHERE account=? AND chat=? AND id=? AND outgoing=1', (self.account(),chat,id)).fetchone()
                if row and ranks.get(status, -1) > ranks.get(row[0], -1):
                    db.execute('UPDATE messages SET status=? WHERE account=? AND chat=? AND id=?', (status,self.account(),chat,id))
                if row and timestamp:
                    stamp=float(timestamp)
                    while stamp>100_000_000_000:
                        stamp/=1000
                    db.execute("UPDATE messages SET extra=json_set(extra,?,?) WHERE account=? AND chat=? AND id=?",('$.'+status+'At',stamp*1000,self.account(),chat,id))

    def snapshot(self):
        account = self.account()
        if not account:
            return {'account': None, 'chats': [], 'contacts':[], 'messages': {}}
        with self.db() as db:
            name = db.execute("SELECT value FROM meta WHERE key='name'").fetchone()
            chats = db.execute('''SELECT c.jid,c.name,c.push_name,c.about,c.photo_version,c.metadata,MAX(m.ts) AS latest FROM chats c
                LEFT JOIN messages m ON m.account=c.account AND m.chat=c.jid
                WHERE c.account=? GROUP BY c.jid ORDER BY (latest IS NOT NULL) DESC,COALESCE(json_extract(c.metadata,'$.isCommunity'),0) DESC,latest DESC,c.name LIMIT 500''', (account,)).fetchall()
            result, messages = [], {}
            for chat in chats:
                rows = db.execute('SELECT * FROM messages WHERE account=? AND chat=? ORDER BY ts DESC LIMIT 200', (account,chat['jid'])).fetchall()
                items = [{'id':r['id'],'text':r['text'],'outgoing':bool(r['outgoing']), 'sentAt':r['ts']*1000,'status':r['status'], 'senderJid':r['sender'],**json.loads(r['extra'] or '{}')} for r in reversed(rows)]
                jid = chat['jid']
                meta = json.loads(chat['metadata'] or '{}')
                label = chat['name'] or (display_phone(jid) if jid.endswith('@s.whatsapp.net') else jid.split('@')[0])
                reaction_rows=db.execute('SELECT * FROM reactions WHERE account=? AND chat=? AND emoji!=\'\' ORDER BY ts',(account,jid)).fetchall()
                for item in items:
                    sender = db.execute('SELECT name,push_name FROM chats WHERE account=? AND jid=?', (account,item['senderJid'])).fetchone()
                    item['sender'] = (sender['name'] or ('~'+sender['push_name'] if sender['push_name'] else ('Participant' if item['senderJid'].endswith('@lid') else display_phone(item['senderJid'])))) if sender else (('Participant' if item['senderJid'].endswith('@lid') else display_phone(item['senderJid'])) if item['senderJid'] else '')
                    if not jid.endswith('@g.us') or item['outgoing']: item['sender'] = ''
                    item['reactions']=[{'actor':r['actor'],'emoji':r['emoji'],'at':r['ts']*1000,'mine':r['actor']==account,'name':'You' if r['actor']==account else label if r['actor']==jid else display_phone(r['actor'])} for r in reaction_rows if r['message_id']==item['id']]
                    item['reaction']=next((r['emoji'] for r in item['reactions'] if r['mine']),None)
                    reply=item.get('reply')
                    if reply:
                        quoted=next((m for m in items if m['id']==reply['id']),None)
                        own=reply.get('senderJid')==account or (quoted and quoted['outgoing']) or reply.get('sender')=='You'
                        reply['sender']='You' if own else label
                        reply['pushName']='' if own or chat['name'] else chat['push_name']
                        if jid.endswith('@g.us') and not own:
                            participant=(quoted or {}).get('senderJid') or reply.get('senderJid','')
                            person=db.execute('SELECT name,push_name FROM chats WHERE account=? AND jid=?',(account,participant)).fetchone()
                            reply['sender']=(person['name'] or display_phone(participant)) if person else ('Participant' if not participant or participant.endswith('@lid') else display_phone(participant))
                            reply['pushName']=person['push_name'] if person and not person['name'] else ''
                preview=items[-1]['text'] if items else ''
                preview_type='message'
                latest=(chat['latest'] or 0)*1000
                recent=reaction_rows[-1] if reaction_rows else None
                # A legacy reaction has no known event time. Do not invent chronology.
                if recent and recent['ts']*1000>=latest:
                    target=next((m for m in items if m['id']==recent['message_id']),None)
                    if target:
                        preview=f"{'You' if recent['actor']==account else label} reacted {recent['emoji']} to: \"{target['text']}\""
                        preview_type='reaction'
                result.append({'id':jid,'name':label,'pushName':chat['push_name'],'savedContact':bool(chat['name']), 'phone':jid.split('@')[0],'formattedPhone':display_phone(jid), 'type':'self' if jid==account else 'group' if jid.endswith('@g.us') else 'person', 'avatar':'initial','initial':label[:1], 'photoVersion':chat['photo_version'], 'preview':preview,'previewType':preview_type, 'lastMessageAt':latest,'outgoing':bool(items and items[-1]['outgoing'] and preview_type=='message'), 'lastStatus':items[-1]['status'] if items else '', 'hasConversation':bool(items), 'unread':meta.get('unread',0), 'unreadKnown':'unread' in meta,'about':chat['about'],**{k:v for k,v in meta.items() if k!='unread'}})
                if jid.endswith('@g.us') and items and not items[-1]['outgoing'] and items[-1].get('sender'):
                    result[-1]['preview'] = items[-1]['sender']+': '+result[-1]['preview']
                messages[jid] = items
            return {'account':{'id':account,'name':name[0] if name else '', 'formattedPhone':display_phone(account), 'photoVersion':next((c['photoVersion'] for c in result if c['id']==account),0), 'about':next((c['about'] for c in result if c['id']==account),'')},'chats':sorted([c for c in result if c['hasConversation'] or c.get('archived') or c.get('pinned')],key=lambda c:(bool(c.get('pinned')),c.get('pinOrder',0),c['lastMessageAt']),reverse=True),'contacts':result,'messages':messages}

    def reserve_send(self, token, chat, text):
        account = self.account()
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            old = db.execute('SELECT * FROM outbox WHERE account=? AND token=?', (account,token)).fetchone()
            if old:
                if old['chat'] != chat or old['text'] != text:
                    raise ValueError('Request ID was already used for another message.')
                return dict(old)
            if not db.execute('SELECT 1 FROM chats WHERE account=? AND jid=?',(account,chat)).fetchone():
                raise ValueError('Choose a synchronized chat before sending.')
            db.execute('INSERT INTO outbox VALUES(?,?,?,?,?,?)',(account,token,chat,text,'pending','{}'))
        return None

    def finish_send(self, token, status, result):
        with self.db() as db:
            db.execute('UPDATE outbox SET status=?,result=? WHERE account=? AND token=?',(status,json.dumps(result),self.account(),token))
