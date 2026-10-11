"""Small, deterministic owner-command vocabulary; never applied to customer text."""
import re

COMMANDS = {
    'orders': 'watch_orders', 'spreadsheet': 'watch_orders', 'sheet': 'watch_orders',
    'watch': 'watch_orders', 'watch orders': 'watch_orders', 'update orders': 'watch_orders',
    'update sheet': 'watch_orders', 'auto update': 'watch_orders',
    'export': 'export_orders', 'export orders': 'export_orders',
    'learn': 'learn_answers', 'remember': 'learn_answers', 'learn answers': 'learn_answers',
    'questions': 'learn_answers', 'phishing': 'filter_phishing', 'filter phishing': 'filter_phishing',
    'stop': 'stop_monitoring', 'pause': 'stop_monitoring', 'stop monitoring': 'stop_monitoring',
}
GOALS = {
    'watch_orders': 'Build the live orders spreadsheet from the selected conversations and keep it updated when messages change. Include text and image orders, corrections and cancellations. General service questions are not new orders. Do not send messages.',
    'export_orders': 'Publish the current orders to the live spreadsheet, including text and image orders, corrections and cancellations. General service questions are not new orders. This is a one-time report; do not send messages.',
    'learn_answers': 'Review customer questions. Hand unknown answers to the owner; remember quoted owner answers for that same customer. Use owner-approved knowledge to prepare drafts, never send automatically.',
    'filter_phishing': 'Review phishing patterns locally. Distinguish rehearsal examples from real incidents. Never visit links, block, report, delete or send messages.',
    'stop_monitoring': 'Pause future monitoring on this account. Preserve messages, sheets and remembered answers.',
}


def command_plan(prompt, available, limit=5, demo_scope=None):
    text=re.sub(r'\s+', ' ', prompt.strip().lower().lstrip('/')).rstrip('.!?')
    demo=text.startswith('demo ')
    if demo: text=text[5:]
    command,sep,target=text.partition(' for ')
    action=COMMANDS.get(command)
    if not action: return None
    if action=='stop_monitoring':
        if sep: return None  # A scoped stop must not silently stop the entire account.
        return {'action':action,'explanation':GOALS[action],'conversation_ids':[]}
    chosen=[]
    if sep:
        digits=re.sub(r'\D','',target)
        chosen=[c['chat'] for c in available if target==c['name'].strip().lower() or
                (len(digits)>=7 and digits==c['chat'].split('@')[0])]
        if len(chosen)!=1:
            return {'action':'clarify','explanation':'Name one synchronized customer or use their full international phone number, for example: orders for +601123456789.','conversation_ids':[]}
    elif demo and demo_scope:
        chosen=list(demo_scope)
        if any(chat not in {c['chat'] for c in available} for chat in chosen):
            return {'action':'clarify','explanation':'A saved demo conversation is no longer synchronized. Select the demo customer again.','conversation_ids':[]}
    elif len(available)>limit:
        return {'action':'clarify','explanation':f'This account has more than {limit} conversations. Use a customer name or phone number: orders for +601123456789.','conversation_ids':[]}
    else:
        chosen=[c['chat'] for c in available]
    if not chosen:
        return {'action':'clarify','explanation':'No conversation is synchronized yet. Receive a WhatsApp message, then try the command again.','conversation_ids':[]}
    return {'action':action,'explanation':GOALS[action],'conversation_ids':chosen}
