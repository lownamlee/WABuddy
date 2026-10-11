"""Real WhatsApp -> leased reasoning jobs -> validated evidence and durable artifacts.

No model is impersonated. Jobs wait for an MCP agent or configured API worker.
"""
from __future__ import annotations

import hashlib
from io import BytesIO
import json
from pathlib import Path
import threading
import time
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .agent_store import AgentStore, encode
from .agent_models import (GoalPlan, ConversationAnalysis, Verification,
                           PLAN_INSTRUCTIONS, ANALYSIS_INSTRUCTIONS, VERIFY_INSTRUCTIONS)
from .agent_reports import create_workbook, sheet_rows
from .demo_commands import command_plan
from .chat_store import display_phone
from .usage_limits import UsageBudget, UsageLimit, PROMPT_LIMIT, MAX_CONVERSATIONS


def digest(value):
    return hashlib.sha256(encode(value).encode()).hexdigest()


def next_daily(schedule, after):
    try:
        zone=ZoneInfo(schedule['timezone'])
    except (ZoneInfoNotFoundError,ValueError):
        raise ValueError('Unknown schedule timezone.') from None
    now=datetime.fromtimestamp(after,zone)
    hour,minute=map(int,schedule['time'].split(':'))
    target=now.replace(hour=hour,minute=minute,second=0,microsecond=0)
    if target<=now:
        target+=timedelta(days=1)
    return target.timestamp()


