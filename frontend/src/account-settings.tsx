import { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { Input } from './components/ui/input';
import { accountRequest, SKIP_INTRO_KEY, skipIntro } from './account-session';
import './account-settings.css';
import { AgentSettings } from './agent-settings';

type Account = {id: string; label: string; name: string; phone: string; mode: string; linked: boolean; status: string};
export function AccountSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [operator, setOperator] = useState(false), [maxAccounts, setMaxAccounts] = useState(1);
  const [selected, setSelected] = useState('');
  const [skip, setSkip] = useState(skipIntro);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('Personal');
  const [mode, setMode] = useState('standard');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; void accountRequest('/api/accounts').then(value => {
    if (active) { setAccounts(value.accounts); setSelected(value.selected); setOperator(value.operator === true); setMaxAccounts(value.max_accounts || 1); }
  }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  const change = async (path: string, body: unknown) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await accountRequest(path, body); location.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to switch account.'); setBusy(false); }
  };
  return <div className="account-settings">
    <div className="intro-preference"><div><strong>Skip intro</strong><small>Open the dashboard directly after login.</small></div><Switch aria-label="Skip intro" checked={skip} onCheckedChange={value => {
      try { localStorage.setItem(SKIP_INTRO_KEY, String(value)); setSkip(value); } catch { setError('Cannot save this preference in browser storage.'); }
    }}/></div>
    {operator&&<AgentSettings/>}
    <h3>WhatsApp accounts</h3><p className="account-note">This browser remembers your workspace. WhatsApp credentials stay on the host server.</p>
    <div className="account-list">{accounts.map(account => <div className="account-row" key={account.id}>
      <span className="account-monogram" aria-hidden="true">{account.mode === 'business' ? 'B' : 'S'}</span>
      <div><strong>{account.name || account.label}</strong><small>{account.phone || account.label} · {account.linked ? account.mode === 'business' ? 'Business' : 'Standard' : 'Not linked'}</small></div>
      <Button size="sm" variant="outline" disabled={busy || selected === account.id} onClick={() => void change('/api/accounts/select', {account_id: account.id})}>{selected === account.id ? 'Active' : account.linked ? 'Switch' : 'Link'}</Button>
    </div>)}</div>
    {adding ? <form className="add-account" onSubmit={e => { e.preventDefault(); void change('/api/accounts', {label, mode}); }}>
      <label>Account label<Input value={label} maxLength={60} onChange={e => setLabel(e.target.value)} placeholder="Personal" disabled={busy}/></label>
      <label>WhatsApp interface<select value={mode} onChange={e => setMode(e.target.value)} disabled={busy}><option value="standard">Standard</option><option value="business">Business</option></select></label>
      <div><Button disabled={busy} type="submit">{busy ? 'Opening…' : 'Continue to QR'}</Button><Button disabled={busy} variant="ghost" type="button" onClick={() => setAdding(false)}>Cancel</Button></div>
    </form> : accounts.length < maxAccounts && <Button variant="outline" disabled={busy || !selected} onClick={() => setAdding(true)}>Add account</Button>}
    {error && <p className="account-error" role="alert">{error}</p>}
  </div>;
}
