"""Typed native controls and durable account-scoped operation receipts."""
from __future__ import annotations

import hashlib
import json
import time
from typing import Annotated, Literal

from fastapi import HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator

JID = Annotated[str, Field(pattern=r'^[0-9:-]+@(s\.whatsapp\.net|lid|g\.us)$', max_length=160)]
Person = Annotated[str, Field(pattern=r'^[0-9]+@s\.whatsapp\.net$', max_length=100)]
Group = Annotated[str, Field(pattern=r'^[0-9-]+@g\.us$', max_length=160)]
MediaID = Annotated[str, Field(pattern=r'^[a-f0-9]{48}$')]


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')


class ReadControl(Strict):
    operation: Literal['profile', 'groups', 'group', 'check_number']
    target: str = Field(default='', max_length=160)

    @model_validator(mode='after')
    def validate_target(self):
        import re
        if self.operation == 'group' and not re.fullmatch(r'[0-9-]+@g\.us', self.target):
            raise ValueError('Choose a group JID.')
        if self.operation == 'check_number' and not re.fullmatch(r'\+?[0-9]{7,15}', self.target):
            raise ValueError('Use an international phone number.')
        if self.operation in ('profile','groups') and self.target:
            raise ValueError('This read does not accept a target.')
        return self


class ProfileChange(Strict):
    operation: Literal['profile']
    field: Literal['display_name', 'about', 'photo']
    value: str = Field(min_length=1, max_length=139)

    @model_validator(mode='after')
    def validate_value(self):
        import re
        if not self.value.strip():
            raise ValueError('Enter a nonempty value.')
        if self.field == 'display_name' and len(self.value) > 25:
            raise ValueError('Display names support at most 25 characters.')
        if self.field == 'photo' and not re.fullmatch(r'[a-f0-9]{48}', self.value):
            raise ValueError('Upload the photo first and supply its media ID.')
        return self


class GroupChange(Strict):
    operation: Literal['group']
    group: Group
    field: Literal['name','description','announcements','locked','photo']
    value: str | bool

    @model_validator(mode='after')
    def validate_value(self):
        import re
        if self.field in ('announcements','locked'):
            if not isinstance(self.value,bool): raise ValueError('Use a boolean setting.')
        else:
            if not isinstance(self.value,str): raise ValueError('Use a text value.')
            if self.field == 'name' and not 1 <= len(self.value.strip()) <= 100: raise ValueError('Use a group name of 1–100 characters.')
            if self.field == 'description' and len(self.value) > 2048: raise ValueError('Description is too long.')
            if self.field == 'photo' and not re.fullmatch(r'[a-f0-9]{48}',self.value): raise ValueError('Supply an uploaded photo ID.')
        return self


class GroupCreate(Strict):
    operation: Literal['create_group']
    name: str = Field(min_length=1, max_length=100)
    participants: list[Person] = Field(min_length=1, max_length=50)


class GroupParticipants(Strict):
    operation: Literal['group_participants']
    group: Group
    action: Literal['add','remove','promote','demote']
    participants: list[Person] = Field(min_length=1, max_length=50)


class RefreshProfile(Strict):
    operation: Literal['refresh_profile']
    chat: JID


class Typing(Strict):
    operation: Literal['typing']
    chat: JID
    composing: bool
    audio: bool = False


Change = Annotated[ProfileChange | GroupChange | GroupCreate | GroupParticipants | RefreshProfile | Typing, Field(discriminator='operation')]


