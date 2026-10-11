// Isolated visual fixture: no connector calls, QR payloads or session mutation.
// Served by Vite for development only; excluded from the production HTML entry.
import template from '../../phone-animation.html?raw';
import '../src/style.css';
import { PhoneScene } from '../src/phone';
import { homeTransition } from '../src/home';

const content = new DOMParser().parseFromString(template, 'text/html');
content.querySelectorAll('script').forEach(script => script.remove());
document.body.innerHTML = content.body.innerHTML;
document.body.dataset.stage = 'pairing';
const phone = new PhoneScene(document.querySelector<HTMLCanvasElement>('#scene')!);
await phone.load();
const flow = homeTransition(phone);
const button = document.querySelector<HTMLButtonElement>('#regenerate')!;
button.querySelector('span')!.textContent = 'Preview login';
button.title = 'Visual test only — does not pair a WhatsApp account.';
button.disabled = false;
phone.setStatus('idle', 'Ready to preview the login transition.');
button.addEventListener('click', () => {
  button.disabled = true;
  flow.accept('paired');
  // Exercise normal repeated polling without restarting the camera animation.
  setTimeout(() => flow.accept('connected'), 1000);
  setTimeout(() => flow.accept('connected'), 2000);
});
