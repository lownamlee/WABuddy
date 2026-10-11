import { accountRequest } from './account-session';
import './account-settings.css';

export async function pairingAccounts() {
  const value = await accountRequest('/api/accounts');
  if (value.accounts.length > 1) {
    const label = document.createElement('label');
    label.className = 'pairing-account'; label.textContent = 'Account';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Pairing account');
    for (const account of value.accounts) {
      const option = document.createElement('option'); option.value = account.id;
      option.textContent = account.phone || account.label;
      option.selected = account.id === value.selected; select.append(option);
    }
    select.addEventListener('change', async () => {
      select.disabled = true;
      try { await accountRequest('/api/accounts/select', {account_id: select.value}); location.reload(); }
      catch (e) {
        select.value = value.selected; select.disabled = false;
        const feedback = document.querySelector<HTMLElement>('#feedback')!;
        feedback.hidden = false; feedback.textContent = e instanceof Error ? e.message : 'Unable to switch account.';
      }
    });
    label.append(select); document.body.append(label);
  }
  return value.accounts.find((account: {id: string}) => account.id === value.selected)?.linked === true;
}