class AgentRuntime:
    def __init__(self, registry):
        self.registry = registry
        self.store = AgentStore(registry.root / 'agent')
        self.budget = UsageBudget(self.store.root)
        self.lock = threading.RLock()
        self.closed = threading.Event()
        self.thread = None

    def identity(self, slot):
        service = self.registry.get(slot)
        jid = service.chats.account()
        if not jid:
            raise ValueError('Link a WhatsApp account first.')
        return service, slot + '|' + jid

    def start(self):
        self.thread = threading.Thread(target=self._watch, name='wabuddy-agent-monitor', daemon=True)
        self.thread.start()

    def close(self):
        self.closed.set()
        if self.thread:
            self.thread.join(timeout=10)

    def _watch(self):
        while not self.closed.wait(3):
            try:
                with self.store.db() as db:
                    slots = {r[0].split('|')[0] for r in db.execute('SELECT DISTINCT ns FROM documents')}
                for slot in slots:
                    if self.closed.is_set():
                        break
                    try:
                        self.tick(slot)
                    except (ValueError, RuntimeError, OSError):
                        continue  # A disconnected account never borrows another account's data.
            except Exception:
                # Keep the monitor alive; individual run failures are surfaced by tick/complete.
                continue

    def conversations(self, slot):
        service, _ = self.identity(slot)
        account = service.chats.account()
        with service.chats.db() as db:
            rows = db.execute('''SELECT m.chat,m.id,m.text,m.outgoing,m.sender,m.ts,m.extra,
                COALESCE(c.name,'') AS name FROM messages m
                LEFT JOIN chats c ON c.account=m.account AND c.jid=m.chat
                WHERE m.account=? ORDER BY m.chat,m.ts,m.id''', (account,)).fetchall()
        result = {}
        for row in rows:
            metadata = json.loads(row['extra'] or '{}')
            if metadata.get('deleted'):
                continue
            chat = result.setdefault(row['chat'], {'chat':row['chat'], 'customer':row['name'] or display_phone(row['chat']), 'messages':[]})
            # Do not pass raw protobuf, media keys, session information or arbitrary metadata.
            chat['messages'].append({'id':row['id'], 'text':row['text'], 'outgoing':bool(row['outgoing']),
                                     'sender':row['sender'], 'timestamp':row['ts'],
                                     **{key:metadata[key] for key in ('media','caption','reply') if key in metadata}})
        return list(result.values())

    def submit(self, slot, prompt, request_id, followup_of=None, replace_schedule=None):
        if not prompt.strip() or len(prompt)>PROMPT_LIMIT:
            raise ValueError(f'Enter a goal of up to {PROMPT_LIMIT} characters.')
        with self.lock, self.store.atomic():
            _, ns = self.identity(slot)
            run_id = digest([ns,request_id])[:32]
            old = self.store.get(ns,'run',run_id)
            if old:
                if old['prompt'] != prompt or old.get('followup_of') != followup_of or old.get('requested_schedule') != replace_schedule:
                    raise ValueError('Request ID already belongs to another goal.')
                return self.run(slot,run_id)
            active = [r for r in self.store.list(ns,'run') if r['status'] in ('waiting_for_agent','running')]
            if len(active) >= 3:
                raise UsageLimit('Three tasks are already active. Wait for a result or cancel a task first.')
            if not self.budget.capacity(ns,acquire=True)['available']:
                raise UsageLimit('AI capacity is full. WhatsApp chat remains available. Try again later.')
            self.budget.reserve('goal', run_id, ns)
            goal=prompt
            schedule_id=replace_schedule
            if followup_of:
                previous=self.store.get(ns,'run',followup_of)
                if not previous or previous['status']!='needs_input':
                    raise ValueError('Choose an existing task that needs clarification.')
                goal='Original request: '+previous.get('reasoning_goal',previous['prompt'])+'\nBuddy asked: '+previous.get('message','')+'\nOwner clarification: '+prompt
                if len(goal) > 12000:
                    raise ValueError('This clarification thread is too long. Start a new concise request.')
                schedule_id=schedule_id or previous.get('replace_schedule')
                self.control(slot,followup_of,'cancel')
            if schedule_id and not self.store.get(ns,'policy',schedule_id):
                raise ValueError('Schedule not found in this account.')
            self.store.put(ns,'run',run_id,{'id':run_id,'prompt':prompt,'reasoning_goal':goal,'followup_of':followup_of,'replace_schedule':schedule_id,'requested_schedule':replace_schedule,'status':'waiting_for_agent',
                'created':time.time(),'source':'owner','action':None,'message':'Waiting for a reasoning agent.'})
            service,_=self.identity(slot)
            with service.chats.db() as db:
                available=[{'chat':r[0],'name':r[1] or display_phone(r[0])} for r in db.execute(
                    "SELECT DISTINCT m.chat,COALESCE(c.name,'') FROM messages m LEFT JOIN chats c ON c.account=m.account AND c.jid=m.chat WHERE m.account=? LIMIT 1000",(service.chats.account(),))]
            shortcut=command_plan(goal,available,MAX_CONVERSATIONS,self.store.get(ns,'settings','demo_scope',[])) if not followup_of and not replace_schedule else None
            if shortcut:
                run=self.store.get(ns,'run',run_id)
                run.update(routing='command',reasoning_goal=shortcut['explanation'],routed_at=time.time())
                self._execute_plan(slot,ns,run,shortcut,run_id+'-router')
                self._settle(slot,ns,run_id)
            else:
                self.store.enqueue(ns,run_id,'plan',{'goal':goal,'available_conversations':available},run_id+'-plan')
            return self.run(slot,run_id)

    def run(self, slot, run_id):
        _, ns = self.identity(slot)
        run = self.store.get(ns,'run',run_id)
        if not run:
            raise ValueError('Run not found in this account.')
        jobs = self.store.jobs(ns,run_id)
        nodes = []
        if run.get('routing')=='command':
            nodes.append({'id':run_id+'-router','role':'Command router','kind':'tool','status':'done',
                'title':'Recognize command','detail':'Matched a built-in owner command; no model call.',
                'depends':[],'started':run['created'],'finished':run['routed_at']})
        for job in jobs:
            role = {'plan':'Coordinator','analysis':'Conversation / Order agent','verify':'Verifier'}.get(job['kind'],job['kind'])
            if job['kind']=='analysis' and any(m.get('media',{}).get('kind') in ('image','sticker') for m in job['payload'].get('messages',[])):
                role='Vision / Order agent'
            branch=job['payload'].get('branch','all')
            if job['kind']=='analysis' and branch!='all':
                role='Text orders agent' if branch=='text' else 'Image orders agent'
            status='rejected' if job['kind']=='verify' and job['status']=='done' and not job['result'].get('approved') else job['status']
            detail=job['result'].get('reason') or job['result'].get('explanation') or ''
            if job['kind']=='analysis' and job['status']=='done':
                detail=f"{len(job['result'].get('orders',[]))} order records; {len(job['result'].get('findings',[]))} findings."
            nodes.append({'id':job['id'],'role':role,'kind':'agent','status':status,'detail':detail,
                'title':('Read text orders' if branch=='text' else 'Read image orders') if job['kind']=='analysis' and branch!='all' else {'plan':'Understand your goal','analysis':'Read conversation','verify':'Check evidence'}[job['kind']],
                'chat':job['payload'].get('chat'), 'depends':job['payload'].get('depends',[]),
                'created':job['created'],'started':job['started'],'finished':job['finished'],'error':job['error']})
        if run.get('action') in ('export_orders','watch_orders') and not run.get('scheduled'):
            nodes.append({'id':run_id+'-export','role':'Spreadsheet tool','kind':'tool','title':'Publish live spreadsheet',
                'status':'done' if run.get('artifact') else 'queued','depends':[j['id'] for j in jobs if j['kind']=='verify']})
        return {**run,'nodes':nodes,'mode':'live','account_id':slot}

    def context(self, slot):
        service, ns = self.identity(slot)
        with service.chats.db() as db:
            stats = db.execute('SELECT COUNT(*),COUNT(DISTINCT chat),SUM(CASE WHEN outgoing=0 THEN 1 ELSE 0 END) FROM messages WHERE account=?', (service.chats.account(),)).fetchone()
            activity = [dict(row) for row in db.execute("""SELECT date(ts,'unixepoch') AS date,
                SUM(CASE WHEN outgoing=0 THEN 1 ELSE 0 END) AS incoming,
                SUM(CASE WHEN outgoing=1 THEN 1 ELSE 0 END) AS outgoing
                FROM messages WHERE account=? AND ts>=? AND COALESCE(json_extract(extra,'$.deleted'),0)=0
                GROUP BY date(ts,'unixepoch') ORDER BY date""", (service.chats.account(),time.time()-91*86400))]
            names = {r['jid']:r['name'] or display_phone(r['jid']) for r in db.execute(
                'SELECT jid,name FROM chats WHERE account=?',(service.chats.account(),))}
        artifacts=self.store.list(ns,'artifact')
        previews=[]
        # The preview comes from the same immutable analyses as the latest export.
        for artifact in artifacts:
            export=self.store.get(ns,'run',artifact['run'],{})
            analyses=self.store.list(ns,'analysis') if export.get('source')=='schedule' and export.get('action')=='watch_orders' else [a for a in self.store.list(ns,'run_analysis') if a['run']==artifact['run']]
            for analysis in analyses:
                for i,order in enumerate(analysis.get('orders',[])):
                    previews.append({**order,'id':analysis['chat']+':'+str(i),'customer':analysis.get('customer') or names.get(analysis['chat'],analysis['chat']),'artifact_id':artifact['id']})
        return {'mode':'live','account_id':slot,'connection':service.snapshot()['status'],
            'coverage':'Messages synchronized to this linked device; WhatsApp may not provide full historical history.',
            'message_count':stats[0],'conversation_count':stats[1],'incoming_count':stats[2] or 0,
            'runs':[self.run(slot,r['id']) for r in self.store.list(ns,'run')[:100]],
            'schedules':self.store.list(ns,'policy'),'artifacts':artifacts,'order_preview':previews[:100],
            'activity':activity,'activity_timezone':'UTC',
            'attention':[{**a,'customer':names.get(a['chat'],display_phone(a['chat']))} for a in self.store.list(ns,'attention')],
            'knowledge':[{**k,'customer':names.get(k['chat'],display_phone(k['chat']))} for k in self.store.list(ns,'knowledge')]}

    def claim(self, slot):
        with self.lock:
            _, ns = self.identity(slot)
            job = self.store.claim(ns)
            if not job:
                return None
            schema, instructions = {
                'plan':(GoalPlan,PLAN_INSTRUCTIONS),
                'analysis':(ConversationAnalysis,ANALYSIS_INSTRUCTIONS),
                'verify':(Verification,VERIFY_INSTRUCTIONS),
            }[job['kind']]
            run = self.store.get(ns,'run',job['run'])
            run['status']='running'
            self.store.put(ns,'run',run['id'],run)
            result_schema=schema.model_json_schema()
            branch=job['payload'].get('branch','all')
            if job['kind']=='analysis' and branch!='all':
                instructions+=' This conversation is being read in parallel by text and image specialists. You own ONLY '+('non-image' if branch=='text' else 'image/sticker')+' inbound message anchors. Return orders and findings only when their anchor/message_id belongs to your partition. Read the full conversation for corrections, cancellations and context across both partitions. Do not duplicate the other specialist\'s orders. Record image observations only for images you inspected.'
            if job['kind']=='plan':
                available=[c['chat'] for c in job['payload'].get('available_conversations',[])]
                choices=result_schema['properties']['conversation_ids']
                if available:
                    choices['items']['enum']=available
                else:
                    choices['maxItems']=0
            return {k:job[k] for k in ('id','run','kind','payload','lease','expires')} | {
                'instructions':instructions,'result_schema':result_schema}

    def _validate_analysis(self, payload, value):
        data = ConversationAnalysis.model_validate(value).model_dump()
        messages = {m['id']:m for m in payload['messages']}
        for key, observation in data['image_observations'].items():
            if key not in messages or messages[key].get('media',{}).get('kind') not in ('image','sticker'):
                raise ValueError('Image observation must reference a supplied image message.')
            if len(observation)>10000:
                raise ValueError('Image observation is too long.')
        def evidence(item):
            message = messages.get(item['message_id'])
            if not message:
                raise ValueError('Evidence references a message outside this conversation.')
            source = message['text'] + '\n' + data['image_observations'].get(item['message_id'],'')
            if item['quote'] not in source:
                raise ValueError('Evidence must quote supplied text or an attributed image observation.')
        anchors = set()
        def owns(message):
            branch=payload.get('branch','all')
            image=message.get('media',{}).get('kind') in ('image','sticker')
            return branch=='all' or (image if branch=='image' else not image)
        for order in data['orders']:
            anchor = messages.get(order['anchor'])
            if not anchor or anchor['outgoing'] or order['anchor'] in anchors:
                raise ValueError('Orders require unique inbound message anchors.')
            if not owns(anchor):
                raise ValueError('Orders require anchors from your assigned text/image partition.')
            anchors.add(order['anchor'])
            for item in order['evidence']:
                evidence(item)
            for field in ('quantity','unit_price','currency'):
                if order[field] is None and field not in order['missing']:
                    order['missing'].append(field)
        known = {k['id'] for k in payload.get('knowledge',[])}
        for finding in data['findings']:
            if finding['message_id'] not in messages or messages[finding['message_id']]['outgoing']:
                raise ValueError('Findings must refer to incoming messages.')
            if not owns(messages[finding['message_id']]):
                raise ValueError('Findings must refer to your assigned text/image partition.')
            evidence(finding['evidence'])
            if finding['evidence']['message_id'] != finding['message_id']:
                raise ValueError('Finding evidence must identify the flagged message.')
            if finding['answer'] and (not finding['knowledge_ids'] or not set(finding['knowledge_ids'])<=known):
                raise ValueError('Proposed replies require current approved knowledge citations.')
        for message in payload['messages']:
            media = message.get('media')
            if media and message['id'] not in data['image_observations']:
                data['limitations'].append('Attachment not interpreted: '+message['id']+' ('+media['kind']+')')
        return data

    def complete(self, slot, job_id, lease, value):
        with self.lock, self.store.atomic():
            _, ns = self.identity(slot)
            job = self.store.leased(ns,job_id,lease)
            if job['status']=='done':
                return self.run(slot,job['run'])
            run = self.store.get(ns,'run',job['run'])
            if job['kind']=='plan':
                plan = GoalPlan.model_validate(value).model_dump()
                available={c['chat'] for c in job['payload'].get('available_conversations',[])}
                if any(chat not in available for chat in plan['conversation_ids']):
                    raise ValueError('Plan conversation IDs must match exact chat IDs from available_conversations.')
                if plan.get('schedule'):
                    next_daily(plan['schedule'],time.time())
                    if plan['action']!='export_orders':
                        raise ValueError('Daily scheduling currently supports order reports only.')
                self.store.finish(ns,job_id,lease,plan)
                self._execute_plan(slot,ns,run,plan,job_id)
            elif job['kind']=='analysis':
                result = self._validate_analysis(job['payload'],value)
                inspected=self.store.get(ns,'image_access',job_id,[])
                if not set(result['image_observations'])<=set(inspected):
                    raise ValueError('Inspect each image through the job image endpoint before submitting observations.')
                self.store.finish(ns,job_id,lease,result)
                parts=[j for j in self.store.jobs(ns,run['id']) if j['kind']=='analysis' and
                       j['payload']['chat']==job['payload']['chat'] and j['payload'].get('attempt',0)==job['payload'].get('attempt',0)]
                if all(j['status']=='done' for j in parts):
                    candidate={'orders':[],'findings':[],'limitations':[],'image_observations':{}}
                    for part in parts:
                        for key in ('orders','findings','limitations'): candidate[key].extend(part['result'][key])
                        candidate['image_observations'].update(part['result']['image_observations'])
                    # A sibling may have inspected an attachment this branch did not.
                    # Remove only our exact generated warning once the merged evidence
                    # contains an observation; retain all actual model limitations.
                    interpreted={f"Attachment not interpreted: {m['id']} ({m['media']['kind']})"
                        for m in job['payload']['messages'] if m.get('media') and
                        candidate['image_observations'].get(m['id'],'').strip()}
                    candidate['limitations']=[s for s in dict.fromkeys(candidate['limitations']) if s not in interpreted]
                    self.store.enqueue(ns,run['id'],'verify',{**job['payload'],'branch':'all','candidate':candidate,'analysis_job':job_id,
                        'depends':[p['id'] for p in parts]}, job_id+'-verify')
            else:
                result = Verification.model_validate(value).model_dump()
                if result['approved']:
                    observed=job['payload']['candidate']['image_observations']
                    inspected=self.store.get(ns,'image_access',job_id,[])
                    if not set(observed)<=set(inspected):
                        raise ValueError('The verifier must inspect the images supporting the proposed analysis.')
                self.store.finish(ns,job_id,lease,result)
                if result['approved']:
                    analysis = {**job['payload']['candidate'],'chat':job['payload']['chat'],
                        'customer':job['payload']['customer'],'fingerprint':job['payload']['fingerprint'],
                        'run':run['id'],'captured_at':job['payload']['captured_at'],'verified_at':time.time(),
                        'review_kinds':job['payload'].get('review_kinds',[])}
                    self.store.put(ns,'run_analysis',run['id']+'|'+analysis['chat'],analysis)
                    old=self.store.get(ns,'analysis',analysis['chat'])
                    if not old or old['captured_at']<=analysis['captured_at']:
                        self.store.put(ns,'analysis',analysis['chat'],analysis)
                        self._findings(ns,analysis)
                elif job['payload'].get('attempt',0)<1:
                    payload = {k:v for k,v in job['payload'].items() if k not in ('candidate','analysis_job')}
                    payload.update(attempt=1,correction=result['reason'],depends=[job_id])
                    self.store.enqueue(ns,run['id'],'analysis',payload,job_id+'-repair')
                else:
                    run.update(status='needs_input',message='Independent verification failed: '+result['reason'])
                    self.store.put(ns,'run',run['id'],run)
            self._settle(slot,ns,run['id'])
            return self.run(slot,run['id'])

    def _execute_plan(self, slot, ns, run, plan, parent):
        action=plan['action']
        run.update(action=action,message=plan['explanation'],conversation_ids=plan.get('conversation_ids',[]))
        if run.get('replace_schedule') and action!='clarify':
            if not plan.get('schedule') and action not in ('watch_orders','learn_answers','filter_phishing','stop_monitoring'):
                run.update(status='needs_input',message='Describe the new time or trigger for this schedule.')
                self.store.put(ns,'run',run['id'],run)
                return
            previous=self.store.get(ns,'policy',run['replace_schedule'])
            if previous:
                previous['enabled']=False
                self.store.put(ns,'policy',previous['id'],previous)
        if plan.get('schedule'):
            policy_id='daily-'+run['id']
            self.store.put(ns,'policy',policy_id,{'id':policy_id,'trigger':'daily','enabled':True,
                'created':time.time(),'goal':run.get('reasoning_goal',run['prompt']),'source_run':run['id'],
                'schedule':plan['schedule'],'conversation_ids':run['conversation_ids'],'next_run':next_daily(plan['schedule'],time.time())})
            run.update(status='completed',message='Daily order report scheduled.',scheduled=True)
            self.store.put(ns,'run',run['id'],run)
            return
        if action=='clarify':
            run['status']='needs_input'
        elif action=='stop_monitoring':
            for policy in self.store.list(ns,'policy'):
                policy['enabled']=False
                self.store.put(ns,'policy',policy['id'],policy)
            run['status']='completed'
        else:
            if action in ('watch_orders','learn_answers','filter_phishing'):
                self.store.put(ns,'policy',action,{'id':action,'trigger':'message_changed','enabled':True,
                    'created':time.time(),'goal':run.get('reasoning_goal',run['prompt']),'source_run':run['id'],'conversation_ids':run['conversation_ids']})
            run['status']='running'
            self.store.put(ns,'run',run['id'],run)
            self._queue_conversations(slot,ns,run,parent)
            return
        self.store.put(ns,'run',run['id'],run)

    def _queue_conversations(self, slot, ns, run, parent=None, changed_only=False):
        conversations=self.conversations(slot)
        selected=run.get('conversation_ids',[])
        if selected:
            if any(chat not in {c['chat'] for c in conversations} for chat in selected):
                raise ValueError('Selected conversation is not available in this account.')
            conversations=[c for c in conversations if c['chat'] in selected]
        if len(conversations) > MAX_CONVERSATIONS:
            run.update(status='needs_input',message=f'The current AI budget allows {MAX_CONVERSATIONS} conversations per task. Tell Buddy which customers or phone numbers to include. No conversations were silently omitted.')
            self.store.put(ns,'run',run['id'],run)
            return
        knowledge=self.store.list(ns,'knowledge')
        run['chats']=[]
        run['message_count']=sum(len(c['messages']) for c in conversations)
        for conversation in conversations:
            chat=conversation['chat']
            relevant=[k for k in knowledge if k.get('scope')=='business' or k.get('chat')==chat]
            fingerprint=digest([conversation['messages'],relevant])
            previous=self.store.get(ns,'analysis',chat)
            if changed_only and previous and previous['fingerprint']==fingerprint:
                continue
            run['chats'].append(chat)
            if len(conversation['messages'])>2000 or len(encode(conversation))>250000:
                run.update(status='needs_input',message='A conversation exceeds the current analysis limit (2000 messages / 250 KB). Nothing was silently truncated.')
                continue
            policies=[p for p in self.store.list(ns,'policy') if p['enabled'] and
                      (not p.get('conversation_ids') or chat in p['conversation_ids'])]
            review_kinds=[kind for policy,kind in (('learn_answers','question'),('filter_phishing','phishing'))
                          if any(p['id']==policy for p in policies)]
            payload={**conversation,'goal':run.get('reasoning_goal',run['prompt']),'action':run.get('action'),
                'owner_policies':[p['goal'] for p in policies],'review_kinds':review_kinds,
                'fingerprint':fingerprint,'knowledge':relevant,'depends':[parent] if parent else [],'attempt':0,'captured_at':time.time()}
            inbound=[m for m in conversation['messages'] if not m['outgoing']]
            has_image=any(m.get('media',{}).get('kind') in ('image','sticker') for m in inbound)
            has_text=any(m.get('media',{}).get('kind') not in ('image','sticker') for m in inbound)
            branches=['text','image'] if has_image and has_text else ['all']
            for branch in branches:
                self.store.enqueue(ns,run['id'],'analysis',{**payload,'branch':branch},digest([run['id'],chat,branch]))
        self.store.put(ns,'run',run['id'],run)

    def _findings(self, ns, analysis):
        policies={p['id'] for p in self.store.list(ns,'policy') if p['enabled'] and
                  (not p.get('conversation_ids') or analysis['chat'] in p['conversation_ids'])}
        reviewed=set(analysis.get('review_kinds',[])) & {
            kind for policy,kind in (('learn_answers','question'),('filter_phishing','phishing')) if policy in policies}
        # Resolve old machine findings when re-analysis no longer finds the issue.
        # An order-only scan did not review questions/security and cannot clear them.
        active={f['message_id']+':'+f['kind'] for f in analysis['findings']}
        for old in self.store.list(ns,'attention'):
            if old['kind'] in reviewed and old['chat']==analysis['chat'] and old['message_id']+':'+old['kind'] not in active and old['status']=='open':
                old['status']='resolved'
                self.store.put(ns,'attention',old['id'],old)
        for finding in analysis['findings']:
            if finding['kind'] not in reviewed:
                continue
            key=digest([analysis['chat'],finding['message_id'],finding['kind']])[:32]
            existing=self.store.get(ns,'attention',key)
            if existing and existing['status']=='answered':
                continue
            self.store.put(ns,'attention',key,{'id':key,**finding,'chat':analysis['chat'],
                'status':'open','created':time.time(),'filtered':finding['kind']=='phishing',
                'delivery':'draft_only','run':analysis['run']})

    def _settle(self, slot, ns, run_id):
        run=self.store.get(ns,'run',run_id)
        if run['status'] in ('needs_input','cancelled','completed'):
            return
        jobs=self.store.jobs(ns,run_id)
        if any(j['status']=='failed' for j in jobs):
            run.update(status='failed',message='A task failed. Retry after resolving the reported error.')
        elif any(j['status']!='done' for j in jobs):
            return
        elif run.get('action'):
            if run['action'] in ('export_orders','watch_orders'):
                analyses=self.store.list(ns,'analysis') if run.get('source')=='schedule' and run['action']=='watch_orders' else [a for a in self.store.list(ns,'run_analysis') if a['run']==run_id]
                # Only current synchronized conversations, never old removed histories.
                current={c['chat'] for c in self.conversations(slot)}
                if run.get('conversation_ids'): current &= set(run['conversation_ids'])
                analyses=[a for a in analyses if a['chat'] in current]
                coverage=f"{len(analyses)} synchronized conversations; {run.get('message_count',0)} messages in scan. Device-synchronized history only; attachment limits listed separately."
                content,count,totals=create_workbook(analyses,coverage)
                artifact_id=digest([ns,'orders'])[:32]
                target=self.store.root / (artifact_id+'.xlsx')
                temporary=target.with_suffix('.tmp')
                temporary.write_bytes(content)
                temporary.replace(target)
                previous=self.store.get(ns,'artifact',artifact_id,{})
                artifact={'id':artifact_id,'name':'WhatsApp orders.xlsx','revision':previous.get('revision',0)+1,
                    'records':count,'totals':totals,'coverage':coverage,'updated':time.time(),
                    'download_url':'/api/agent/artifacts/'+artifact_id,'run':run_id,'verified':True}
                self.store.put(ns,'artifact',artifact_id,artifact)
                self.store.put(ns,'sheet','orders',{**artifact,'name':'Orders','rows':sheet_rows(analyses),
                    'limitations':list(dict.fromkeys(l for a in analyses for l in a['limitations']))})
                run['artifact']=artifact
            run.update(status='completed',message='Completed using synchronized WhatsApp messages.',completed=time.time())
        self.store.put(ns,'run',run_id,run)

    def sheet(self, slot, offset=0, limit=100, query='', status='all'):
        _,ns=self.identity(slot)
        if offset<0 or not 1<=limit<=100 or len(query)>200 or status not in ('all','confirmed','cancelled','draft','inquiry'):
            raise ValueError('Invalid spreadsheet filter or page.')
        sheet=self.store.get(ns,'sheet','orders')
        if not sheet:
            return {'name':'Orders','revision':0,'rows':[],'records':0,'matched':0,'totals':{},'limitations':[],'offset':0,'limit':limit}
        rows=[r for r in sheet['rows'] if (status=='all' or r['status']==status) and
              (not query or query.casefold() in (r['customer']+' '+r['item']+' '+r['delivery']).casefold())]
        return {**sheet,'rows':rows[offset:offset+limit],'matched':len(rows),'offset':offset,'limit':limit}

    def set_demo_scope(self, slot, conversation_ids):
        with self.lock:
            _,ns=self.identity(slot)
            available={c['chat'] for c in self.conversations(slot)}
            if not 1<=len(conversation_ids)<=MAX_CONVERSATIONS or len(set(conversation_ids))!=len(conversation_ids) or any(c not in available for c in conversation_ids):
                raise ValueError('Select one to five unique synchronized conversations from this account.')
            self.store.put(ns,'settings','demo_scope',conversation_ids)
            return {'conversation_ids':conversation_ids,'commands':['demo orders','demo learn','demo phishing','demo stop']}

    def tick(self, slot):
        with self.lock:
            service,ns=self.identity(slot)
            policies=[p for p in self.store.list(ns,'policy') if p['enabled']]
            if not policies or service.snapshot()['status']!='connected':
                return
            if any(p['id']=='learn_answers' for p in policies):
                self._learn_owner_replies(slot,ns)
            # Active jobs must settle before monitoring takes another snapshot.
            # An unrelated owner request awaiting clarification must not disable
            # existing schedules. Failed scheduled work still needs intervention
            # so an unchanged input cannot repeatedly consume the model budget.
            if any(r['status'] in ('running','waiting_for_agent') or
                   (r.get('source')=='schedule' and r['status'] in ('failed','needs_input'))
                   for r in self.store.list(ns,'run')):
                return
            due=[p for p in policies if p['trigger']=='daily' and p['next_run']<=time.time()]
            if due:
                policy=due[0]
                run_id=digest([ns,policy['id'],policy['next_run']])[:32]
                run={'id':run_id,'prompt':policy['goal'],'status':'waiting_for_agent','created':time.time(),
                    'source':'schedule','action':'export_orders','conversation_ids':policy.get('conversation_ids',[]),'message':'Scheduled report is due.'}
                self.store.put(ns,'run',run_id,run)
                self._queue_conversations(slot,ns,run)
                self._settle(slot,ns,run_id)
                policy['next_run']=next_daily(policy['schedule'],time.time())
                self.store.put(ns,'policy',policy['id'],policy)
                return
            if not any(p['trigger']=='message_changed' for p in policies):
                return
            conversations=self.conversations(slot)
            watched=[p for p in policies if p['trigger']=='message_changed']
            selected=[] if any(not p.get('conversation_ids') for p in watched) else list({chat for p in watched for chat in p['conversation_ids']})
            if selected:
                conversations=[c for c in conversations if c['chat'] in selected]
            knowledge=self.store.list(ns,'knowledge')
            changed=False
            for c in conversations:
                relevant=[k for k in knowledge if k.get('scope')=='business' or k.get('chat')==c['chat']]
                old=self.store.get(ns,'analysis',c['chat'])
                if not old or old['fingerprint']!=digest([c['messages'],relevant]):
                    changed=True
                    break
            if not changed:
                return
            run_id=uuid.uuid4().hex
            action='watch_orders' if any(p['id']=='watch_orders' for p in policies) else 'monitor'
            run={'id':run_id,'prompt':'Process changed WhatsApp conversations','status':'waiting_for_agent','conversation_ids':selected,
                'created':time.time(),'source':'schedule','action':action,'message':'New or changed messages detected.'}
            self.store.put(ns,'run',run_id,run)
            self._queue_conversations(slot,ns,run,changed_only=True)
            self._settle(slot,ns,run_id)

    def _learn_owner_replies(self, slot, ns):
        """Only explicit quoted replies identify which unknown question the owner answered."""
        chats={c['chat']:c for c in self.conversations(slot)}
        for item in self.store.list(ns,'attention'):
            if item['kind']!='question' or item['status']!='open':
                continue
            messages=chats.get(item['chat'],{}).get('messages',[])
            replies=[m for m in messages if m['outgoing'] and m.get('reply',{}).get('id')==item['message_id'] and m['text'].strip() and not m.get('media')]
            if replies:
                self.answer(slot,item['id'],replies[-1]['text'],True,'customer')

    def fail(self, slot, job_id, lease, message):
        with self.lock:
            _,ns=self.identity(slot)
            job=self.store.leased(ns,job_id,lease)
            self.store.fail(ns,job_id,lease,message)
            self._settle(slot,ns,job['run'])

    def control(self, slot, run_id, action):
        with self.lock:
            _,ns=self.identity(slot)
            run=self.store.get(ns,'run',run_id)
            if not run:
                raise ValueError('Run not found.')
            if action=='cancel':
                with self.store.db() as db:
                    db.execute("UPDATE jobs SET status='cancelled',lease='' WHERE ns=? AND run=? AND status!='done'", (ns,run_id))
                run['status']='cancelled'
                run['message']='Cancelled by the owner.'
            elif action=='retry':
                if run['status']!='failed':
                    raise ValueError('Only failed runs can be retried; clarify or submit a new goal otherwise.')
                self.store.retry(ns,run_id)
                run['status']='waiting_for_agent'
                run['message']='Waiting for a reasoning agent to retry.'
            else:
                raise ValueError('Unknown run control.')
            self.store.put(ns,'run',run_id,run)
            return self.run(slot,run_id)

    def answer(self, slot, attention_id, answer, remember=True, scope='customer'):
        """Store an owner answer. Sending remains an explicit separate existing chat action."""
        if not answer.strip() or len(answer)>10000 or scope not in ('customer','business'):
            raise ValueError('Enter an owner answer and valid scope.')
        with self.lock:
            _,ns=self.identity(slot)
            item=self.store.get(ns,'attention',attention_id)
            if not item or item['kind']!='question':
                raise ValueError('Question not found.')
            item.update(status='answered',owner_answer=answer,answered_at=time.time())
            self.store.put(ns,'attention',attention_id,item)
            if remember:
                self.store.put(ns,'knowledge',attention_id,{'id':attention_id,'chat':item['chat'],'scope':scope,
                    'question':item['evidence']['quote'],'answer':answer,'source_message':item['message_id'],
                    'approved_by':'owner','updated':time.time()})
            return item

    def set_schedule(self, slot, policy_id, enabled):
        with self.lock:
            _,ns=self.identity(slot)
            policy=self.store.get(ns,'policy',policy_id)
            if not policy:
                raise ValueError('Schedule not found.')
            policy['enabled']=enabled
            if enabled and policy['trigger']=='daily':
                policy['next_run']=next_daily(policy['schedule'],time.time())
            self.store.put(ns,'policy',policy_id,policy)
            return policy

    def image(self, slot, job_id, lease, message_id):
        from .media import MediaStore
        from PIL import Image
        service,ns=self.identity(slot)
        job=self.store.leased(ns,job_id,lease)
        message=next((m for m in job['payload'].get('messages',[]) if m['id']==message_id),None)
        if not message or message.get('media',{}).get('kind') not in ('image','sticker'):
            raise ValueError('Image is not in the leased conversation.')
        media=MediaStore(service.chats)
        row=media.get(message['media']['id'])
        if row['data'] is None:
            service.download_media(row['id'])
            row=media.get(row['id'])
        if not row['data'] or len(row['data'])>20*1024*1024:
            raise ValueError('Image unavailable or exceeds the 20 MB analysis limit.')
        with Image.open(BytesIO(row['data'])) as original:
            if original.width*original.height>40000000:
                raise ValueError('Image exceeds analysis dimensions.')
            image=original.convert('RGB')
            image.thumbnail((1800,1800))
            output=BytesIO()
            image.save(output,format='JPEG',quality=90)
        with self.lock:
            inspected=self.store.get(ns,'image_access',job_id,[])
            if message_id not in inspected:
                inspected.append(message_id)
                self.store.put(ns,'image_access',job_id,inspected)
        return output.getvalue()

    def artifact(self, slot, artifact_id):
        _,ns=self.identity(slot)
        if not self.store.get(ns,'artifact',artifact_id):
            raise ValueError('Artifact not found in this account.')
        return self.store.root / (artifact_id+'.xlsx')
