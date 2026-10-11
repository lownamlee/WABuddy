"""Private attachments and native rich-message payloads. Never expose protobuf/media keys."""
from io import BytesIO
from pathlib import Path
import hashlib
import json
import re
import secrets
import time
from PIL import Image, ImageSequence
import subprocess
import tempfile

MAX_MEDIA = 64 * 1024 * 1024
MEDIA_FIELDS = {'imageMessage':'image','videoMessage':'video','audioMessage':'audio','documentMessage':'document','stickerMessage':'sticker'}

def voice_opus(data, voice=True):
    """Browsers record WebM/MP4; WhatsApp voice notes require Ogg Opus."""
    with tempfile.TemporaryDirectory(prefix='wabuddy-audio-') as folder:
        source=Path(folder)/'input'; target=Path(folder)/'voice.ogg'
        source.write_bytes(data)
        try:
            subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(source),'-vn',*(['-t','300'] if voice else []),'-ac','1','-ar','48000','-c:a','libopus','-b:a','32k',str(target)],check=True,capture_output=True,timeout=90,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        except (OSError,subprocess.SubprocessError):
            raise ValueError('Could not encode audio. Check that FFmpeg is installed and the file is playable.') from None
        return target.read_bytes()

class MediaStore:
    def __init__(self, chats):
        self.chats = chats
        with chats.db() as db:
            db.executescript('''CREATE TABLE IF NOT EXISTS media(account TEXT,id TEXT,kind TEXT,name TEXT,mime TEXT,size INTEGER,data BLOB,proto BLOB,PRIMARY KEY(account,id));
            CREATE TABLE IF NOT EXISTS rich_messages(account TEXT,chat TEXT,id TEXT,proto BLOB,PRIMARY KEY(account,chat,id));''')

    def put(self, kind, name, mime, data=None, proto=None, id=None, size=0):
        account=self.chats.account()
        if not account: raise ValueError('Link WhatsApp first.')
        if data is not None and len(data)>MAX_MEDIA: raise ValueError('Attachment exceeds 64 MB.')
        id=id or secrets.token_hex(24)
        name=Path(name.replace('\\','/')).name[:180] or 'attachment'
        name=re.sub(r'[\x00-\x1f\x7f]', '', name)
        with self.chats.db() as db:
            db.execute('INSERT INTO media VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(account,id) DO UPDATE SET data=COALESCE(excluded.data,media.data),proto=COALESCE(excluded.proto,media.proto)',(account,id,kind,name,mime,len(data) if data is not None else size,data,proto))
        return self.public(self.get(id))

    def get(self,id):
        with self.chats.db() as db:
            row=db.execute('SELECT * FROM media WHERE account=? AND id=?',(self.chats.account(),id)).fetchone()
        if not row: raise ValueError('Attachment unavailable for this account.')
        return dict(row)

    @staticmethod
    def public(row):
        return {'id':row['id'],'kind':row['kind'],'name':row['name'],'mime':row['mime'],'size':row['size'],'url':'/api/whatsapp/media/'+row['id']}

    def upload(self, kind, name, data):
        import magic
        if not data: raise ValueError('Choose a nonempty file.')
        mime=magic.from_buffer(data,mime=True)
        if kind in ('image','sticker'):
            if mime not in ('image/jpeg','image/png','image/webp','image/gif'): raise ValueError('Choose a JPEG, PNG, WebP or GIF image.')
            with Image.open(BytesIO(data)) as image:
                if image.width*image.height>40_000_000: raise ValueError('Image dimensions are too large.')
                image.verify()
            if kind=='sticker':
                with Image.open(BytesIO(data)) as image:
                    if getattr(image,'n_frames',1)>200: raise ValueError('Choose a sticker with at most 200 frames.')
                    frames=[];durations=[]
                    for frame in ImageSequence.Iterator(image):
                        frame=frame.convert('RGBA');frame.thumbnail((512,512));canvas=Image.new('RGBA',(512,512));canvas.paste(frame,((512-frame.width)//2,(512-frame.height)//2));frames.append(canvas);durations.append(max(20,frame.info.get('duration',100)))
                    output=BytesIO();frames[0].save(output,format='WEBP',save_all=len(frames)>1,append_images=frames[1:],duration=durations,loop=0);data=output.getvalue();mime='image/webp';name=Path(name).stem+'.webp'
        elif kind=='video' and not mime.startswith('video/'): raise ValueError('Choose a video file.')
        elif kind=='audio' and not (mime.startswith('audio/') or mime in ('video/webm','application/ogg')): raise ValueError('Choose an audio file.')
        elif kind not in ('video','audio','document'): raise ValueError('Unsupported attachment type.')
        return self.put(kind,name,mime,data)

    def save_payload(self,chat,id,payload):
        with self.chats.db() as db:
            db.execute('INSERT OR REPLACE INTO rich_messages VALUES(?,?,?,?)',(self.chats.account(),chat,id,payload.SerializeToString()))

    def payload(self,chat,id):
        from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message
        with self.chats.db() as db:
            row=db.execute('SELECT proto FROM rich_messages WHERE account=? AND chat=? AND id=?',(self.chats.account(),chat,id)).fetchone()
        if not row: raise ValueError('Original rich message unavailable.')
        return Message.FromString(row[0])

    def recover_quotes(self):
        """Recover reply metadata from already synchronized original payloads."""
        from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message
        with self.chats.db() as db:
            rows=db.execute('SELECT r.chat,r.id,r.proto FROM rich_messages r JOIN messages m ON m.account=r.account AND m.chat=r.chat AND m.id=r.id WHERE r.account=? AND json_extract(m.extra,\'$.reply\') IS NULL',(self.chats.account(),)).fetchall()
        for row in rows:
            try:
                reply=self.quote(Message.FromString(row['proto']))
                if reply: self.chats.update_message(row['chat'],row['id'],reply=reply)
            except (ValueError,TypeError):
                continue

    @staticmethod
    def quote(payload):
        from .live_connector import message_text
        for field,value in payload.ListFields():
            if hasattr(value,'contextInfo') and value.contextInfo.stanzaID:
                context=value.contextInfo
                return {'id':context.stanzaID,'text':message_text(context.quotedMessage),'senderJid':context.participant}
        return None

    def describe(self,chat,id,payload,existing_media=None):
        # View-once and disappearing messages are not retained as downloadable files.
        if any(payload.HasField(f) for f in ('viewOnceMessage','viewOnceMessageV2','ephemeralMessage')): return {}
        if payload.HasField('documentWithCaptionMessage'): payload=payload.documentWithCaptionMessage.message
        self.save_payload(chat,id,payload)
        reply=self.quote(payload)
        if reply and self.chats.has_message(chat,id): self.chats.update_message(chat,id,reply=reply)
        for field,kind in MEDIA_FIELDS.items():
            if not payload.HasField(field): continue
            media=getattr(payload,field)
            if getattr(media,'viewOnce',False): return {}
            mime=media.mimetype or 'application/octet-stream'
            name=getattr(media,'fileName','') or kind+'.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','audio/ogg; codecs=opus':'ogg'}.get(mime,mime.split('/')[-1].split(';')[0]))
            media_id=hashlib.sha256((self.chats.account()+'|'+chat+'|'+id).encode()).hexdigest()
            descriptor=existing_media or self.put(kind,name,mime,proto=payload.SerializeToString(),id=media_id,size=media.fileLength)
            descriptor={**descriptor,'voice':getattr(media,'PTT',False),'seconds':getattr(media,'seconds',0)}
            return {'media':descriptor,'caption':getattr(media,'caption','')}
        if payload.HasField('contactMessage'):
            contact=payload.contactMessage
            match=re.search(r'(?:waid=([0-9]+)|TEL[^:]*:([+0-9 -]+))',contact.vcard)
            return {'contactCard':{'name':contact.displayName,'phone':(match.group(1) or match.group(2)) if match else ''}}
        for field in ('pollCreationMessage','pollCreationMessageV2','pollCreationMessageV3'):
            if payload.HasField(field):
                poll=getattr(payload,field)
                return {'poll':{'question':poll.name,'options':[o.optionName for o in poll.options],'multiple':poll.selectableOptionsCount!=1,'votes':{}}}
        if payload.HasField('eventMessage'):
            event=payload.eventMessage
            return {'eventCard':{'name':event.name,'description':event.description,'start':event.startTime,'end':event.endTime,'location':event.location.name,'cancelled':event.isCanceled}}
        return {}


