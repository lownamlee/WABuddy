"""Registers live events on the single existing WhatsApp connector."""
import queue
import threading
import time
from urllib.parse import urlsplit
from urllib.request import urlopen, Request
from io import BytesIO

from .chat_store import ChatStore


def fetch_profile_photo(url):
    """Only download the WhatsApp CDN URL supplied by the authenticated connector."""
    def trusted(value):
        parsed = urlsplit(value)
        return parsed.scheme == 'https' and parsed.hostname and any(parsed.hostname.endswith('.'+host) for host in ('whatsapp.net','fbcdn.net'))
    if not trusted(url):
        raise ValueError('Unexpected profile image host')
    with urlopen(Request(url,headers={'User-Agent':'WABuddy'}),timeout=10) as response:
        if not trusted(response.url):
            raise ValueError('Unexpected image redirect')
        data = response.read(2_000_001)
    if len(data)>2_000_000:
        raise ValueError('Profile image too large')
    from PIL import Image
    with Image.open(BytesIO(data)) as image:
        image.thumbnail((512,512))
        output=BytesIO()
        image.convert('RGB').save(output,format='JPEG')
        return output.getvalue()


def jid_text(jid):
    return f'{jid.User}@{jid.Server}' if jid.User else ''


def message_text(message):
    for wrapper in ('ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'documentWithCaptionMessage', 'editedMessage', 'associatedChildMessage'):
        if message.HasField(wrapper):
            # Do not cache disappearing/view-once media content.
            if wrapper.startswith('viewOnce'):
                return '[View-once message — open on your phone]'
            return message_text(getattr(message, wrapper).message)
    if message.HasField('protocolMessage') and message.protocolMessage.HasField('editedMessage'):
        return message_text(message.protocolMessage.editedMessage)
    if message.conversation:
        return message.conversation
    if message.extendedTextMessage.text:
        return message.extendedTextMessage.text
    for field in ('pollCreationMessage','pollCreationMessageV2','pollCreationMessageV3'):
        if message.HasField(field): return '[Poll] '+getattr(message,field).name
    if message.HasField('eventMessage'): return '[Event] '+message.eventMessage.name
    for field, label in [('imageMessage','Photo'),('videoMessage','Video'),('audioMessage','Voice message'),('documentMessage','Document'),('stickerMessage','Sticker'),('contactMessage','Contact'),('locationMessage','Location')]:
        if message.HasField(field):
            item = getattr(message,field)
            return f'[{label}]' + (' ' + item.caption if getattr(item,'caption','') else '')
    return ''  # Ignore protocol/app-state messages, not visible user content.


def install_live(client, folder, commands, responses, stop, emit):
    from neonize.events import MessageEv, HistorySyncEv, ReceiptEv
    from neonize.utils.jid import build_jid
    from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message

    store = ChatStore(folder.parent / 'chats.sqlite3')
    from .media import MediaStore, build_rich, MAX_MEDIA
    media = MediaStore(store)

    def canonical(jid):
        if jid.Server == 'lid':
            try:
                phone = client.get_pn_from_lid(jid)
                if phone.User:
                    return jid_text(phone)
            except Exception:
                pass
        return jid_text(jid)

    def parse(value):
        user, server = value.split('@',1)
        return build_jid(user.split(':')[0], server)

    def connected():
        me = client.get_me()
        account = jid_text(me.JID)
        if account:
            store.activate(account, me.BussinessName or me.PushName)
            store.contact(account, (me.BussinessName or me.PushName or 'You') + ' (You)')
        threading.Thread(target=refresh_contacts,name='whatsapp-contacts',daemon=True).start()
        threading.Thread(target=media.recover_quotes,name='whatsapp-quote-recovery',daemon=True).start()

    def refresh_contacts():
        # Stored contacts survive reconnect; they are not invented demo chats.
        try:
            merged={}
            for contact in client.contact.get_all_contacts():
                info = contact.Info
                jid=canonical(contact.JID)
                old=merged.get(jid,('',''))
                merged[jid]=(info.FullName or info.FirstName or old[0],info.PushName or info.BusinessName or old[1])
            for jid,(name,push_name) in merged.items():
                store.contact(jid,name,push_name=push_name,authoritative=True)
        except Exception:
            pass
        threading.Thread(target=refresh_chat_metadata,name='whatsapp-chat-metadata',daemon=True).start()
        threading.Thread(target=refresh_profiles,name='whatsapp-profiles',daemon=True).start()

    def refresh_chat_metadata():
        try:
            groups = list(client.get_joined_groups())
            names = {jid_text(g.JID): g.GroupName.Name for g in groups}
            for group in groups:
                jid = jid_text(group.JID)
                parent = jid_text(group.GroupLinkedParent.LinkedParentJID)
                store.contact(jid, group.GroupName.Name)
                participants=[]
                for member in group.Participants:
                    member_id=jid_text(member.PhoneNumber) or canonical(member.JID)
                    if member.DisplayName: store.contact(member_id,'',push_name=member.DisplayName)
                    participants.append({'id':member_id,'name':member.DisplayName,'admin':member.IsAdmin or member.IsSuperAdmin})
                store.chat_metadata(jid, parentGroup=parent, community=names.get(parent,''), isCommunity=group.GroupParent.IsParent,participants=participants,description=group.GroupTopic.Topic,announcement=group.GroupAnnounce.IsAnnounce)
                if group.GroupParent.IsParent: refresh_profile(jid)
        except Exception:
            emit('sync_error')
        # The SDK retains archived chats even when no message history was supplied.
        # Read only non-secret chat settings; never modify its session database.
        try:
            import sqlite3
            with sqlite3.connect('file:'+str((folder/'session.sqlite3').resolve()).replace('\\','/')+'?mode=ro',uri=True) as db:
                rows=db.execute('SELECT our_jid,chat_jid,pinned,archived,muted_until FROM whatsmeow_chat_settings').fetchall()
            for owner,chat_id,pinned,archived,muted in rows:
                if owner.split('@')[0].split(':')[0] != store.account().split('@')[0]: continue
                if not (pinned or archived): continue
                jid=canonical(parse(chat_id))
                if jid.endswith('@lid'): continue
                store.chat_metadata(jid,pinned=bool(pinned),archived=bool(archived),muted=bool(muted))
        except Exception:
            emit('sync_error')
        # Historical participants can use privacy IDs; these are not phone numbers.
        with store.db() as db:
            senders=[row[0] for row in db.execute("SELECT DISTINCT sender FROM messages WHERE account=? AND sender LIKE '%@lid'",(store.account(),))]
        for sender in senders:
            resolved=canonical(parse(sender))
            if resolved!=sender:
                with store.db() as db:
                    db.execute('UPDATE messages SET sender=? WHERE account=? AND sender=?',(resolved,store.account(),sender))
        for chat in store.snapshot()['contacts']:
            if stop.is_set(): return
            try:
                settings = client.chat_settings.get_chat_settings(parse(chat['id']))
                if not settings.Found and chat['id'].endswith('@s.whatsapp.net'):
                    settings = client.chat_settings.get_chat_settings(client.get_lid_from_pn(parse(chat['id'])))
                if settings.Found:
                    store.chat_metadata(chat['id'], pinned=settings.Pinned, archived=settings.Archived,
                                        muted=settings.MutedUntil != 0)
            except Exception:
                continue

    def refresh_profile(jid):
        try:
            info = client.get_user_info(parse(jid))
            if info:
                store.profile(jid,about=info[0].UserInfo.Status)
        except Exception:
            pass
        try:
            picture = client.get_profile_picture(parse(jid))
            if picture.URL:
                store.profile(jid,photo=fetch_profile_photo(picture.URL))
        except Exception:
            pass  # Privacy settings can make a contact's photo unavailable.

    def refresh_profiles():
        snapshot=store.snapshot()
        contacts=snapshot['contacts']
        contacts.sort(key=lambda c:(c['id']!=store.account(),not c.get('hasConversation'),-c.get('lastMessageAt',0)))
        for chat in contacts[:150]:
            if stop.is_set():
                return
            if not chat.get('photoVersion'): refresh_profile(chat['id'])

    @client.event(MessageEv)
    def on_message(_client, event):
        try:
            source = event.Info.MessageSource
            jid = canonical(source.Chat)
            msg = event.Message
            if msg.HasField('secretEncryptedMessage'):
                from .message_edits import decrypt_edit
                aliases={jid,jid_text(source.Chat)}
                try:
                    aliases.add(jid_text(client.get_lid_from_pn(parse(jid))))
                except Exception:
                    pass
                target,decoded=decrypt_edit(folder,store.account(),event,aliases)
                store.link_message_event(jid,event.Info.ID,target)
                edited=decoded.protocolMessage.editedMessage if decoded.HasField('protocolMessage') else decoded
                store.update_message(jid,target,text=message_text(edited),edited=True)
                return
            if msg.HasField('editedMessage'):
                msg=msg.editedMessage.message
            if msg.HasField('reactionMessage'):
                reaction=msg.reactionMessage
                store.reaction(jid,reaction.key.ID,store.account() if source.IsFromMe else canonical(source.Sender),reaction.text,reaction.senderTimestampMS or event.Info.Timestamp or time.time())
                return
            if msg.HasField('protocolMessage'):
                protocol=msg.protocolMessage
                if protocol.HasField('editedMessage'):
                    store.link_message_event(jid,event.Info.ID,protocol.key.ID)
                    store.update_message(jid,protocol.key.ID,text=message_text(protocol.editedMessage),edited=True)
                elif protocol.type==0 and protocol.key.ID:
                    store.update_message(jid,protocol.key.ID,text='This message was deleted',deleted=True,reply=None,reaction=None)
                return
            if source.IsGroup and event.Info.Pushname:
                store.contact(canonical(source.Sender),push_name=event.Info.Pushname)
            text = message_text(msg)
            if not text:
                return
            if event.IsEdit:
                store.update_message(jid,event.Info.ID,text=text,edited=True)
                return
            new_message = not store.has_message(jid,event.Info.ID)
            store.message(canonical(source.Chat),event.Info.ID,text,source.IsFromMe,
                          event.Info.Timestamp or time.time(),canonical(source.Sender),
                          event.Info.Pushname if not source.IsFromMe and not source.IsGroup else '')
            if new_message and not source.IsFromMe:
                with store.db() as db:
                    row=db.execute('SELECT metadata FROM chats WHERE account=? AND jid=?',(store.account(),jid)).fetchone()
                import json
                store.chat_metadata(jid,unread=json.loads(row[0] or '{}').get('unread',0)+1)
            details=media.describe(jid,event.Info.ID,msg)
            if details: store.update_message(jid,event.Info.ID,**details)
            if msg.extendedTextMessage.HasField('contextInfo'):
                context=msg.extendedTextMessage.contextInfo
                if context.stanzaID:
                    participant=canonical(parse(context.participant)) if '@' in context.participant else jid
                    store.update_message(jid,event.Info.ID,reply={'id':context.stanzaID,'text':message_text(context.quotedMessage),'senderJid':participant})
        except Exception:
            emit('sync_error')

    @client.event(HistorySyncEv)
    def on_history(_client, event):
        try:
            if not store.account():
                connected()
            for chat in event.Data.conversations:
                jid = canonical(parse(chat.ID))
                store.contact(jid,chat.name or chat.displayName if jid.endswith('@g.us') else '')
                meta={}
                for field,key in [('archived','archived'),('pinned','pinOrder'),('unreadCount','unread'),('parentGroupID','parentGroup'),('isParentGroup','isCommunity')]:
                    if chat.HasField(field): meta[key]=getattr(chat,field)
                if 'pinOrder' in meta: meta['pinned']=bool(meta['pinOrder'])
                if meta: store.chat_metadata(jid,**meta)
                for item in chat.messages:
                    msg = item.message
                    text = message_text(msg.message)
                    if text:
                        store.message(jid,msg.key.ID,text,msg.key.fromMe,msg.messageTimestamp or time.time(),
                                      canonical(parse(msg.participant or msg.key.participant)) if '@' in (msg.participant or msg.key.participant) else '', account=store.account(),
                                      status='read' if msg.status==4 else 'delivered' if msg.status==3 else None)
                        payload=msg.message
                        edited=False
                        for wrapper in ('editedMessage','associatedChildMessage'):
                            if payload.HasField(wrapper):
                                edited=edited or wrapper=='editedMessage'
                                payload=getattr(payload,wrapper).message
                        if payload.HasField('protocolMessage') and payload.protocolMessage.HasField('editedMessage'):
                            payload=payload.protocolMessage.editedMessage; edited=True
                        if edited: store.update_message(jid,msg.key.ID,edited=True,text=text)
                        if msg.is1PBizBotMessage or msg.isSupportAiMessage: store.update_message(jid,msg.key.ID,ai=True)
                        for field,value in payload.ListFields():
                            if hasattr(value,'contextInfo') and value.contextInfo.stanzaID:
                                ctx=value.contextInfo
                                store.update_message(jid,msg.key.ID,reply={'id':ctx.stanzaID,'text':message_text(ctx.quotedMessage),'senderJid':ctx.participant})
                        for reaction in msg.reactions:
                            store.reaction(jid,msg.key.ID,store.account() if reaction.key.fromMe else reaction.key.participant or jid,reaction.text,reaction.senderTimestampMS or msg.messageTimestamp)
                        details=media.describe(jid,msg.key.ID,payload)
                        if details: store.update_message(jid,msg.key.ID,**details)
            emit('history_synced')
        except Exception:
            emit('sync_error')

    @client.event(ReceiptEv)
    def on_receipt(_client, event):
        try:
            if event.Type in (1,4,5,6,7):
                store.receipt(canonical(event.MessageSource.Chat),event.MessageIDs,'delivered' if event.Type==1 else 'read',event.Timestamp,own_read=event.Type in (5,7))
        except Exception:
            emit('sync_error')

    def command_loop():
        while not stop.is_set():
            try:
                command = commands.get(timeout=.25)
            except queue.Empty:
                continue
            result = {'id':command['id']}
            try:
                if command['action']=='logout':
                    client.logout()
                    store.deactivate()
                    result['ok'] = True
                elif command['action']=='send':
                    if not client.is_connected or not client.is_logged_in:
                        raise RuntimeError('disconnected')
                    payload=Message(conversation=command['text'])
                    quoted=None
                    if command.get('reply_to'):
                        quoted=store.get_message(command['chat'],command['reply_to'])
                        payload=Message()
                        payload.extendedTextMessage.text=command['text']
                        context=payload.extendedTextMessage.contextInfo
                        context.stanzaID=quoted['id']
                        context.participant=store.account() if quoted['outgoing'] else quoted['sender'] or command['chat']
                        context.quotedMessage.conversation=quoted['text']
                    response = client.send_message(parse(command['chat']), payload)
                    store.message(command['chat'],response.ID,command['text'],True,response.Timestamp or time.time(),store.account())
                    if quoted:
                        label=next((c['name'] for c in store.snapshot()['chats'] if c['id']==command['chat']),command['chat'])
                        store.update_message(command['chat'],response.ID,reply={'id':quoted['id'],'text':quoted['text'],'senderJid':store.account() if quoted['outgoing'] else quoted['sender'] or command['chat'],'sender':'You' if quoted['outgoing'] else label})
                    value = {'message_id':response.ID,'status':'sent'}
                    store.finish_send(command['token'],'sent',value)
                    result.update(ok=True,result=value)
                elif command['action']=='send_rich':
                    if not client.is_connected or not client.is_logged_in: raise RuntimeError('disconnected')
                    body=command['body'];chat=body['chat']
                    payload,descriptor=build_rich(client,media,body)
                    quoted=None
                    if body.get('reply_to'):
                        quoted=store.get_message(chat,body['reply_to'])
                        field=next((field.name for field,value in payload.ListFields() if hasattr(value,'contextInfo')),None)
                        if field:
                            context=getattr(payload,field).contextInfo
                            context.stanzaID=quoted['id'];context.participant=store.account() if quoted['outgoing'] else quoted['sender'] or chat
                            try: context.quotedMessage.CopyFrom(media.payload(chat,quoted['id']))
                            except ValueError: context.quotedMessage.conversation=quoted['text']
                    response=client.send_message(parse(chat),payload)
                    store.message(chat,response.ID,message_text(payload),True,response.Timestamp or time.time(),store.account())
                    store.update_message(chat,response.ID,**media.describe(chat,response.ID,payload,descriptor))
                    if quoted: store.update_message(chat,response.ID,reply={'id':quoted['id'],'text':quoted['text'],'senderJid':store.account() if quoted['outgoing'] else quoted['sender'] or chat})
                    value={'message_id':response.ID,'status':'sent'}
                    store.finish_send(command['token'],'sent',value)
                    result.update(ok=True,result=value)
                elif command['action']=='download_media':
                    row=media.get(command['media_id'])
                    if row['data'] is None:
                        payload=Message.FromString(row['proto'])
                        if any(getattr(payload,f).fileLength>MAX_MEDIA for f in ('imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage') if payload.HasField(f)):
                            raise ValueError('Attachment exceeds 64 MB.')
                        blob=client.download_any(payload)
                        media.put(row['kind'],row['name'],row['mime'],blob,id=row['id'])
                    result.update(ok=True,result={'ready':True})
                elif command['action']=='message_action':
                    if not client.is_connected or not client.is_logged_in:
                        raise RuntimeError('disconnected')
                    chat=command['chat']
                    item=store.get_message(chat,command['message_id'])
                    action=command['operation']
                    if action in ('edit','revoke') and not item['outgoing']:
                        raise ValueError('Only your own messages can be changed.')
                    if action=='edit':
                        if time.time()-item['ts']>15*60 or item['text'].startswith('['):
                            raise ValueError('Only recent text messages can be edited.')
                        result_edit = client.edit_message(parse(chat),item['id'],Message(conversation=command['text']))
                        store.link_message_event(chat,getattr(result_edit,'ID',''),item['id'])
                        store.update_message(chat,item['id'],text=command['text'],edited=True)
                    elif action=='revoke':
                        client.revoke_message(parse(chat),parse(store.account()),item['id'])
                        store.update_message(chat,item['id'],text='You deleted this message',deleted=True,reply=None,reaction=None)
                    elif action=='react':
                        sender=store.account() if item['outgoing'] else item['sender'] or chat
                        client.send_message(parse(chat),client.build_reaction(parse(chat),parse(sender),item['id'],command['text']))
                        store.reaction(chat,item['id'],store.account(),command['text'],time.time())
                    elif action=='read':
                        from neonize.utils.enum import ReceiptType
                        if not item['outgoing']:
                            client.mark_read(item['id'],chat=parse(chat),sender=parse(item['sender'] or chat),receipt=ReceiptType.READ)
                            with store.db() as db:
                                db.execute("UPDATE messages SET status='read' WHERE account=? AND chat=? AND id=?",(store.account(),chat,item['id']))
                            store.chat_metadata(chat,unread=0)
                    else:
                        raise ValueError('Unsupported action')
                    result.update(ok=True,result={'status':'complete'})
                elif command['action'] in ('control_read','control_execute'):
                    from .native_control import read, execute
                    if not client.is_connected or not client.is_logged_in:
                        raise RuntimeError('disconnected')
                    if command['action']=='control_read':
                        value=read(client,command['body'],parse)
                    else:
                        if jid_text(client.get_me().JID)!=command['expected_account']:
                            raise ValueError('Account changed before execution.')
                        value=execute(client,command['body'],parse,store,media,refresh_profile)
                    result.update(ok=True,result=value)
                elif command['action']=='refresh_profile':
                    refresh_profile(command['chat'])
                    result.update(ok=True,result={'status':'complete'})
                else:
                    raise ValueError('Unknown command')
            except Exception:
                # A send error may occur after server acceptance. Never blindly resend.
                result.update(ok=False,error='Message outcome is unknown. Check the chat before sending again.' if command['action']=='send' else 'WhatsApp could not complete this action.')
                if command['action'] in ('send','send_rich'):
                    store.finish_send(command['token'],'unknown',{})
            responses.put(result)

    threading.Thread(target=command_loop,name='whatsapp-commands',daemon=True).start()
    return connected
