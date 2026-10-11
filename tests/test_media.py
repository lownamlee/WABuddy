from io import BytesIO
import shutil
import wave
import pytest
from PIL import Image
from wabuddy.chat_store import ChatStore
from wabuddy.media import MediaStore, voice_opus
from test_app import app_client, login

def test_sticker_retains_animation_and_transparency(tmp_path):
    chats=ChatStore(tmp_path/'chats.sqlite3');chats.activate('111@s.whatsapp.net','Test')
    media=MediaStore(chats)
    frames=[Image.new('RGBA',(50,30),color) for color in ['red','blue']]
    raw=BytesIO();frames[0].save(raw,format='WEBP',save_all=True,append_images=frames[1:],duration=[120,160],loop=0)
    sticker=media.upload('sticker','animated.webp',raw.getvalue())
    with Image.open(BytesIO(media.get(sticker['id'])['data'])) as image:
        assert image.size==(512,512)
        assert image.n_frames==2
        assert image.convert('RGBA').getpixel((0,0))[3]==0
    with pytest.raises(ValueError): media.upload('image','fake.png',b'not an image')

def test_media_byte_ranges_and_account_auth(app_client):
    client,service,_=app_client
    headers=login(client);service.chats.activate('111@s.whatsapp.net','Test')
    attachment=MediaStore(service.chats).put('audio','test.ogg','audio/ogg',b'0123456789')
    response=client.get(attachment['url'],headers={**headers,'Range':'bytes=2-5'})
    assert response.status_code==206 and response.content==b'2345'
    assert response.headers['content-range']=='bytes 2-5/10'
    assert client.get(attachment['url'],headers={**headers,'Range':'bytes=-3'}).content==b'789'
    assert client.get(attachment['url'],headers={**headers,'Range':'bytes=20-'}).status_code==416

@pytest.mark.skipif(not shutil.which('ffmpeg'),reason='FFmpeg not installed')
def test_voice_encoding_is_ogg_opus():
    raw=BytesIO()
    with wave.open(raw,'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes(b'\0\0'*16000)
    encoded=voice_opus(raw.getvalue())
    assert encoded.startswith(b'OggS') and b'OpusHead' in encoded

def test_group_quote_names_the_participant(tmp_path):
    chats=ChatStore(tmp_path/'chats.sqlite3');chats.activate('111@s.whatsapp.net','Test')
    chats.contact('123@g.us','Group');chats.contact('222@s.whatsapp.net','Alice')
    chats.message('123@g.us','original','Hi',False,100,sender='222@s.whatsapp.net')
    chats.message('123@g.us','reply','Hello',True,101)
    chats.update_message('123@g.us','reply',reply={'id':'original','text':'Hi','senderJid':'999@lid'})
    assert chats.snapshot()['messages']['123@g.us'][-1]['reply']['sender']=='Alice'

def test_cached_original_payload_recovers_missing_reply(tmp_path):
    from neonize.proto.waE2E.WAWebProtobufsE2E_pb2 import Message,ExtendedTextMessage,ContextInfo
    chats=ChatStore(tmp_path/'chats.sqlite3');chats.activate('111@s.whatsapp.net','Test')
    assert not chats.has_message('123@g.us','reply')
    chats.message('123@g.us','reply','Hello',False,101,sender='333@s.whatsapp.net')
    assert chats.has_message('123@g.us','reply')
    payload=Message(extendedTextMessage=ExtendedTextMessage(text='Hello',contextInfo=ContextInfo(stanzaID='original',participant='222@s.whatsapp.net',quotedMessage=Message(conversation='Hi'))))
    media=MediaStore(chats);media.save_payload('123@g.us','reply',payload);media.recover_quotes()
    assert chats.snapshot()['messages']['123@g.us'][0]['reply']['text']=='Hi'
