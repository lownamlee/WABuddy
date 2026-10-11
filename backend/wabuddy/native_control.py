"""Explicit SDK adapters. Never expose arbitrary native methods or protobufs."""
from io import BytesIO
from uuid import uuid4


def jid(value):
    return f'{value.User}@{value.Server}' if value.User else ''


def participant(p):
    return {'id':jid(p.JID),'phone':jid(p.PhoneNumber),'admin':p.IsAdmin,
            'super_admin':p.IsSuperAdmin,'name':p.DisplayName,'error':p.Error}


def group(g):
    return {'id':jid(g.JID),'name':g.GroupName.Name,'description':g.GroupTopic.Topic,
        'description_id':g.GroupTopic.TopicID,'announcements':g.GroupAnnounce.IsAnnounce,
        'locked':g.GroupLocked.isLocked,'participants':[participant(p) for p in g.Participants]}


def profile(client):
    me=client.get_me()
    result={'account':jid(me.JID),'display_name':me.PushName,'business_name':me.BussinessName,
            'identity_source':'connector_device','about':None,'about_source':'unavailable'}
    try:
        info=list(client.get_user_info(me.JID))
        if info:
            result.update(about=info[0].UserInfo.Status,about_source='whatsapp',picture_id=info[0].UserInfo.PictureID)
    except Exception:
        pass
    return result


def photo_bytes(media, media_id):
    from PIL import Image, ImageOps
    row=media.get(media_id)
    if row['kind']!='image' or row['data'] is None:
        raise ValueError('Upload an image for this account first.')
    with Image.open(BytesIO(row['data'])) as image:
        if image.width*image.height>40_000_000: raise ValueError('Image too large.')
        image=ImageOps.fit(ImageOps.exif_transpose(image).convert('RGB'),(640,640))
        output=BytesIO();image.save(output,format='JPEG',quality=92)
    return output.getvalue()


def read(client, body, parse):
    op=body['operation']
    if op=='profile': return profile(client)
    if op=='groups': return {'groups':[group(g) for g in client.get_joined_groups()]}
    if op=='group': return group(client.get_group_info(parse(body['target'])))
    if op=='check_number':
        return {'results':[{'number':p.Query,'id':jid(p.JID),'registered':p.IsIn} for p in client.is_on_whatsapp(body['target'].lstrip('+'))]}
    raise ValueError('Unsupported read operation.')


def execute(client, body, parse, store, media, refresh_profile):
    op=body['operation']
    result={'status':'accepted','verified':False}
    if op=='profile':
        field,value=body['field'],body['value']
        if field=='display_name': client.set_profile_name(value)
        elif field=='about': client.set_status_message(value)
        elif field=='photo': result['picture_id']=client.set_profile_photo(photo_bytes(media,value))
        else: raise ValueError('Unsupported profile field.')
        after=profile(client)
        result['readback']=after
        if field=='about': result['verified']=after['about_source']=='whatsapp' and after['about']==value
        elif field=='display_name':
            # Device push name is not a server-verified business-name change.
            result['verified']=False
            result['note']='Push-name update accepted. Registered business name is unchanged; confirm display on another client.'
        refresh_profile(store.account())
        if after['display_name'] or after['business_name']:
            store.activate(store.account(),after['business_name'] or after['display_name'])
        return result
    if op=='create_group':
        created=client.create_group(body['name'],[parse(p) for p in body['participants']])
        group_id=jid(created.JID)
        store.contact(group_id,created.GroupName.Name)
        result['group_id']=group_id
    elif op=='group':
        group_id=body['group']; target=parse(group_id);field=body['field'];value=body['value']
        if field=='name': client.set_group_name(target,value)
        elif field=='description':
            before=client.get_group_info(target)
            client.set_group_topic(target,before.GroupTopic.TopicID,uuid4().hex,value)
        elif field=='announcements': client.set_group_announce(target,value)
        elif field=='locked': client.set_group_locked(target,value)
        elif field=='photo': result['picture_id']=client.set_group_photo(target,photo_bytes(media,value))
        else: raise ValueError('Unsupported group field.')
    elif op=='group_participants':
        from neonize.utils.enum import ParticipantChange
        group_id=body['group']
        changes=client.update_group_participants(parse(group_id),[parse(p) for p in body['participants']],ParticipantChange(body['action']))
        result['participants']=[participant(p) for p in changes]
        if any(p['error'] for p in result['participants']): result['status']='partial_or_rejected'
    elif op=='refresh_profile':
        refresh_profile(body['chat'])
        return {**result,'note':'Refresh attempted; privacy settings may prevent retrieving photo or About.'}
    elif op=='typing':
        from neonize.utils.enum import ChatPresence, ChatPresenceMedia
        client.send_chat_presence(parse(body['chat']),ChatPresence(0 if body['composing'] else 1),ChatPresenceMedia(1 if body['audio'] else 0))
        return result
    else: raise ValueError('Unsupported control operation.')
    # A read-back failure must not erase the successful mutation acknowledgement.
    try:
        after=group(client.get_group_info(parse(group_id)))
        result['readback']=after
        store.contact(group_id,after['name'])
        if op=='group' and body['field']!='photo': result['verified']=after[body['field']]==body['value']
        elif op=='create_group': result['verified']=after['name']==body['name']
    except Exception:
        result['note']='Mutation acknowledged; read-back unavailable. Inspect before retrying.'
    return result
