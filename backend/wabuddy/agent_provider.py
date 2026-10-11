"""Optional OpenAI-compatible text/vision workers. WorkBuddy MCP needs no API key."""
import base64
from concurrent.futures import ThreadPoolExecutor
import json
import os
import threading
import urllib.error
import urllib.request
from urllib.parse import urlsplit


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Providers:
    def __init__(self, root):
        self.path = root / 'providers.json'
        self.lock = threading.RLock()

    def read(self):
        with self.lock:
            return json.loads(self.path.read_text(encoding='utf-8')) if self.path.exists() else {'enabled':False,'text':{},'vision':{}}

    def public(self):
        config=self.read()
        return {'enabled':config['enabled'],'engine':config.get('engine','api'),
            'codex':{'model':'gpt-6-luna','reasoning_effort':'xhigh','service_tier':'fast',
                     'authentication':'local_codex_chatgpt','requires_desktop':True},
            **{kind:{'base_url':config.get(kind,{}).get('base_url',''),
            'model':config.get(kind,{}).get('model',''),'configured':bool(config.get(kind,{}).get('model')),
            'has_key':bool(config.get(kind,{}).get('api_key'))} for kind in ('text','vision')}}

    def save(self, value):
        with self.lock:
            previous=self.read()
            config={'enabled':bool(value.get('enabled',False)),
                    'engine':value.get('engine') or previous.get('engine','api')}
            if config['engine'] not in ('api','codex'):
                raise ValueError('Choose api or codex execution.')
            for kind in ('text','vision'):
                incoming=value.get(kind)
                item=dict(previous.get(kind,{})) if incoming is None else dict(incoming)
                if incoming is not None and incoming.get('api_key') is None:
                    item['api_key']=previous.get(kind,{}).get('api_key','')
                if item.get('model'):
                    url=urlsplit(item.get('base_url',''))
                    if url.username or url.password or url.query or url.fragment or not url.hostname:
                        raise ValueError('Use a provider base URL without credentials, query, or fragment.')
                    if url.scheme!='https' and not (url.scheme=='http' and url.hostname in ('localhost','127.0.0.1','::1')):
                        raise ValueError('Providers require HTTPS, except a local model server.')
                    if len(item['model'])>200 or len(item.get('api_key') or '')>4000:
                        raise ValueError('Provider settings are too long.')
                    item['base_url']=item['base_url'].rstrip('/')
                config[kind]=item
            if config['enabled'] and config['engine']=='api' and not config['text'].get('model'):
                raise ValueError('Configure a text model before enabling API execution.')
            if config['enabled'] and config['engine']=='codex':
                from .codex_provider import login_status
                if not login_status()['chatgpt_login']:
                    raise ValueError('Sign in to the local Codex CLI with ChatGPT before enabling Codex execution.')
            temporary=self.path.with_suffix('.tmp')
            temporary.write_text(json.dumps(config),encoding='utf-8')
            temporary.replace(self.path)
            return self.public()

    def infer(self, runtime, slot, job):
        runtime.budget.model_call(job, runtime.identity(slot)[1])
        config=self.read()
        if config.get('engine')=='codex':
            from .codex_provider import infer
            return infer(runtime,slot,job)
        images=[m for m in job['payload'].get('messages',[]) if m.get('media',{}).get('kind') in ('image','sticker')]
        kind='vision' if images else 'text'
        provider=config.get(kind,{})
        if not provider.get('model'):
            raise ValueError('Configure an image-capable vision model or process this job through a vision-capable MCP agent.' if images else 'Configure a text model.')
        content=[{'type':'text','text':json.dumps({'context':job['payload'],'schema':job['result_schema']},ensure_ascii=False)}]
        if len(images)>12:
            raise ValueError('This conversation exceeds 12 images per analysis. Process it with the MCP agent or narrow its scope.')
        for message in images:
            data=runtime.image(slot,job['id'],job['lease'],message['id'])
            content.append({'type':'text','text':'Image for message ID '+message['id']})
            content.append({'type':'image_url','image_url':{'url':'data:image/jpeg;base64,'+base64.b64encode(data).decode()}})
        payload={'model':provider['model'],'messages':[
            {'role':'system','content':job['instructions']+' Return only a JSON object conforming to the supplied schema.'},
            {'role':'user','content':content if images else content[0]['text']}],
            'response_format':{'type':'json_object'}}
        headers={'Content-Type':'application/json'}
        if provider.get('api_key'):
            headers['Authorization']='Bearer '+provider['api_key']
        request=urllib.request.Request(provider['base_url']+'/chat/completions',data=json.dumps(payload).encode(),headers=headers,method='POST')
        try:
            with urllib.request.build_opener(NoRedirect()).open(request,timeout=100) as response:
                data=response.read(4*1024*1024+1)
            if len(data)>4*1024*1024:
                raise ValueError('Model response exceeds 4 MB.')
            choice=json.loads(data)['choices'][0]
            if choice.get('finish_reason') not in ('stop',None):
                raise ValueError('Model output was incomplete; use a model with sufficient output capacity.')
            return json.loads(choice['message']['content'])
        except urllib.error.HTTPError as exc:
            raise ValueError(f'{kind.title()} provider returned HTTP {exc.code}. Check model access and provider settings.') from None
        except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError):
            raise ValueError('Model request failed or returned invalid JSON. No result was accepted.') from None


