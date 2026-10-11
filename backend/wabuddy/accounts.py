"""Private local account slots; switching never logs a connector out."""
from __future__ import annotations

import json
import re
import secrets
import threading

from .pairing import PairingService
from .chat_store import display_phone


class AccountRegistry:
    def __init__(self, legacy: PairingService):
        self.root = legacy.data_dir
        self.path = self.root / 'accounts.json'
        self.lock = threading.RLock()
        self.services = {'default': legacy}
        self.opened = set()
        self.entries = {'default': {'label': 'Original account', 'mode': 'business'}}
        self.selected = 'default'
        if self.path.exists():
            saved = json.loads(self.path.read_text(encoding='utf-8'))
            for key, entry in saved['accounts'].items():
                if key == 'default' or re.fullmatch(r'[a-f0-9]{24}', key):
                    self.entries[key] = {'label': str(entry['label'])[:60], 'mode': 'business' if entry.get('mode') == 'business' else 'standard', 'owner': entry.get('owner','local')}
            if saved.get('selected') in self.entries:
                self.selected = saved['selected']

    def save(self):
        self.root.mkdir(parents=True, exist_ok=True)
        temp = self.path.with_suffix('.tmp')
        temp.write_text(json.dumps({'selected': self.selected, 'accounts': self.entries}), encoding='utf-8')
        temp.replace(self.path)

    def get(self, slot):
        with self.lock:
            if slot not in self.entries:
                raise ValueError('Account not found.')
            if slot not in self.services:
                self.services[slot] = PairingService(self.root / 'accounts' / slot,
                                                   worker_factory=self.services['default'].worker_factory)
            service = self.services[slot]
            if slot not in self.opened:
                service.open()
                self.opened.add(slot)
            return service

    def open(self):
        self.get('default')  # Preserve ownership of the original app/session folder.
        self.get(self.selected)

    def close(self):
        for service in self.services.values():
            service.close()

    def add(self, label, mode, owner='local'):
        with self.lock:
            maximum = 10 if owner == 'local' else 1
            if sum(e.get('owner','local') == owner for e in self.entries.values()) >= maximum:
                raise ValueError(f'Up to {maximum} accounts can be saved in this browser workspace.')
            if len(self.entries) >= 1010:
                raise ValueError('The server account capacity has been reached.')
            slot = secrets.token_hex(12)
            self.entries[slot] = {'label': label.strip() or 'New account', 'mode': mode, 'owner':owner}
            self.save()
            return slot

    def select(self, slot):
        with self.lock:
            self.get(slot)
            self.selected = slot
            self.save()

    def allowed(self, slot, owner):
        return slot in self.entries and self.entries[slot].get('owner','local') == owner

    def listing(self, selected, owner='local'):
        from .chat_store import ChatStore
        with self.lock:
            result = []
            for slot, entry in self.entries.items():
                if not self.allowed(slot,owner):
                    continue
                service = self.services.get(slot)
                chats = service.chats if service else ChatStore(self.root / 'accounts' / slot / 'chats.sqlite3')
                jid = chats.account()
                with chats.db() as db:
                    row = db.execute("SELECT value FROM meta WHERE key='name'").fetchone()
                result.append({'id': slot, 'label':entry['label'], 'mode':entry['mode'], 'name': row[0] if row else '',
                               'phone': display_phone(jid) if jid else '',
                               'linked': bool(jid), 'status': service.snapshot()['status'] if service else 'saved'})
            return {'selected': selected, 'accounts': result, 'max_accounts':10 if owner=='local' else 1, 'operator':owner=='local'}