class ExecuteControl(Strict):
    request_id: str = Field(min_length=16, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')
    expected_account: Person
    change: Change


def capabilities():
    return {
        'transport':'existing_linked_device_connector',
        'implemented':['read_profile','set_display_name','set_about','set_profile_photo',
            'list_groups','read_group','create_group','set_group_name','set_group_description',
            'set_group_photo','set_group_permissions','update_group_participants','typing',
            'check_number','refresh_contact_profile','send_text','quoted_reply','edit_own_message',
            'revoke_own_message','reaction','mark_read','image','video','audio','voice_note',
            'document','sticker','contact','poll','event','cached_history_search'],
        'unsupported':{
            'business_name':'Display/push name is not the registered or verified business name.',
            'catalog':'Installed connector has no catalog read/write API.',
            'business_profile':'Business description, category, address and hours have no native editing API.',
            'labels_quick_replies':'No synchronized business labels or quick-reply editing API.',
            'calls_status':'Voice/video calling and status publishing are not implemented.',
            'block_report':'Not exposed; local phishing review never blocks or reports an account.',
        },
        'verification':'Implemented does not mean live-tested. Mutations return acceptance and read-back separately.',
        'history':'Local synchronized history only; full phone history is not guaranteed.',
    }


def operate(service, command: ExecuteControl):
    """The operation lock pins identity through dispatch; unknown outcomes never replay."""
    with service._operation:
        account = service.chats.account()
        if account != command.expected_account:
            raise ValueError('Account identity changed. Read the account again before acting.')
        if service._status != 'connected' or service._worker is None:
            raise RuntimeError('Wait for WhatsApp to reconnect.')
        payload = command.change.model_dump()
        fingerprint = hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
        with service.chats.db() as db:
            db.execute('CREATE TABLE IF NOT EXISTS control_operations(account TEXT,id TEXT,operation TEXT,fingerprint TEXT,status TEXT,result TEXT,created REAL,PRIMARY KEY(account,id))')
            db.execute('BEGIN IMMEDIATE')
            old=db.execute('SELECT * FROM control_operations WHERE account=? AND id=?',(account,command.request_id)).fetchone()
            if old:
                if old['fingerprint'] != fingerprint: raise ValueError('Request ID already belongs to a different operation.')
                if old['status'] == 'complete': return json.loads(old['result'])
                raise RuntimeError('Previous outcome is unconfirmed. Inspect WhatsApp; this request will not be replayed.')
            db.execute('INSERT INTO control_operations VALUES(?,?,?,?,?,?,?)',(account,command.request_id,payload['operation'],fingerprint,'pending','{}',time.time()))
        try:
            result=service._worker.request('control_execute',body=payload,expected_account=account)
        except Exception:
            with service.chats.db() as db:
                db.execute("UPDATE control_operations SET status='unknown' WHERE account=? AND id=?",(account,command.request_id))
            raise
        result={**result,'request_id':command.request_id,'account':account}
        with service.chats.db() as db:
            db.execute("UPDATE control_operations SET status='complete',result=? WHERE account=? AND id=?",(json.dumps(result),account,command.request_id))
        return result


def register_control_routes(app, selected_service):
    def invoke(fn,*args):
        try: return fn(*args)
        except ValueError as exc: raise HTTPException(422,str(exc)) from None
        except RuntimeError as exc: raise HTTPException(409,str(exc)) from None

    @app.get('/api/whatsapp/capabilities')
    def get_capabilities(request: Request):
        selected_service(request)
        return capabilities()

    @app.post('/api/whatsapp/control/read')
    def read(request: Request, body: ReadControl):
        service=selected_service(request,mutation=True)
        with service._operation:
            if service._status != 'connected' or service._worker is None:
                raise HTTPException(409,'Wait for WhatsApp to reconnect.')
            return invoke(lambda: service._worker.request('control_read',body=body.model_dump()))

    @app.post('/api/whatsapp/control/execute')
    def execute(request: Request, body: ExecuteControl):
        return invoke(operate,selected_service(request,mutation=True),body)

    @app.get('/api/whatsapp/control/receipts')
    def receipts(request: Request, limit: int = 30):
        service=selected_service(request)
        with service.chats.db() as db:
            if not db.execute("SELECT 1 FROM sqlite_master WHERE name='control_operations'").fetchone(): return {'operations':[]}
            rows=db.execute('SELECT id,operation,status,result,created FROM control_operations WHERE account=? ORDER BY created DESC LIMIT ?',
                (service.chats.account(),max(1,min(limit,100)))).fetchall()
        return {'operations':[{**dict(row),'result':json.loads(row['result'])} for row in rows]}

    @app.get('/api/whatsapp/history')
    def history(request: Request, chat: str = '', query: str = '', limit: int = 50, offset: int = 0):
        service=selected_service(request)
        if len(query)>500 or len(chat)>160 or offset<0 or not 1<=limit<=200:
            raise HTTPException(422,'Use a limit of 1–200 and a nonnegative offset.')
        # Literal substring matching, not executable SQL or wildcard search.
        with service.chats.db() as db:
            rows=db.execute('SELECT chat,id,sender,text,outgoing,ts,status,extra FROM messages WHERE account=? AND (?=\'\' OR chat=?) AND (?=\'\' OR instr(lower(text),lower(?))>0) ORDER BY ts DESC,id DESC LIMIT ? OFFSET ?',
                (service.chats.account(),chat,chat,query,query,limit+1,offset)).fetchall()
        return {'account':service.chats.account(),'source':'synchronized_cache','messages':[
            {**dict(row),'extra':json.loads(row['extra'])} for row in rows[:limit]],
            'next_offset':offset+limit if len(rows)>limit else None}
