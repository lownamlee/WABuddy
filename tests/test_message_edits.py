import sqlite3
from types import SimpleNamespace
import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message, SecretEncryptedMessage
from wabuddy.message_edits import decrypt_edit


def test_encrypted_edit_authentication_account_scope_and_lid_fallback(tmp_path):
    account,chat,sender='111@s.whatsapp.net','222@s.whatsapp.net','777@lid'
    secret=bytes(range(32))
    context=('original'+account+sender+'Message Edit').encode()
    key=HKDF(algorithm=hashes.SHA256(),length=32,salt=None,info=context).derive(secret)
    nonce=bytes(range(12))
    original=Message(conversation='Edited on another device')
    payload=AESGCM(key).encrypt(nonce,original.SerializeToString(),None)
    envelope=Message()
    encrypted=envelope.secretEncryptedMessage
    encrypted.secretEncType=SecretEncryptedMessage.MESSAGE_EDIT
    encrypted.targetMessageKey.ID='original'
    encrypted.targetMessageKey.fromMe=True
    encrypted.encIV=nonce
    encrypted.encPayload=payload
    event=SimpleNamespace(Message=envelope,Info=SimpleNamespace(MessageSource=SimpleNamespace(Sender=SimpleNamespace(User='777',Server='lid'))))
    with sqlite3.connect(tmp_path/'session.sqlite3') as db:
        db.execute('CREATE TABLE whatsmeow_message_secrets(our_jid,chat_jid,sender_jid,message_id,key)')
        db.execute('INSERT INTO whatsmeow_message_secrets VALUES(?,?,?,?,?)',(account,chat,account,'original',secret))
    id,message=decrypt_edit(tmp_path,account,event,{chat})
    assert id=='original' and message.conversation=='Edited on another device'
    for owner,aliases in [('333@s.whatsapp.net',{chat}),(account,{'999@s.whatsapp.net'})]:
        with pytest.raises(ValueError): decrypt_edit(tmp_path,owner,event,aliases)
    encrypted.encPayload=payload[:-1]+bytes([payload[-1]^1])
    with pytest.raises(ValueError): decrypt_edit(tmp_path,account,event,{chat})