class APIWorkers:
    def __init__(self, runtime, providers):
        self.runtime=runtime
        self.providers=providers
        self.closed=threading.Event()
        self.pool=ThreadPoolExecutor(max_workers=3,thread_name_prefix='wabuddy-ai')
        self.futures=set()
        self.thread=None
        self.last_slot=None

    def start(self):
        self.thread=threading.Thread(target=self._loop,daemon=True,name='wabuddy-ai-dispatch')
        self.thread.start()

    def close(self):
        self.closed.set()
        if self.thread:
            self.thread.join(timeout=5)
        self.pool.shutdown(wait=True,cancel_futures=True)

    def _execute(self, slot, job):
        try:
            value=self.providers.infer(self.runtime,slot,job)
            try:
                self.runtime.complete(slot,job['id'],job['lease'],value)
            except ValueError as exc:
                from pydantic import ValidationError
                recoverable=isinstance(exc,ValidationError) or str(exc).startswith((
                    'Evidence ', 'Orders require ', 'Findings must ', 'Finding evidence ',
                    'Proposed replies require ', 'Image observation ', 'Plan conversation IDs '))
                if not recoverable: raise
                feedback='Output did not match the required JSON schema.' if isinstance(exc,ValidationError) else str(exc)
                repair={**job,'instructions':job['instructions']+' Correct the rejected output using validation_feedback. Evidence quotes must be exact contiguous substrings of the identified source message or your image observation; never paraphrase a quote.',
                        'payload':{**job['payload'],'validation_feedback':feedback,'rejected_output':value}}
                value=self.providers.infer(self.runtime,slot,repair)
                self.runtime.complete(slot,job['id'],job['lease'],value)
        except Exception as exc:
            # Never store raw provider response bodies or credentials in job errors.
            error=str(exc) if isinstance(exc,ValueError) and len(str(exc))<1000 else 'Agent execution failed. No result was accepted.'
            try:
                self.runtime.fail(slot,job['id'],job['lease'],error)
            except ValueError:
                pass

    def _loop(self):
        while not self.closed.wait(1):
            self.futures={f for f in self.futures if not f.done()}
            if len(self.futures)>=3 or not self.providers.read()['enabled']:
                continue
            with self.runtime.store.db() as db:
                slots=sorted({r[0].split('|')[0] for r in db.execute("SELECT DISTINCT ns FROM jobs WHERE status IN ('queued','working')")})
            if self.last_slot in slots:
                pivot=slots.index(self.last_slot)+1
                slots=slots[pivot:]+slots[:pivot]
            for slot in slots:
                try:
                    # One job per account per pass; a busy account cannot monopolize all workers.
                    if len(self.futures)<3:
                        job=self.runtime.claim(slot)
                        if not job:
                            continue
                        self.futures.add(self.pool.submit(self._execute,slot,job))
                        self.last_slot=slot
                except (ValueError,RuntimeError):
                    continue
