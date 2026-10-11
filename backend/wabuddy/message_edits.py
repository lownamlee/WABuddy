"""Decode authenticated WhatsApp message edits using the existing device's message secrets.

Wire format reference: go.mau.fi/whatsmeow/msgsecret.go (Message Edit HKDF/AES-GCM).
No credentials or decrypted payloads are logged or exposed through the HTTP API.
"""
import sqlite3
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag


def bare(jid):
    user,server=jid.split('@',1)
    return user.split(':',1)[0]+'@'+server


def decrypt_edit(folder, account, event, chat_aliases):
    from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message, SecretEncryptedMessage
    encrypted=event.Message.secretEncryptedMessage
    if encrypted.secretEncType!=SecretEncryptedMessage.MESSAGE_EDIT:
        raise ValueError('Unsupported encrypted message type')
    target=encrypted.targetMessageKey
    sender=f'{event.Info.MessageSource.Sender.User}@{event.Info.MessageSource.Sender.Server}'
    original=sender if target.fromMe else target.participant or target.remoteJID
    path=(folder/'session.sqlite3').resolve()
    with sqlite3.connect(path.as_uri()+'?mode=ro',uri=True,timeout=10) as connection:
        rows=connection.execute('SELECT our_jid,chat_jid,sender_jid,key FROM whatsmeow_message_secrets WHERE message_id=?',(target.ID,)).fetchall()
    for owner,chat,stored_sender,secret in rows:
        if bare(owner)!=bare(account) or bare(chat) not in chat_aliases:
            continue
        for origin in dict.fromkeys([bare(original),bare(stored_sender)]):
            context=(target.ID+origin+bare(sender)+'Message Edit').encode()
            key=HKDF(algorithm=hashes.SHA256(),length=32,salt=None,info=context).derive(secret)
            try:
                plaintext=AESGCM(key).decrypt(encrypted.encIV,encrypted.encPayload,None)
            except InvalidTag:
                continue
            return target.ID,Message.FromString(plaintext)
    raise ValueError('Original message secret unavailable or edit authentication failed')