def build_rich(client, media, body):
    from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message,ContactMessage,EventMessage,LocationMessage
    kind=body['kind']
    descriptor=None
    if kind in ('image','video','audio','document','sticker'):
        row=media.get(body['media_id']);data=row['data']
        if data is None and row['proto']:
            original=Message.FromString(row['proto'])
            for field in MEDIA_FIELDS:
                if original.HasField(field) and getattr(original,field).fileLength>MAX_MEDIA: raise ValueError('Attachment exceeds 64 MB.')
            data=client.download_any(original)
            media.put(row['kind'],row['name'],row['mime'],data=data,id=row['id'])
            row=media.get(row['id'])
        if row['kind']!=kind or not data: raise ValueError('Upload does not match this attachment.')
        caption=body.get('caption','')
        if kind=='image': payload=client.build_image_message(data,caption=caption)
        elif kind=='video': payload=client.build_video_message(data,caption=caption)
        elif kind=='audio':
            data=voice_opus(data,voice=body.get('voice',False))
            descriptor=media.put('audio','voice-message.ogg' if body.get('voice') else Path(row['name']).stem+'.ogg','audio/ogg; codecs=opus',data)
            payload=client.build_audio_message(data,ptt=body.get('voice',False))
            payload.audioMessage.mimetype='audio/ogg; codecs=opus'
        elif kind=='sticker': payload=client.build_sticker_message(data,passthrough=True)
        else: payload=client.build_document_message(data,caption=caption,filename=row['name'],mimetype=row['mime'])
        descriptor=descriptor or media.public(row)
    elif kind=='contact':
        from neonize.utils import gen_vcard
        payload=Message(contactMessage=ContactMessage(displayName=body['name'],vcard=gen_vcard(body['name'],body['phone'])))
    elif kind=='poll':
        from neonize.utils.enum import VoteType
        payload=client.build_poll_vote_creation(body['name'],body['options'],VoteType.MULTIPLE if body.get('multiple') else VoteType.SINGLE)
    elif kind=='event':
        payload=Message(eventMessage=EventMessage(name=body['name'],description=body.get('description',''),startTime=body['start'],endTime=body.get('end',0),location=LocationMessage(name=body.get('location',''))))
    else: raise ValueError('Unsupported message type.')
    return payload,descriptor

