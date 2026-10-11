'use strict';

const ICONS = {
  chats: '<path fill-rule="evenodd" d="M22 6.67C22 5.19 20.8 4 19.33 4H1.8a1 1 0 0 0-.85 1.53L3 9v8.33C3 18.81 4.2 20 5.67 20h13.66c1.48 0 2.67-1.2 2.67-2.67V6.67ZM7 10a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H8Z"/>',
  call: '<path d="M19.95 21c-2.08 0-4.14-.45-6.17-1.36a18.3 18.3 0 0 1-5.55-3.87 18.47 18.47 0 0 1-3.87-5.54C3.46 8.18 3 6.13 3 4.04A1.02 1.02 0 0 1 4.05 3H8.1c.23 0 .44.08.63.24a.9.9 0 0 1 .32.56l.65 3.5c.03.27.03.5-.02.67-.05.19-.15.35-.28.48L6.97 10.9c.34.62.73 1.21 1.2 1.79.45.57.96 1.13 1.5 1.66A17.59 17.59 0 0 0 13.1 17l2.35-2.35a1.61 1.61 0 0 1 1.3-.4l3.45.7c.23.07.43.19.57.36.16.18.23.37.23.59v4.05A1.02 1.02 0 0 1 19.95 21ZM6.03 9l1.64-1.65L7.25 5H5.03c.08.68.2 1.36.34 2.03.16.66.37 1.32.66 1.97Zm8.95 8.95a12.42 12.42 0 0 0 4.02 1v-2.2l-2.35-.48-1.67 1.68Z"/>',
  status: '<path d="M13.56 3.14c.1-.55.62-.92 1.15-.77a10 10 0 0 1 6.98 12.1.91.91 0 0 1-1.23.6c-.52-.18-.78-.75-.66-1.3a8 8 0 0 0-5.44-9.41c-.53-.17-.9-.68-.8-1.22Zm5.34 14.65c.42.35.48.98.08 1.37a10 10 0 0 1-13.96 0c-.4-.39-.34-1.02.08-1.38a1.11 1.11 0 0 1 1.46.09 8 8 0 0 0 10.88 0c.4-.38 1.03-.44 1.45-.09ZM3.54 15.08c-.52.19-1.1-.08-1.23-.62A10 10 0 0 1 9.29 2.37c.53-.15 1.05.22 1.15.77.1.54-.27 1.05-.8 1.22a8 8 0 0 0-5.44 9.42c.12.54-.14 1.1-.66 1.3Z"/><path fill-rule="evenodd" d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>',
  channels: '<path fill-rule="evenodd" d="M15.83 8.63A1 1 0 0 1 17.2 9a5.98 5.98 0 0 1 0 6 1 1 0 0 1-1.73-1 3.98 3.98 0 0 0 0-4 1 1 0 0 1 .36-1.37Zm-7.66 0A1 1 0 0 1 8.53 10a3.98 3.98 0 0 0 0 4 1 1 0 0 1-1.73 1 5.98 5.98 0 0 1 0-6 1 1 0 0 1 1.37-.37Z"/><circle cx="12" cy="12" r="1.5"/><path fill-rule="evenodd" d="m5.33 16.48-.23.8-.68 2.3 2.3-.68.8-.23.72.39a8 8 0 1 0-3.3-3.3l.4.72Zm-2.15.22A48.91 48.91 0 0 0 2 21a1 1 0 0 0 1 1c.31 0 2.46-.63 4.3-1.18a10 10 0 1 0-4.12-4.12Z"/>',
  communities: '<path fill-rule="evenodd" d="M6.37 18.67a1.81 1.81 0 0 1-.58-1.24c-.01-.5-.03-1.5.03-1.94a2.7 2.7 0 0 1 .4-1.1 2.84 2.84 0 0 1 .9-.82c.46-.28.98-.46 1.4-.58A12.2 12.2 0 0 1 12 12.5a12.69 12.69 0 0 1 3.47.49 5.76 5.76 0 0 1 1.52.65c.28.19.56.44.78.76a2.41 2.41 0 0 1 .41 1.1c.06.43.04 1.43.03 1.93a1.9 1.9 0 0 1-.58 1.24c-.22.2-.48.33-.75.33H7.12c-.27 0-.53-.13-.75-.33Zm13.6-3.27c.04.6.03.86.02 1.6v.49a4.58 4.58 0 0 1-.3 1.51h2.97c.72 0 1.31-1.85 1.33-2.58.01-.4.02-.13-.02-.46a2.34 2.34 0 0 0-.95-1.6 4.27 4.27 0 0 0-1.41-.68h-.02v-.01a7.72 7.72 0 0 0-2.35-.27 4.18 4.18 0 0 1 .72 2Zm-2.04-3.95a2.65 2.65 0 0 0 3.16.06 2.67 2.67 0 1 0-3.16-.06ZM14.9 9.62A3.54 3.54 0 0 0 15.5 7a3.56 3.56 0 1 0-.61 2.62Zm-7.88.4a2.67 2.67 0 1 0-5.16-1.38 2.67 2.67 0 0 0 5.16 1.38Zm-4.42 3.6-.18.05h-.03a4.3 4.3 0 0 0-1.41.69 2.3 2.3 0 0 0-.95 1.6c-.04.33-.03 1.06-.02 1.46.02.73.61 1.58 1.33 1.58H4.3a4.58 4.58 0 0 1-.3-1.51V17c-.01-.74-.02-1 .03-1.6 0-.05 0-.1.02-.15a4.48 4.48 0 0 1 .7-1.85 7.22 7.22 0 0 0-2.16.22Zm9.4.88c-1.21 0-2.22.2-2.92.4-.37.12-.68.23-.91.38-.23.13-.3.25-.34.34a.7.7 0 0 0-.03.14L7.79 17h8.42v-1.24a.7.7 0 0 0-.04-.14c-.03-.09-.11-.2-.34-.34a3.84 3.84 0 0 0-.91-.37c-.7-.2-1.7-.41-2.92-.41ZM12 6a1.55 1.55 0 1 0 0 3.11c.86 0 1.56-.7 1.56-1.55C13.56 6.7 12.86 6 12 6Z"/>',
  newChat: '<path fill-rule="evenodd" d="M19.33 4C20.81 4 22 5.2 22 6.67v10.66c0 1.48-1.2 2.67-2.67 2.67H5.67A2.67 2.67 0 0 1 3 17.33V8.85L.94 5.53A1 1 0 0 1 1.8 4h17.54Zm-9.8 9h1.98v1.97c0 .43.25.85.67.98a1 1 0 0 0 1.31-.94v-2.02h1.98c.43 0 .85-.25.98-.67a1 1 0 0 0-.94-1.31h-2.02V9.03c0-.43-.25-.85-.67-.98a1 1 0 0 0-1.31.94v2.02H9.49a1 1 0 0 0-.94 1.31c.13.42.55.67.98.67Z"/>',
  search: '<path d="M9.5 16a6.27 6.27 0 0 1-4.61-1.89A6.27 6.27 0 0 1 3 9.5c0-1.82.63-3.35 1.89-4.61A6.27 6.27 0 0 1 9.5 3c1.82 0 3.35.63 4.61 1.89A6.27 6.27 0 0 1 16 9.5a6.1 6.1 0 0 1-1.3 3.8l5.6 5.6c.18.18.27.42.27.7s-.09.52-.27.7a.95.95 0 0 1-.7.27.95.95 0 0 1-.7-.27l-5.6-5.6A5.96 5.96 0 0 1 9.5 16Zm0-2c1.25 0 2.31-.44 3.19-1.31A4.34 4.34 0 0 0 14 9.5c0-1.25-.44-2.31-1.31-3.19A4.34 4.34 0 0 0 9.5 5c-1.25 0-2.31.44-3.19 1.31A4.34 4.34 0 0 0 5 9.5c0 1.25.44 2.31 1.31 3.19A4.34 4.34 0 0 0 9.5 14Z"/>',
  notificationsOff: '<path d="M16.15 19H5a1 1 0 0 1 0-2h1v-7a6.3 6.3 0 0 1 .85-3.15l1.5 1.5A4.2 4.2 0 0 0 8 10v7h6.2L2.1 4.9a1 1 0 0 1 1.4-1.4l17 17a1 1 0 0 1-1.4 1.4L16.15 19ZM13.5 4.2a5.77 5.77 0 0 1 3.25 2.11A5.86 5.86 0 0 1 18 10v2.75a1 1 0 1 1-2-.03V10c0-1.1-.4-2.04-1.18-2.83a3.85 3.85 0 0 0-3.67-1.07c-.3.07-.57.15-.8.25a1 1 0 0 1-1.47-.4.84.84 0 0 1 .25-1.23c.21-.11.44-.21.67-.3l.7-.22v-.7a1.5 1.5 0 0 1 3 0v.7ZM12 22c-.5 0-.95-.14-1.34-.41a1.3 1.3 0 0 1-.59-1.11c0-.14.06-.25.17-.34a.5.5 0 0 1 .36-.14h2.8c.13 0 .25.05.36.14.11.09.17.2.17.34 0 .46-.2.83-.6 1.1A2.2 2.2 0 0 1 12 22Z"/>',
  archive: '<path d="M5 21a2 2 0 0 1-2-2V6.5c0-.25.04-.47.13-.67.08-.2.19-.4.32-.58l1.4-1.7A1.35 1.35 0 0 1 6 3h12c.45 0 .85.2 1.15.55l1.4 1.7c.3.4.45.8.45 1.25V19a2 2 0 0 1-2 2H5Zm.4-15h13.2l-.85-1H6.25L5.4 6ZM5 19h14V8H5v11Zm7-1.43c.27 0 .5-.08.7-.27l2.6-2.6a1 1 0 0 0-1.4-1.4l-.9.9V11a1 1 0 1 0-2 0v3.2l-.9-.9a1 1 0 0 0-1.4 1.4l2.6 2.6c.2.19.43.27.7.27Z"/>',
  group: '<path d="M1 17.2a3 3 0 0 1 1.6-2.65 13.76 13.76 0 0 1 9.65-1.16c1.07.26 2.12.64 3.15 1.16a3 3 0 0 1 1.6 2.65v.8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-.8ZM18.45 20c.37-.6.55-1.27.55-2v-1a4 4 0 0 0-.61-2.11 5.4 5.4 0 0 0-1.74-1.74 12.61 12.61 0 0 1 4.5 1.4c1.2.66 1.85 1.45 1.85 2.45v1a2 2 0 0 1-2 2h-2.55ZM9 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm10-4a4 4 0 0 1-4.7 3.94 6.13 6.13 0 0 1-.7-.14A5.95 5.95 0 0 0 15 8a5.76 5.76 0 0 0-1.4-3.8c.45-.15.91-.2 1.4-.2a4 4 0 0 1 4 4Z"/>',
  read: '<path d="M14.73 6.01a1 1 0 0 1 1.56 1.26L7.6 18.01a1 1 0 0 1-1.49.07l-4.03-4.09a1 1 0 0 1 1.41-1.41l3.25 3.29 7.99-9.86Zm5.71.12a1 1 0 0 1 1.55 1.26l-8.41 10.45a1 1 0 0 1-1.49.07l-1.36-1.26a.55.55 0 0 1-.02-.81l.56-.68c.21-.2.53-.21.75-.03l.71.58 7.71-9.58Z"/>',
  pin: '<path d="M16 5v7l1.7 1.7c.2.2.3.45.3.73V15a1 1 0 0 1-1 1h-4v5.85a1 1 0 0 1-2 0V16H7a1 1 0 0 1-1-1v-.57c0-.28.1-.53.3-.73L8 12V5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm-7.15 9h6.3L14 12.85V5h-4v7.85L8.85 14Z"/>',
  document: '<path d="M9 18h6a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2Zm0-4h6a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2Zm-3 8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7.18c.54 0 1.03.2 1.4.58l4.85 4.84c.37.37.57.86.57 1.4V20a2 2 0 0 1-2 2H6Zm7-14V4H6v16h12V9h-4a1 1 0 0 1-1-1Z"/>',
  addContact: '<path d="M18 11h-2a1 1 0 1 1 0-2h2V7a1 1 0 0 1 2 0v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2Zm-9 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm-8 6v-.8a3 3 0 0 1 1.6-2.65 13.76 13.76 0 0 1 9.65-1.16c1.07.26 2.12.64 3.15 1.16a3 3 0 0 1 1.6 2.65v.8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2Zm2 0h12v-.8a.97.97 0 0 0-.5-.85 11.6 11.6 0 0 0-11 0 .97.97 0 0 0-.5.85v.8Zm6-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
  video: '<path d="M4 20c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41V6c0-.55.2-1.02.59-1.41C2.98 4.19 3.45 4 4 4h12c.55 0 1.02.2 1.41.59.4.39.59.86.59 1.41v4.5l3.15-3.15c.17-.17.35-.2.55-.13.2.09.3.25.3.48v8.6c0 .23-.1.4-.3.47-.2.09-.38.05-.55-.12L18 13.5V18c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59H4Zm0-2h12V6H4v12Z"/>',
  meta: '<path fill="url(#meta-gradient)" d="M8.07 15.54c1.74 0 2.88 2.43 2.88 4.26 0 1.56-.81 3.27-2.25 3.27-1.68 0-2.88-2.34-2.88-4.29 0-1.59.81-3.24 2.25-3.24m6.21.96c2.16 0 4.71 1.89 4.71 3.81 0 1.26-1.11 1.95-2.4 1.95-2.13 0-4.65-1.86-4.65-3.84 0-1.29 1.08-1.92 2.34-1.92m-9.03-6.03c1.23 0 1.95.81 1.95 2.01 0 2.16-2.28 4.53-4.35 4.53-1.2 0-1.98-.81-1.98-2.04 0-2.1 2.28-4.5 4.38-4.5m15.75.66c1.53 0 2.55.81 2.55 2.04 0 1.98-2.7 3.48-4.74 3.48-1.56 0-2.55-.9-2.55-2.07 0-1.92 2.64-3.45 4.74-3.45m-2.04-7.86c1.38 0 2.1 1.44 2.1 2.88 0 1.92-1.29 4.53-3.18 4.53-1.38 0-2.13-1.38-2.13-2.85 0-1.98 1.35-4.56 3.21-4.56M5.46 4.35c1.98 0 4.02 1.08 4.02 2.67 0 1.5-1.8 2.37-3.57 2.37-1.98 0-4.02-1.08-4.02-2.64 0-1.44 1.71-2.4 3.57-2.4m5.55-3.9c2.07 0 4.05 2.58 4.05 4.71 0 1.23-.66 2.13-1.89 2.13-2.07 0-4.08-2.58-4.08-4.68 0-1.2.66-2.16 1.92-2.16"/><defs><linearGradient id="meta-gradient" x1="14.12" x2="20.68" y1="-1.69" y2="20.78" gradientUnits="userSpaceOnUse"><stop stop-color="#f356ff"/><stop offset="1" stop-color="#4641ff"/></linearGradient></defs>',
  media: '<path d="M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8Zm0-2h12V4H8v12Zm-4 6a2 2 0 0 1-2-2V7a1 1 0 0 1 2 0v13h13a1 1 0 0 1 0 2H4Zm9.25-9.5L12.1 11a.5.5 0 0 0-.8 0l-1.68 2.2a.5.5 0 0 0 .4.8h7.96a.5.5 0 0 0 .4-.8l-2.42-3.17a.5.5 0 0 0-.8 0l-1.9 2.47Z"/>',
  more: '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  down: '<path d="m8 10 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  back: '<path d="m11 5-7 7 7 7M4 12h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  lock: '<path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h6V7a3 3 0 0 0-6 0v3Z"/><circle cx="12" cy="16" r="1.5" fill="var(--surface)"/>',
  smile: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="9.5" r="1"/><circle cx="15.5" cy="9.5" r="1"/><path d="M7.5 14c2 4 7 4 9 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  plus: '<path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  attach: '<path d="M18 15.75c0 1.73-.6 3.2-1.82 4.43A6.03 6.03 0 0 1 11.75 22a6 6 0 0 1-4.42-1.82 6.03 6.03 0 0 1-1.83-4.43V6.5c0-1.25.44-2.31 1.31-3.19A4.34 4.34 0 0 1 10 2c1.25 0 2.31.44 3.19 1.31A4.34 4.34 0 0 1 14.5 6.5v8.75c0 .77-.27 1.42-.8 1.95s-1.18.8-1.95.8-1.42-.27-1.95-.8a2.65 2.65 0 0 1-.8-1.95V7a1 1 0 0 1 2 0v8.25a.73.73 0 0 0 .75.75.73.73 0 0 0 .75-.75V6.5c-.02-.7-.26-1.3-.74-1.78A2.37 2.37 0 0 0 10 4c-.7 0-1.3.24-1.78.72A2.41 2.41 0 0 0 7.5 6.5v9.25a4 4 0 0 0 1.22 3.01A4.14 4.14 0 0 0 11.75 20c1.17 0 2.16-.41 2.97-1.24A4.3 4.3 0 0 0 16 15.75V7a1 1 0 1 1 2 0v8.75Z"/>',
  sticker: '<path d="M8.5 10.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm8.5-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/><path fill-rule="evenodd" d="M16.82 19.98A6.97 6.97 0 0 1 12 22H9.27A7.27 7.27 0 0 1 2 14.73V9.27A7.27 7.27 0 0 1 9.27 2h5.46A7.27 7.27 0 0 1 22 9.27v2.54c0 1.94-.77 3.8-2.15 5.17l-3.03 3ZM14.72 4H9.28A5.27 5.27 0 0 0 4 9.27v5.46A5.27 5.27 0 0 0 9.27 20h2.06a.9.9 0 0 0 .68-.88l-.02-2.26v-.11a5.5 5.5 0 0 1-4.65-2.6.6.6 0 0 1 .03-.6c.12-.2.3-.3.53-.3h5.7a4.8 4.8 0 0 1 3.22-1.23l2.26.01c.5 0 .9-.4.9-.9V9.07H20A5.27 5.27 0 0 0 14.73 4Zm-.71 15.11c0 .15-.01.3-.04.44a4.96 4.96 0 0 0 1.44-.99l3.03-3c.46-.46.83-.99 1.09-1.56-.15.02-.3.03-.46.03h-2.26A2.8 2.8 0 0 0 14 16.84l.02 2.26Z"/>',
  send: '<path d="M3 3.5 22 12 3 20.5l2-7.3L15 12 5 10.8Z"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v4M8 22h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="9" r="1.6"/><path d="m4 18 5-5 4 3 3-5 5 7" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  check: '<path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  edit: '<path d="m4 15 12-12 5 5L9 20l-6 1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m13 6 5 5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2Z"/>',
  settings: '<path d="m9 3 .5-2h5l.5 2 2 1 2-.5 2.5 4.3-1.5 1.5v2.4l1.5 1.5-2.5 4.3-2-.5-2 1-.5 2h-5l-.5-2-2-1-2 .5L2.5 13l1.5-1.5V9L2.5 7.5 5 3.2l2 .5Z" transform="translate(0 2)" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  moon: '<path d="M20 16.5A9 9 0 0 1 7.5 4 9 9 0 1 0 20 16.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  bell: '<path d="M5 18h14l-2-3V9a5 5 0 0 0-10 0v6Zm5 3h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="7" r="1"/><path d="M12 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  arrow: '<path d="m7 17 10-10M7 7h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  copy: '<rect x="8" y="3" width="12" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 7H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  forward: '<path d="m14 5 6 6-6 6v-4H9c-3 0-5 2-6 5 0-7 3-9 8-9h3V5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
};
const WORDMARK = '<svg aria-hidden="true" viewBox="0 0 104 28" fill="currentColor"><path d="m69.56 15.13 2.05-6.26 2.07 6.26zm28.8 3.94c-1.49 0-2.33-1.04-2.33-3.16v-.54c0-1.92.89-3.09 2.42-3.09 1.25 0 2.27.89 2.27 3.35s-.93 3.44-2.36 3.44m-5.55 6.43h3.2v-5.36a3.8 3.8 0 0 0 3.15 1.52c2.98 0 4.84-2.34 4.84-6.12 0-3.77-1.6-5.85-4.62-5.85-1.5 0-2.61.54-3.46 1.67v-1.32h-3.1zm-7.04-6.43c-1.49 0-2.33-1.04-2.33-3.16v-.54c0-1.92.89-3.09 2.42-3.09 1.25 0 2.27.89 2.27 3.35s-.93 3.44-2.36 3.44m-5.55 6.43h3.2v-5.36a3.8 3.8 0 0 0 3.15 1.52c2.98 0 4.84-2.34 4.84-6.12 0-3.77-1.6-5.85-4.62-5.85-1.5 0-2.61.54-3.46 1.67v-1.32h-3.1zm-16.06-4.19h3.41l1.14-3.41h5.81l1.15 3.41h3.52L73.69 5.9h-4zm-5.42.35c3.26 0 4.92-1.34 4.92-3.54S62.62 15 59.64 14.5l-1.4-.24c-1.2-.2-1.58-.58-1.58-1.2 0-.63.48-1.13 1.84-1.13 1.27 0 1.8.47 2 1.68h2.99c-.17-2.57-1.82-3.93-4.99-3.93-2.96 0-4.86 1.28-4.86 3.46s1.27 3.02 4.13 3.5l1.3.21c1.18.2 1.46.63 1.46 1.28 0 .75-.5 1.23-1.86 1.23s-2.14-.52-2.26-1.7h-3.05c.1 2.8 2.16 3.99 5.38 3.99m-8.86-.09c1 0 2.01-.28 2.62-.7v-2.41q-.92.52-1.73.52c-.93 0-1.43-.39-1.43-1.58v-4.86h3.16v-2.5h-3.16v-3.1H46.5v1.73c0 .97-.23 1.38-1.2 1.38h-.85v2.5h1.7v4.97c0 2.61 1 4.06 3.74 4.06m-11.96-2.16c-1.04 0-1.62-.45-1.62-1.25 0-.9.67-1.34 2.22-1.6a5 5 0 0 0 2.06-.7v1.11c0 1.49-1.06 2.44-2.66 2.44m-.82 2.25c1.66 0 2.83-.7 3.74-1.7q.16.8.56 1.35h3.02q-.8-1.27-.78-3.76v-3.6c0-2.68-1.42-4.26-4.8-4.26-2.97 0-4.72 1.23-5.07 3.93h2.92c.17-1.03.8-1.64 2.05-1.64 1.17 0 1.84.48 1.84 1.3s-.5 1.1-2.7 1.42c-2.4.35-4.6 1.21-4.6 3.63 0 2.16 1.53 3.33 3.82 3.33m-15.61-.35h3.2v-6.6c0-.79.19-1.15.66-1.63a2.5 2.5 0 0 1 1.77-.73c1.06 0 1.62.58 1.62 2v6.96h3.2v-7.56c0-2.61-1.3-4.06-3.74-4.06-1.25 0-2.42.4-3.52 1.69V5.89h-3.2zm-17.34 0h3.52l2.55-11.12 2.59 11.12h3.56L20.45 5.9h-3.54l-2.42 11.38-2.59-11.3H8.7L6.07 17.33 3.65 5.89H0z"/></svg>';
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let iconSequence = 0;
const icon = (name, cls = '') => {
  const artwork = name==='meta' ? ICONS.meta.replaceAll('meta-gradient',`meta-gradient-${++iconSequence}`) : ICONS[name] || ICONS.info;
  return `<svg aria-hidden="true" class="icon ${cls}" viewBox="0 0 24 24" fill="currentColor">${artwork}</svg>`;
};
const iconButton = (name, label, action, cls = '', attrs = '') => `<button type="button" class="icon-button ${cls}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" data-action="${action}" ${attrs}>${icon(name)}</button>`;
const uniqueId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
const clockTime = () => new Intl.DateTimeFormat('en', {hour:'numeric',minute:'2-digit'}).format(new Date());
const STORAGE_KEY = 'whatsapp-ui-demo-v1';
const seedChats = [
  {id:'alex',name:'Alex Morgan',type:'person',avatar:'initial',initial:'A',color:'#fbd7e6',ink:'#c74578',preview:'See you tomorrow!',time:'3:59 PM',outgoing:true,pinned:true,favorite:true,about:'Making things, one idea at a time.'},
  {id:'jamie',name:'Jamie Chen',type:'person',avatar:'person',color:'#ecd2b2',ink:'#675c40',preview:'That sounds like a plan 🌿',time:'2:42 PM',pinned:true,favorite:true,about:'Available'},
  {id:'maya',name:'Maya Patel',type:'person',avatar:'flower',color:'#d9e7ed',ink:'#386e80',preview:'Found our next weekend spot 🌿',time:'2:15 PM',unread:2,about:'Enjoy the little things.'},
  {id:'sam',name:'Sam Wilson',type:'person',avatar:'initial',initial:'S',color:'#cfe9e8',ink:'#2f8c83',preview:'I’ll send the photos over soon',time:'1:54 PM',unread:1,about:'One adventure at a time.'},
  {id:'emma',name:'Emma Davis',type:'person',avatar:'initial',initial:'E',color:'#e8def8',ink:'#8559b0',preview:'Coffee at 4? ☕',time:'1:32 PM',unread:1,about:'Always time for coffee.'},
  {id:'lucas',name:'Lucas Tan',type:'person',avatar:'landscape',preview:'Sent you the updated notes',time:'12:48 PM',previewIcon:'document',about:'Building something new.'},
  {id:'sofia',name:'Sofia Reyes',type:'person',avatar:'initial',initial:'S',color:'#f8e4c8',ink:'#b97835',preview:'That playlist is so good 🎧',time:'12:21 PM',favorite:true,about:'Music makes everything better.'},
  {id:'noah',name:'Noah Kim',type:'person',avatar:'initial',initial:'N',color:'#dce8fc',ink:'#617fae',preview:'Let’s go with the blue one',time:'11:56 AM',outgoing:true,about:'Keep it simple.'},
  {id:'chloe',name:'Chloe Brooks',type:'person',avatar:'flower',preview:'Thank you! This made my day 💛',time:'11:30 AM',unread:1,about:'Collecting little moments.'},
  {id:'ben',name:'Ben Carter',type:'person',avatar:'initial',initial:'B',color:'#e1ead5',ink:'#698740',preview:'See you at the park',time:'10:44 AM',outgoing:true,about:'Usually outdoors.'},
  {id:'self',name:'Jordan Lee (You)',type:'self',avatar:'landscape',preview:'Ideas for the weekend ✨',time:'10:17 AM',outgoing:true,about:'Message yourself'},
  {id:'riley',name:'Riley Scott',type:'person',avatar:'initial',initial:'R',color:'#f6dce0',ink:'#b66b78',preview:'Just finished the book 📖',time:'9:52 AM',about:'One more chapter.'},
  {id:'mia',name:'Mia Wong',type:'person',avatar:'person',preview:'The photos look amazing!',time:'Yesterday',about:'Looking for the next good view.'},
  {id:'daniel',name:'Daniel Park',type:'person',avatar:'initial',initial:'D',color:'#dedcf0',ink:'#766fa6',preview:'Thanks for the recommendation',time:'Yesterday',outgoing:true,about:'Available'},
  {id:'ava',name:'Ava Thompson',type:'person',avatar:'initial',initial:'A',color:'#f5e3d5',ink:'#b97d52',preview:'I’m free on Saturday 😊',time:'Yesterday',about:'Enjoying the journey.'},
  {id:'grace',name:'Grace Lim',type:'person',avatar:'initial',initial:'G',color:'#dcefe9',ink:'#549983',preview:'Perfect, I’ve saved it',time:'Yesterday',about:'Little steps every day.'},
  {id:'ethan',name:'Ethan Miller',type:'person',avatar:'landscape',preview:'Catch up soon?',time:'Friday',about:'Somewhere with a good view.'}
];
const seedMessages = {
  alex:[{id:'a1',text:'Are you free for lunch tomorrow?',time:'3:42 PM'},{id:'a2',text:'Yes, I’ll finish work around 12.30.',outgoing:true,time:'3:45 PM'},{id:'a3',text:'Great. Want to meet at the café near KL Sentral?',time:'3:48 PM'},{id:'a4',text:'Sounds good. I can be there at 12.45.',outgoing:true,time:'3:50 PM'},{id:'a5',text:'Perfect 👍',time:'3:51 PM'},{id:'a6',text:'See you tomorrow!',outgoing:true,time:'3:59 PM'}],
  jamie:[{id:'j1',text:'What do you think about a walk after work?',time:'2:30 PM'},{id:'j2',text:'Sounds great. Let’s meet by the park.',outgoing:true,time:'2:33 PM'},{id:'j3',text:'I found a nice route along the river.',time:'2:35 PM'},{id:'j4',text:'Lovely! I’ll bring a coffee for the walk.',outgoing:true,time:'2:38 PM'},{id:'j5',text:'That sounds like a plan 🌿',time:'2:42 PM'}],
  self:[{id:'y1',text:'Ideas for the weekend ✨\n\n• Find a new coffee spot\n• Go for a long walk\n• Finish that book',outgoing:true,time:'12:17 PM'}],
  maya:[{id:'mp1',text:'Any ideas for the weekend?',time:'2:00 PM'},{id:'mp2',text:'Somewhere quiet, with a nice view?',outgoing:true,time:'2:02 PM'},{id:'mp3',attachment:{name:'Weekend view.svg',type:'image/demo',url:'assets/landscape.svg'},time:'2:10 PM'},{id:'mp4',text:'Found our next weekend spot 🌿',time:'2:15 PM'}],
  sam:[{id:'sw1',text:'The trip was so much fun!',outgoing:true,time:'1:40 PM'},{id:'sw2',text:'Still thinking about that sunset.',time:'1:44 PM'},{id:'sw3',text:'Same! Did you get any good photos?',outgoing:true,time:'1:47 PM'},{id:'sw4',text:'I’ll send the photos over soon',time:'1:54 PM'}],
  emma:[{id:'e1',text:'Hey! How’s your day going?',time:'1:20 PM'},{id:'e2',text:'A little busy, but good. How about yours?',outgoing:true,time:'1:22 PM'},{id:'e3',text:'Same here. I could use a little break.',time:'1:25 PM'},{id:'e4',text:'Coffee at 4? ☕',time:'1:32 PM'}],
  lucas:[{id:'l1',text:'I’ve made a few updates to the notes.',time:'12:30 PM'},{id:'l2',text:'Great, send them over when you’re ready.',outgoing:true,time:'12:34 PM'},{id:'l3',attachment:{name:'Project brief.txt',size:325,type:'text/plain',url:'assets/project-brief.txt'},time:'12:45 PM'},{id:'l4',text:'Sent you the updated notes',time:'12:48 PM'}],
  sofia:[{id:'sf1',text:'Do you have any music recommendations?',time:'12:05 PM'},{id:'sf2',text:'I’ve been listening to a new playlist all morning.',outgoing:true,time:'12:07 PM'},{id:'sf3',text:'Sending you my favorites ✨',outgoing:true,time:'12:10 PM'},{id:'sf4',text:'That playlist is so good 🎧',time:'12:21 PM'}],
  noah:[{id:'nk1',text:'Which color do you prefer for the new design?',time:'11:40 AM'},{id:'nk2',text:'The blue and green both look nice.',outgoing:true,time:'11:43 AM'},{id:'nk3',text:'I think blue feels a bit calmer.',time:'11:50 AM'},{id:'nk4',text:'Let’s go with the blue one',outgoing:true,time:'11:56 AM'}],
  chloe:[{id:'cb1',text:'Happy birthday! Hope you have a lovely day 🎉',outgoing:true,time:'11:15 AM'},{id:'cb2',text:'That’s so sweet of you!',time:'11:22 AM'},{id:'cb3',text:'Any fun plans for tonight?',outgoing:true,time:'11:25 AM'},{id:'cb4',text:'Dinner with a few friends 😊',time:'11:28 AM'},{id:'cb5',text:'Thank you! This made my day 💛',time:'11:30 AM'}],
  ben:[{id:'bc1',text:'Up for a run this evening?',time:'10:30 AM'},{id:'bc2',text:'Absolutely. Same route as last time?',outgoing:true,time:'10:32 AM'},{id:'bc3',text:'Yep! 6:30 works for me.',time:'10:40 AM'},{id:'bc4',text:'See you at the park',outgoing:true,time:'10:44 AM'}],
  riley:[{id:'rs1',text:'Have you started the book I mentioned?',time:'9:40 AM'},{id:'rs2',text:'Yes! It’s hard to put down.',outgoing:true,time:'9:43 AM'},{id:'rs3',text:'The last chapter is my favorite.',time:'9:48 AM'},{id:'rs4',text:'Just finished the book 📖',time:'9:52 AM'}],
  mia:[{id:'mw1',text:'Here’s my favorite view from the hike.',outgoing:true,time:'5:10 PM'},{id:'mw2',attachment:{name:'Mountain view.svg',type:'image/demo',url:'assets/landscape.svg'},outgoing:true,time:'5:11 PM'},{id:'mw3',text:'Wish I’d been there!',time:'5:14 PM'},{id:'mw4',text:'The photos look amazing!',time:'5:17 PM'}],
  daniel:[{id:'dp1',text:'You should try that little restaurant by the station.',time:'6:10 PM'},{id:'dp2',text:'I’ve been looking for somewhere new.',outgoing:true,time:'6:12 PM'},{id:'dp3',text:'The noodles are my favorite!',time:'6:15 PM'},{id:'dp4',text:'Thanks for the recommendation',outgoing:true,time:'6:18 PM'}],
  ava:[{id:'at1',text:'Want to check out the market this weekend?',outgoing:true,time:'7:00 PM'},{id:'at2',text:'That sounds lovely! What day were you thinking?',time:'7:03 PM'},{id:'at3',text:'Saturday morning, if that works?',outgoing:true,time:'7:05 PM'},{id:'at4',text:'I’m free on Saturday 😊',time:'7:08 PM'}],
  grace:[{id:'gl1',text:'Do you still have the recipe from last time?',time:'8:10 PM'},{id:'gl2',text:'Sure! I’ll write it up and send it over.',outgoing:true,time:'8:12 PM'},{id:'gl3',text:'It’s only a few ingredients, really easy.',outgoing:true,time:'8:15 PM'},{id:'gl4',text:'Perfect, I’ve saved it',time:'8:18 PM'}],
  ethan:[{id:'em1',text:'Hey, it’s been a while!',time:'4:20 PM'},{id:'em2',text:'It really has. How have you been?',outgoing:true,time:'4:22 PM'},{id:'em3',text:'Doing well! Lots to tell you.',time:'4:25 PM'},{id:'em4',text:'Catch up soon?',time:'4:28 PM'}]
};
let saved;
try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { saved = null; }
const data = saved && [1,2,3].includes(saved.version) && Array.isArray(saved.chats) && saved.messages && saved.profile && saved.prefs ? saved : {
  version:2,chats:structuredClone(seedChats),messages:structuredClone(seedMessages),profile:{name:'Jordan Lee',about:'Hey there! I am using WhatsApp.'},prefs:{theme:'light',sounds:true,previews:true},calls:[]
};
if(data.version===1){
  // Keep the previous demo recoverable while preserving existing private messages.
  try { if(!localStorage.getItem(STORAGE_KEY+'-before-private-chats'))localStorage.setItem(STORAGE_KEY+'-before-private-chats',JSON.stringify(data)); } catch {}
  data.chats=data.chats.filter(c=>['person','self'].includes(c.type));
  data.chats.forEach(c=>{c.archived=false;});
  for(const chat of seedChats){if(!data.chats.some(c=>c.id===chat.id)){data.chats.push(structuredClone(chat));data.messages[chat.id]=structuredClone(seedMessages[chat.id]);}}
  data.messages=Object.fromEntries(data.chats.map(c=>[c.id,data.messages[c.id]||[]]));
  data.version=2;
}
data.prefs.banner=false;
data.calls ||= [];
data.trash ||= [];
if(data.version<3){
  if(saved){try {if(!localStorage.getItem(STORAGE_KEY+'-before-phone-contacts'))localStorage.setItem(STORAGE_KEY+'-before-phone-contacts',JSON.stringify(data));} catch {}}
  const previousNames=data.chats.map(c=>({id:c.id,name:c.name}));
  data.chats.forEach(normalizeContact);
  const replacements=new Map(previousNames.map(c=>[c.name,data.chats.find(chat=>chat.id===c.id)?.name]));
  const minutesAgo=[6,35,65,85,110,145,180,220,360,550,640,920,1660,2060,3250,4620,7100];
  const now=Date.now();
  for(const [index,chat] of data.chats.entries()){
    const seedIndex=seedChats.findIndex(c=>c.id===chat.id);
    const latest=now-(minutesAgo[seedIndex]??(index+1)*30)*60000;
    const messages=data.messages[chat.id]||=[];
    for(const [messageIndex,message] of messages.entries()){
      message.sentAt=latest-(messages.length-1-messageIndex)*3*60000;
      message.time=formatMessageTime(message.sentAt);
      const seed=seedMessages[chat.id]?.find(m=>m.id===message.id);
      if(seed?.text)message.text=seed.text;
      if(message.text==='Checking the local WhatsApp UI 👋')message.text='I’ll message you when I’m on the way.';
      if(message.sender)message.sender=chat.name;
      if(message.reply&&message.reply.sender!=='You')message.reply.sender=replacements.get(message.reply.sender)||chat.name;
    }
    chat.lastMessageAt=latest;
    refreshChatPreview(chat.id);
  }
  for(const item of data.trash){
    if(!item.message.sentAt)item.message.sentAt=(getChat(item.chatId)?.lastMessageAt||now)-600000;
    item.message.time=formatMessageTime(item.message.sentAt);
    if(item.message.reply&&item.message.reply.sender!=='You')item.message.reply.sender=replacements.get(item.message.reply.sender)||getChat(item.chatId)?.name||'You';
  }
  data.version=3;
}
const state = {view:'chats',panel:null,selected:null,filter:'all',query:'',emoji:false,chatSearch:false,searchText:'',drafts:{},detail:false,call:null,recording:null,channel:null,selectMode:false,selectIds:[],menuMessageId:null,menuChatId:null,replyTo:null,forwardMessage:null,sidebarScroll:{}};
let toastTimer, modalReturnFocus, callTimer, recordingTimer, pendingAttachmentChat, saveWarningShown = false;
function save() { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); } catch { if (!saveWarningShown) { toast('Browser storage is full. New changes will last for this session.'); saveWarningShown=true; } } }
function toast(text,undoId=null) { $('#toast').innerHTML=escapeHTML(text)+(undoId?`<button class="toast-undo" data-action="undo-delete" data-id="${escapeHTML(undoId)}">Undo</button>`:'');$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),undoId?7000:3200); }
function getChat(id=state.selected) { return data.chats.find(c=>c.id===id); }
function unreadCount() { return data.chats.filter(c=>['person','self'].includes(c.type)&&c.unread>0).length; }
function initials(name) { return String(name||'').match(/\p{L}/u)?.[0].toUpperCase()||'?'; }
function randomMalaysiaNumber() {
  const prefixes=['12','13','16','17','18','19'];
  const used=new Set(data.chats.map(c=>c.phone||c.name));let number;
  do {const digits=String(Math.floor(1000000+Math.random()*9000000));number=`+60 ${prefixes[Math.floor(Math.random()*prefixes.length)]}-${digits.slice(0,3)} ${digits.slice(3)}`;} while(used.has(number));
  return number;
}
function normalizeContact(chat,index=0) {
  if(chat.id==='meta')return;
  chat.initial=String(chat.initial||initials(chat.name)).slice(0,1).toUpperCase();
  chat.phone ||= /^\+60 \d{2}-\d{3} \d{4}$/.test(chat.name)?chat.name:randomMalaysiaNumber();
  chat.name=chat.phone;chat.avatar='initial';
  const colors=[['#fbd7e6','#c74578'],['#dce8fc','#617fae'],['#e1ead5','#698740'],['#e8def8','#8559b0'],['#f8e4c8','#b97835'],['#cfe9e8','#2f8c83']];
  chat.color ||= colors[index%colors.length][0];chat.ink ||= colors[index%colors.length][1];
}
function dayKey(timestamp) {
  const date=new Date(timestamp);return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function formatMessageTime(timestamp) {return new Intl.DateTimeFormat('en-MY',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(timestamp)).toUpperCase();}
function messageDayLabel(timestamp) {
  const date=new Date(timestamp),today=new Date(),yesterday=new Date();yesterday.setDate(today.getDate()-1);
  return dayKey(date)===dayKey(today)?'TODAY':dayKey(date)===dayKey(yesterday)?'Yesterday':new Intl.DateTimeFormat('en-MY',{day:'numeric',month:'long',year:'numeric'}).format(date);
}
function formatChatTime(timestamp) {
  if(!timestamp)return '';
  const date=new Date(timestamp),today=new Date(),yesterday=new Date();yesterday.setDate(today.getDate()-1);
  if(dayKey(date)===dayKey(today))return formatMessageTime(timestamp);
  if(dayKey(date)===dayKey(yesterday))return 'Yesterday';
  const todayStart=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
  if(timestamp>=todayStart-6*86400000)return new Intl.DateTimeFormat('en-MY',{weekday:'long'}).format(date);
  return new Intl.DateTimeFormat('en-MY',{day:'numeric',month:'numeric',year:'numeric'}).format(date);
}
function avatar(chat, extra='') {
  return `<span class="avatar initial ${extra}" style="--avatar-bg:${escapeHTML(chat.color || '#e4dfca')};--avatar-color:${escapeHTML(chat.ink || '#797348')}">${escapeHTML(String(chat.initial||initials(chat.name)).slice(0,1))}</span>`;
}
function renderRail() {
  const entries=[['chats','Chats','chats'],['calls','Calls','call'],['status','Status','status'],['channels','Channels','channels']];
  $('#rail').innerHTML=entries.map(([view,label,img])=>`<button class="rail-button ${state.view===view?'active':''}" data-action="nav" data-view="${view}" aria-label="${label}" title="${label}" aria-pressed="${state.view===view}">${icon(img)}${view==='chats'&&unreadCount()?`<span class="nav-badge">${unreadCount()}</span>`:''}${['status','communities'].includes(view)?'<span class="nav-dot"></span>':''}</button>`).join('')+
    `<div class="rail-divider"></div><button class="rail-button ${state.view==='meta'?'active':''}" data-action="nav" data-view="meta" title="Meta AI" aria-label="Meta AI" aria-pressed="${state.view==='meta'}">${icon('meta')}</button><div class="rail-spacer"></div><button class="rail-button ${state.view==='media'?'active':''}" data-action="nav" data-view="media" title="Media" aria-label="Media" aria-pressed="${state.view==='media'}">${icon('media')}</button><button class="rail-button rail-profile ${state.view==='profile'?'active':''}" data-action="nav" data-view="profile" aria-label="You" title="You" aria-pressed="${state.view==='profile'}">${avatar({name:data.profile.name,avatar:'landscape'})}</button>`;
}
function searchMarkup(placeholder='Search or start a new chat') {
  return `<div class="search-wrap">${icon('search')}<input id="sidebar-search" type="search" placeholder="${placeholder}" aria-label="${placeholder}" value="${escapeHTML(state.query)}" autocomplete="off">${state.query?iconButton('close','Clear search','clear-search','search-clear'):''}</div>`;
}
function sidebarHeader(title, action='new-chat', actionLabel='New chat', actionIcon='newChat') {
  return `<header class="sidebar-header">${title==='WhatsApp'?`<h1 class="wordmark" aria-label="WhatsApp">${WORDMARK}</h1>`:`<h1 class="sidebar-title">${title}</h1>`}${iconButton('more','Menu','main-menu')}${iconButton(actionIcon,actionLabel,action,'primary')}</header>`;
}
function backHeader(title, action='sidebar-back') { return `<header class="sidebar-header back-header">${iconButton('back','Back',action)}<h1 class="sidebar-title">${title}</h1></header>`; }
function chatRow(chat) {
  const community=chat.type==='community';
  const image=community?`<span class="community-avatar"><span class="avatar">DESIGN<br>WEEK</span><span class="avatar-badge" style="--avatar-bg:${chat.color};--avatar-color:${chat.ink}">${icon('group')}</span></span>`:avatar(chat);
  return `<button class="chat-row ${community?'community-row':''} ${(state.selectMode?state.selectIds.includes(chat.id):state.selected===chat.id)?'selected':''}" data-action="open-chat" data-id="${escapeHTML(chat.id)}" data-last-message-at="${chat.lastMessageAt||0}" aria-label="${escapeHTML(chat.name)}${chat.unread?`, ${chat.unread} unread messages`:''}" ${state.selectMode?`aria-pressed="${state.selectIds.includes(chat.id)}"`:`aria-current="${state.selected===chat.id?'true':'false'}"`}>${image}<span class="chat-content">${community?`<span class="community-meta"><span class="community-label">${escapeHTML(chat.community)}</span><span class="chat-time ${chat.unread?'unread':''}">${escapeHTML(formatChatTime(chat.lastMessageAt))}</span></span>`:''}<span class="chat-top"><span class="chat-name">${escapeHTML(chat.name)}</span>${!community?`<span class="chat-time ${chat.unread?'unread':''}">${escapeHTML(formatChatTime(chat.lastMessageAt))}</span>`:chat.unread?`<span class="unread-badge">${chat.unread}</span>`:''}</span><span class="chat-bottom"><span class="chat-preview">${chat.outgoing||chat.id==='studio'?icon('read',chat.id==='studio'?'read':''):''}${chat.previewIcon?icon(chat.previewIcon):''}<span>${escapeHTML(chat.preview||'Start a conversation')}</span></span><span class="chat-badges">${!community&&chat.unread?`<span class="unread-badge">${chat.unread}</span>`:''}${chat.pinned?icon('pin'):''}</span></span></span>${state.selectMode?`<span class="selection-indicator ${state.selectIds.includes(chat.id)?'checked':''}">${state.selectIds.includes(chat.id)?icon('check'):''}</span>`:''}</button>`;
}
function filteredChats() {
  const q=state.query.toLowerCase().trim();
  return data.chats.filter(c=>['person','self'].includes(c.type)&&c.id!=='meta'&&(state.filter!=='unread'||c.unread>0)&&(state.filter!=='favorites'||c.favorite)&&(state.filter!=='private'||c.type==='person')&&(state.filter!=='self'||c.type==='self')&&(!q||`${c.name} ${c.preview||''} ${(data.messages[c.id]||[]).map(m=>m.text||m.attachment?.name||'').join(' ')}`.toLowerCase().includes(q))).sort((a,b)=>(b.lastMessageAt||0)-(a.lastMessageAt||0)||a.name.localeCompare(b.name));
}
function renderChatList() {
  const list=$('#chat-list'); if(!list) return;
  const chats=filteredChats();list.innerHTML=chats.map(chatRow).join('') || `<div class="empty-list">${state.query?'No chats found. Try another number or message.':state.filter==='unread'?'You’re all caught up. No unread chats.':state.filter==='favorites'?'Add your favorite chats from the conversation menu.':'No chats here yet.'}</div>`;
}
function renderChatsSidebar() {
  $('#sidebar').innerHTML=(state.selectMode?backHeader(`Select chats · ${state.selectIds.length}`,'cancel-selection'):sidebarHeader('WhatsApp'))+searchMarkup()+
    `<div class="filters" role="tablist" aria-label="Chat filters">${[['all','All'],['unread','Unread'],['favorites','Favorites']].map(([id,label])=>`<button role="tab" aria-selected="${state.filter===id}" class="filter-chip ${state.filter===id?'active':''}" data-action="filter" data-filter="${id}">${label}${id==='unread'&&unreadCount()?` <span class="filter-count">${unreadCount()}</span>`:''}</button>`).join('')}<button class="filter-chip more ${['private','self'].includes(state.filter)?'active':''}" data-action="filter-menu" aria-label="More chat filters" title="More filters">${icon('down')}</button></div>`+
    `<div class="sidebar-scroll"><div id="chat-list" class="chat-list" aria-label="Chat list"></div><p class="list-footer">${icon('lock')}Your personal messages are <button data-action="encryption">end-to-end encrypted</button></p></div>${state.selectMode?`<div class="panel-bottom selection-actions"><button class="secondary-button" data-action="bulk-favorite" ${!state.selectIds.length?'disabled':''}>Favorite</button><button class="solid-button" data-action="bulk-read" ${!state.selectIds.length?'disabled':''}>Mark as read</button></div>`:''}`;
  renderChatList();
}
function renderWelcome() {
  $('#main').innerHTML=`<section class="welcome"><div class="welcome-card"><img class="welcome-art" src="assets/welcome.svg" alt="A laptop with a calling window"><h1>Voice and video calling is now available</h1><p>Now you can make and join calls on WhatsApp Web.</p><button class="pill-button" data-action="nav" data-view="calls">Go to Calls</button></div><div class="quick-actions">${[['document','Send document','send-document'],['addContact','Add contact','add-contact'],['video','New call','new-call'],['meta','Ask Meta AI','ask-meta']].map(([img,label,action])=>`<button class="quick-action" data-action="${action}"><span class="quick-icon">${icon(img)}</span><span>${label}</span></button>`).join('')}</div></section>`;
}
function safeAttachmentUrl(url) { return typeof url==='string' && (/^data:[a-z0-9.+\-/]+(?:;[a-z0-9=.+\-/]+)*;base64,[a-z0-9+/=\s]+$/i.test(url)||/^assets\/[a-zA-Z0-9_.-]+$/.test(url))?url:''; }
function messageMarkup(message, index, all) {
  const start=!index||all[index-1].outgoing!==message.outgoing||all[index-1].sender!==message.sender||dayKey(all[index-1].sentAt)!==dayKey(message.sentAt);
  const metadata=`${message.pinned?icon('pin'):''}${message.starred?icon('star','favorite-star'):''}<time datetime="${new Date(message.sentAt).toISOString()}">${escapeHTML(formatMessageTime(message.sentAt))}</time>${message.outgoing?icon('read','receipt-icon'):''}`;
  let attachment='';
  if(message.attachment){const a=message.attachment,url=safeAttachmentUrl(a.url);attachment=(a.type?.startsWith('image/')&&url)?`<img class="message-photo" src="${escapeHTML(url)}" alt="${escapeHTML(a.name)}" data-action="preview-photo" data-message="${escapeHTML(message.id)}">`:`<a class="message-attachment" href="${escapeHTML(url||'#')}" download="${escapeHTML(a.name)}">${icon('document')}<div><strong>${escapeHTML(a.name)}</strong><small>${a.size?`${(a.size/1024).toFixed(1)} KB · `:''}${escapeHTML(a.type==='audio/demo'?'Voice message':a.name?.split('.').pop()?.toUpperCase()||'DOCUMENT')}</small></div>${icon('download')}</a>`;}
  return `<div class="message ${message.outgoing?'outgoing':''} ${start?'group-start':''} ${message.reaction?'has-reaction':''}" data-message-id="${escapeHTML(message.id)}" tabindex="0" aria-label="${escapeHTML((message.outgoing?'You':getChat()?.name||'Contact')+': '+(message.text||message.attachment?.name||'Message'))}">${message.forwarded?`<div class="forwarded-label">${icon('forward')}Forwarded</div>`:''}${message.sender&&!message.outgoing?`<div class="message-sender">${escapeHTML(message.sender)}</div>`:''}${message.reply?`<button class="quoted-message" data-action="jump-message" data-message="${escapeHTML(message.reply.id)}"><strong>${escapeHTML(message.reply.sender)}</strong><span>${escapeHTML(message.reply.text)}</span></button>`:''}${attachment}<div class="message-copy"><span class="message-text">${escapeHTML(message.text||'')}</span><span class="message-info-spacer" aria-hidden="true">${metadata}</span></div><span class="message-info">${metadata}</span>${iconButton('down','Message options','message-menu','message-action',`data-message="${escapeHTML(message.id)}" aria-haspopup="menu" aria-expanded="false"`)}${message.reaction?`<button class="message-reaction" data-action="react-more" data-message="${escapeHTML(message.id)}" aria-label="Reaction ${escapeHTML(message.reaction)}">${escapeHTML(message.reaction)}<span>1</span></button>`:''}</div>`;
}
function renderMessages(scroll=true) {
  const el=$('#messages');if(!el)return;
  const previousScroll=el.scrollTop;
  const messages=[...(data.messages[state.selected]||[])].sort((a,b)=>a.sentAt-b.sentAt);
  const encryption=`<button type="button" class="encryption-note" data-action="encryption">${icon('lock')}Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Click to learn more</button>`;
  el.innerHTML=messages.length?messages.map((m,i)=>`${!i||dayKey(messages[i-1].sentAt)!==dayKey(m.sentAt)?`<div class="date-marker">${escapeHTML(messageDayLabel(m.sentAt))}</div>${!i?encryption:''}`:''}${messageMarkup(m,i,messages)}`).join(''):`<div class="date-marker">TODAY</div>${encryption}`;
  el.scrollTop=scroll?el.scrollHeight:previousScroll;
  renderPinnedMessage();
  if(state.searchText) highlightMessages();
}
function composerMarkup() {
  return `<form id="composer" class="composer">${iconButton('attach','Attach','attach')}${iconButton('sticker','Emojis, GIFs, Stickers','emoji')}<div class="composer-input-wrap"><textarea id="message-input" rows="1" placeholder="Type a message" aria-label="Type a message">${escapeHTML(state.drafts[state.selected]||'')}</textarea></div><button id="send-button" type="submit" class="icon-button send-button" aria-label="Send message" title="Send message" ${!(state.drafts[state.selected]||'').trim()?'hidden':''}>${icon('send')}</button>${iconButton('mic','Record a voice message','voice','voice-button',(state.drafts[state.selected]||'').trim()?'hidden':'')}</form>`;
}
function renderConversation() {
  const chat=getChat();if(!chat){state.selected=null;renderWelcome();return;}
  $('#main').innerHTML=`<header class="view-header">${iconButton('back','Back to chats','mobile-back','mobile-back')}<button class="chat-heading" data-action="chat-info" aria-label="${escapeHTML(chat.name)} contact info">${avatar(chat)}<span class="chat-heading-text"><h1>${escapeHTML(chat.name)}</h1><p>${escapeHTML(chat.type==='self'?'Message yourself':chat.id==='meta'?'Local assistant demo':chat.members||'click here for contact info')}</p></span></button><div class="chat-header-actions">${iconButton('video','Video call','video-call','video-action')}${iconButton('call','Voice call','voice-call')}${iconButton('search','Search conversation','conversation-search')}${iconButton('more','Conversation menu','chat-menu')}</div></header>${state.chatSearch?`<div class="conversation-search">${searchConversationMarkup()}</div>`:''}<div id="messages" class="messages" role="log" aria-label="Messages"></div>${composerMarkup()}`;
  renderMessages();
  renderReplyPreview();
  if(state.emoji) renderEmoji();
  if(state.detail) renderDetail();
  const input=$('#message-input');if(input){input.style.height='auto';input.style.height=Math.min(140,Math.max(28,input.scrollHeight))+'px';}
}
function searchConversationMarkup() {return `<div class="search-wrap">${icon('search')}<input id="conversation-query" aria-label="Search messages" placeholder="Search messages" value="${escapeHTML(state.searchText)}" autocomplete="off"></div><span id="match-count" class="match-count"></span>${iconButton('close','Close conversation search','close-conversation-search')}`;}
function renderEmoji() {
  $('#emoji-panel')?.remove();
  $('#main').insertAdjacentHTML('beforeend',`<div id="emoji-panel" class="emoji-panel"><h3>Smileys & people</h3><div class="emoji-grid">${['😀','😃','😄','😁','😊','🥰','😍','😎','🤩','🥳','😂','🤣','😉','🙂','🙃','😌','😘','🤔','🫡','😅','😴','👋','👍','🙌','👏','🙏','🤝','💪','❤️','💚','✨','🔥','🎉','🌿','☀️','🌈','☕','🍕','🎈','📚','💻','🚀'].map(e=>`<button data-action="insert-emoji" data-emoji="${e}" aria-label="Insert ${e}">${e}</button>`).join('')}</div></div>`);
}
function renderFeature(iconName,title,description,buttonLabel,action) {
  $('#main').innerHTML=`<section class="welcome"><div class="welcome-card feature-card"><div class="feature-icon">${icon(iconName)}</div><h1>${title}</h1><p>${description}</p>${buttonLabel?`<button class="pill-button" data-action="${action}">${buttonLabel}</button>`:''}</div></section>`;
}
function renderContactsPanel() {
  const q=state.query.toLowerCase();const contacts=data.chats.filter(c=>['person','self'].includes(c.type)&&c.id!=='meta'&&c.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  const isCall=state.panel==='new-call';const isDocument=state.panel==='send-document';
  const title=isCall?'New call':isDocument?'Send document':'New chat';
  $('#sidebar').innerHTML=backHeader(title)+searchMarkup('Search phone number')+`<div class="sidebar-scroll">${!isCall&&!isDocument?`<button class="new-contact-action" data-action="add-contact"><span class="action-circle">${icon('addContact')}</span>New contact</button>`:''}<p class="section-label">${isDocument?'Choose a chat':isCall?'Contacts':'Contacts on WhatsApp'}</p><div id="contact-results" class="contact-list">${contacts.map(c=>`<button class="chat-row" data-action="${isCall?'call-contact':isDocument?'document-contact':'open-chat'}" data-id="${c.id}" aria-label="${escapeHTML(c.name)}">${avatar(c)}<span class="chat-content"><span class="chat-name">${escapeHTML(c.name)}</span><span class="chat-bottom"><span class="chat-preview">${escapeHTML(c.about||'Hey there! I am using WhatsApp.')}</span></span></span>${isCall?icon('call'):''}</button>`).join('')||'<p class="empty-list">No contacts found.</p>'}</div></div>`;
}
function renderCallsSidebar() {
  const defaultCalls=[{chatId:'alex',type:'voice',time:'Today, 3:20 PM'},{chatId:'jamie',type:'video',time:'Yesterday, 5:42 PM'},{chatId:'maya',type:'voice',time:'Yesterday, 12:10 PM'}];
  const calls=[...data.calls,...defaultCalls].filter(c=>getChat(c.chatId)?.name.toLowerCase().includes(state.query.toLowerCase()));
  $('#sidebar').innerHTML=sidebarHeader('Calls','new-call','New call','video')+searchMarkup('Search calls')+`<div class="sidebar-scroll"><p class="section-label">Recent</p>${calls.map(call=>{const c=getChat(call.chatId);return `<button class="chat-row call-row" data-action="call-contact" data-id="${c.id}" data-type="${call.type}" aria-label="Call ${escapeHTML(c.name)}">${avatar(c)}<span class="chat-content"><span class="chat-name">${escapeHTML(c.name)}</span><span class="chat-bottom"><span class="chat-preview">${icon('arrow')}<span>${escapeHTML(call.time)}</span></span></span><span class="row-call">${icon(call.type==='video'?'video':'call')}</span></button>`;}).join('')||'<p class="empty-list">No calls found.</p>'}<p class="list-footer">${icon('lock')}Your personal calls are end-to-end encrypted</p></div>`;
}
function renderStatusSidebar() {
  const contacts=['jamie','maya','sam'].map(id=>getChat(id)).filter(c=>c.name.toLowerCase().includes(state.query.toLowerCase()));
  $('#sidebar').innerHTML=sidebarHeader('Status','new-status','Add status','plus')+searchMarkup('Search status')+`<div class="sidebar-scroll"><button class="chat-row" data-action="new-status" aria-label="My status">${avatar({name:data.profile.name,avatar:'landscape'})}<span class="chat-content"><span class="chat-name">My status</span><span class="chat-bottom"><span class="chat-preview">Click to add a status update</span></span></span></button><p class="section-label">Recent updates</p>${contacts.map((c,i)=>`<button class="chat-row" data-action="view-status" data-id="${c.id}" aria-label="${escapeHTML(c.name)} status"><span class="avatar status-ring">${avatar(c)}</span><span class="chat-content"><span class="chat-name">${escapeHTML(c.name)}</span><span class="chat-bottom"><span class="chat-preview">Today, ${['10:32 AM','9:15 AM','8:48 AM'][i]}</span></span></span></button>`).join('')}<p class="list-footer">${icon('lock')}Your status updates are end-to-end encrypted</p></div>`;
}
const channels=[{id:'design-daily',name:'Design Daily',avatar:'group',color:'#ddd7f6',ink:'#7960b5',about:'A little inspiration for your everyday.',followers:'12.4K',post:'Good design starts with a little curiosity. What inspired you today? ✨'},{id:'travel-notes',name:'Travel Notes',avatar:'landscape',about:'Places, stories, and the joy of exploring.',followers:'8.2K',post:'Take the scenic route. There’s always something new to discover. 🌿'},{id:'good-news',name:'Good News',avatar:'initial',initial:'☀',color:'#f8e5ab',ink:'#bf9040',about:'Your daily dose of good news.',followers:'24.1K',post:'Small acts of kindness can make a big difference. Share a little positivity today. 💚'}];
function renderChannelsSidebar() {
  $('#sidebar').innerHTML=sidebarHeader('Channels','find-channels','Find channels','plus')+searchMarkup('Search channels')+`<div class="sidebar-scroll"><p class="sidebar-description">Stay updated on the topics that matter to you. Find channels to follow below.</p><p class="section-label">${channels.some(c=>data.prefs['follow-'+c.id])?'Your channels':'Find channels'}</p>${channels.filter(c=>c.name.toLowerCase().includes(state.query.toLowerCase())).map(c=>`<button class="chat-row" data-action="open-channel" data-id="${c.id}" aria-label="${c.name}">${avatar(c)}<span class="chat-content"><span class="chat-name">${c.name}</span><span class="chat-bottom"><span class="chat-preview">${c.followers} followers${data.prefs['follow-'+c.id]?' · Following':''}</span></span></span></button>`).join('')}</div>`;
}
function renderChannel() {
  const c=channels.find(c=>c.id===state.channel);if(!c)return;
  $('#main').innerHTML=`<header class="view-header">${iconButton('back','Back to channels','mobile-back','mobile-back')}${avatar(c)}<div class="chat-heading-text" style="flex:1"><h1 style="font-size:16px;font-weight:500">${c.name}</h1><p style="font-size:12px;color:var(--muted)">${c.followers} followers</p></div><button class="channel-action" data-action="follow-channel" data-id="${c.id}">${data.prefs['follow-'+c.id]?'Following':'Follow'}</button></header><div class="messages"><div class="date-marker">TODAY</div><div class="message group-start"><div class="message-sender">${c.name}</div><span class="message-text">${c.post}</span><span class="message-info">10:30 AM</span></div></div><p class="demo-note">${c.about}</p>`;
}
function renderMediaSidebar() {
  const items=data.chats.flatMap(c=>(data.messages[c.id]||[]).filter(m=>m.attachment).map(m=>({chat:c,message:m})));
  $('#sidebar').innerHTML=backHeader('Media','go-chats')+`<p class="sidebar-description">Photos and documents from your conversations.</p><div class="sidebar-scroll"><div class="media-grid">${items.map(({chat:c,message:m})=>`<button class="media-tile" data-action="media-chat" data-id="${c.id}" aria-label="${escapeHTML(m.attachment.name)} in ${escapeHTML(c.name)}">${m.attachment.type.startsWith('image/')?`<img src="${escapeHTML(safeAttachmentUrl(m.attachment.url))}" alt="${escapeHTML(m.attachment.name)}">`:icon('document')}<span>${escapeHTML(m.attachment.name)}</span></button>`).join('')||'<p class="empty-list">Send a photo or document to see it here.</p>'}</div></div>`;
}
function renderProfileSidebar() {
  $('#sidebar').innerHTML=backHeader('Profile','go-chats')+`<div class="sidebar-scroll"><div class="profile-cover">${avatar({name:data.profile.name,avatar:'landscape'})}<p>This profile is saved in your browser.</p></div><div class="profile-block"><p class="label">Your name</p><div class="value"><span>${escapeHTML(data.profile.name)}</span>${iconButton('edit','Edit your name','edit-name')}</div><p class="demo-note" style="margin:18px 0 0;text-align:left">This is the name your contacts will see.</p></div><div class="profile-block"><p class="label">About</p><div class="value"><span>${escapeHTML(data.profile.about)}</span>${iconButton('edit','Edit about','edit-about')}</div></div><button class="settings-row" data-action="settings">${icon('settings')}<span>Settings</span>${icon('chevron','chevron')}</button></div>`;
}
function renderSettingsSidebar() {
  $('#sidebar').innerHTML=backHeader('Settings')+`<div class="sidebar-scroll"><button class="chat-row" data-action="nav" data-view="profile">${avatar({name:data.profile.name,avatar:'landscape'})}<span class="chat-content"><span class="chat-name">${escapeHTML(data.profile.name)}</span><span class="chat-bottom"><span class="chat-preview">${escapeHTML(data.profile.about)}</span></span></span></button>${[['user','Profile','Your name and about','profile'],['bell','Notifications','Sounds and message previews','notifications'],['sun','Appearance','Light and dark theme','appearance'],['star','Starred messages','Keep your important messages handy','starred'],['info','Help','About this local demo','help']].map(([img,title,desc,action])=>`<button class="settings-row" data-action="${action}">${icon(img)}<span>${title}<small>${desc}</small></span>${icon('chevron','chevron')}</button>`).join('')}</div>`;
}
function renderStarredSidebar() {
  const items=data.chats.flatMap(c=>(data.messages[c.id]||[]).filter(m=>m.starred).map(m=>({chat:c,message:m})));
  $('#sidebar').innerHTML=backHeader('Starred messages')+`<div class="sidebar-scroll">${items.map(({chat:c,message:m})=>`<button class="chat-row" data-action="open-chat" data-id="${c.id}">${avatar(c)}<span class="chat-content"><span class="chat-top"><span class="chat-name">${escapeHTML(c.name)}</span>${icon('star','favorite-star')}</span><span class="chat-bottom"><span class="chat-preview">${escapeHTML(m.text||m.attachment?.name)}</span></span></span></button>`).join('')||'<p class="empty-list">Star a message from its menu to find it here.</p>'}</div>`;
}
function sidebarScrollKey() {return !state.panel&&['chats','meta'].includes(state.view)?`chats:${state.filter}:${state.query}`:`${state.view}:${state.panel||''}:${state.query}`;}
function rememberSidebarScroll() {
  const sidebar=$('#sidebar'),scroll=sidebar?.querySelector('.sidebar-scroll');
  if(scroll?.clientHeight&&sidebar.dataset.scrollKey)state.sidebarScroll[sidebar.dataset.scrollKey]=scroll.scrollTop;
}
function renderSidebar(remember=true) {
  if(remember)rememberSidebarScroll();
  const key=sidebarScrollKey();
  renderSidebarContent();
  $('#sidebar').dataset.scrollKey=key;
  const scroll=$('#sidebar .sidebar-scroll');if(scroll)scroll.scrollTop=state.sidebarScroll[key]||0;
}
function renderSidebarContent() {
  $('#sidebar').setAttribute('aria-label',state.panel||state.view);
  if(['new-chat','new-call','send-document'].includes(state.panel)) {renderContactsPanel();return;}
  if(state.panel==='settings'){renderSettingsSidebar();return;}
  if(state.panel==='starred'){renderStarredSidebar();return;}
  ({chats:renderChatsSidebar,calls:renderCallsSidebar,status:renderStatusSidebar,channels:renderChannelsSidebar,media:renderMediaSidebar,profile:renderProfileSidebar,meta:renderChatsSidebar}[state.view]||renderChatsSidebar)();
}
function renderMain() {
  if(state.selected) {renderConversation();return;}
  if(state.view==='channels'&&state.channel) {renderChannel();return;}
  if(state.view==='calls')renderFeature('call','Make calls with WhatsApp','Call your friends and family right from your computer.','Start a call','new-call');
  else if(state.view==='status')renderFeature('status','Share everyday moments','View status updates from your contacts and share a moment of your own.','Add a status','new-status');
  else if(state.view==='channels')renderFeature('channels','Find channels to follow','Get updates from the people and organizations that interest you.','Explore channels','find-channels');
  else if(state.view==='media')renderFeature('media','Your shared media','Find photos and documents from all your conversations in one place.','','');
  else if(state.view==='profile')renderFeature('user',escapeHTML(data.profile.name),escapeHTML(data.profile.about),'Edit profile','edit-name');
  else renderWelcome();
}
function render() {
  rememberSidebarScroll();
  document.documentElement.dataset.theme=data.prefs.theme;
  $('#app').classList.toggle('mobile-conversation',!!state.selected||!!state.channel);
  renderRail();renderSidebar(false);renderMain();
}

function openChat(id) {
  const chat=getChat(id);if(!chat)return;
  stopRecording();
  hideMenu();state.replyTo=null;
  state.selected=id;state.channel=null;state.panel=null;state.view=id==='meta'?'meta':'chats';state.emoji=false;state.detail=false;state.chatSearch=false;state.searchText='';
  chat.unread=0;save();render();$('#message-input')?.focus();
}
function navigate(view) {
  stopRecording();hideMenu();state.replyTo=null;state.view=view;state.panel=null;state.selected=null;state.channel=null;state.query='';state.filter='all';state.emoji=false;state.detail=false;
  state.selectMode=false;state.selectIds=[];
  if(view==='meta'){openMeta();return;}
  render();
}
function openPanel(panel) {
  state.panel=panel;state.query='';renderSidebar();$('#sidebar-search')?.focus();
}
function showMenu(anchor, items, above=false) {
  const pop=$('#popover');pop.className='popover';pop.style.width='';pop.style.removeProperty('--message-menu-height');pop.removeAttribute('role');pop.removeAttribute('aria-label');pop.innerHTML=items.map(item=>item==='separator'?'<div class="menu-separator"></div>':`<button class="menu-item ${item.danger?'danger':''}" data-action="${item.action}" ${item.attrs||''}>${item.icon?icon(item.icon):''}<span>${item.label}</span></button>`).join('');
  pop.hidden=false;
  const rect=anchor.getBoundingClientRect();
  let top=above?rect.top-pop.offsetHeight-8:rect.bottom+6;
  if(top+pop.offsetHeight>innerHeight-12)top=rect.top-pop.offsetHeight-6;
  pop.style.top=Math.max(10,top)+'px';
  pop.style.left=Math.max(10,Math.min(rect.right-pop.offsetWidth,innerWidth-pop.offsetWidth-10))+'px';
  pop.querySelector('button')?.focus();
}
function hideMenu(restoreFocus=false) {
  const trigger=$('.message-menu-open .message-action');
  document.querySelectorAll('.message-menu-open').forEach(el=>el.classList.remove('message-menu-open'));
  trigger?.setAttribute('aria-expanded','false');$('#popover').hidden=true;state.menuMessageId=null;state.menuChatId=null;
  if(restoreFocus)trigger?.focus();
}
function getMessage(id,chatId=state.selected) {return (data.messages[chatId]||[]).find(m=>m.id===id);}
function messageText(message) {return message.text||message.attachment?.name||'Message';}
function showMessageMenu(anchor,message) {
  hideMenu();if(!message||!anchor)return;
  const bubble=anchor.closest('.message'),pop=$('#popover');
  state.menuMessageId=message.id;state.menuChatId=state.selected;
  bubble.classList.add('message-menu-open');anchor.setAttribute('aria-expanded','true');
  const attrs=`data-message="${escapeHTML(message.id)}"`;
  const items=[
    ['info','Message info','message-info'],['back','Reply','reply-message'],['copy','Copy','copy-message'],
    ['smile','React','react-more'],['forward','Forward','forward-message'],['pin',message.pinned?'Unpin':'Pin','pin-message'],
    ['meta','Ask Meta AI','ask-about-message'],['star',message.starred?'Unstar':'Star','star-message']
  ];
  pop.className=`popover message-popover ${message.outgoing?'outgoing-menu':'incoming-menu'}`;
  pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Message actions');
  pop.innerHTML=`<div class="message-reaction-bar" role="toolbar" aria-label="Quick reactions">${['👍','❤️','😂','😮','😢','🙏'].map(emoji=>`<button class="quick-reaction ${message.reaction===emoji?'selected':''}" data-action="react-message" ${attrs} data-emoji="${emoji}" aria-label="React with ${emoji}" aria-pressed="${message.reaction===emoji}">${emoji}</button>`).join('')}<button class="quick-reaction more-reactions" data-action="react-more" ${attrs} aria-label="Choose another reaction">${icon('plus')}</button></div><div class="message-menu" role="menu" aria-label="Message options">${items.map(([img,label,action])=>`<button class="menu-item" role="menuitem" data-action="${action}" ${attrs}>${icon(img)}<span>${label}</span></button>`).join('')}<div class="menu-separator" role="separator"></div><button class="menu-item danger" role="menuitem" data-action="delete-message" ${attrs}>${icon('trash')}<span>Delete</span></button></div>`;
  pop.hidden=false;
  const bounds=$('#main').getBoundingClientRect(),r=bubble.getBoundingClientRect();
  const minTop=$('#messages').getBoundingClientRect().top+8;
  const maxBottom=($('#composer')?.getBoundingClientRect().top||bounds.bottom)-8;
  pop.style.width=Math.min(244,bounds.width-24)+'px';
  pop.style.setProperty('--message-menu-height',Math.max(90,maxBottom-minTop-46)+'px');
  const width=pop.offsetWidth,height=pop.offsetHeight;
  const minLeft=bounds.left+12,maxLeft=bounds.right-width-12;
  pop.style.left=Math.max(minLeft,Math.min(message.outgoing?r.right-width:r.left,maxLeft))+'px';
  const below=r.bottom+6,above=r.top-height-6;
  const preferred=below+height<=maxBottom?below:above>=minTop?above:maxBottom-height;
  pop.style.top=Math.max(minTop,Math.min(preferred,maxBottom-height))+'px';
  pop.querySelector('[role="menuitem"]')?.focus();
}
function renderReplyPreview() {
  $('#reply-preview')?.remove();if(!state.replyTo||!$('#composer'))return;
  $('#composer').insertAdjacentHTML('beforebegin',`<div id="reply-preview" class="reply-preview">${icon('back')}<div><strong>${escapeHTML(state.replyTo.sender)}</strong><p>${escapeHTML(state.replyTo.text)}</p></div>${iconButton('close','Cancel reply','cancel-reply')}</div>`);
}
function renderPinnedMessage() {
  $('#pinned-message')?.remove();
  const message=(data.messages[state.selected]||[]).find(m=>m.pinned);if(!message||!$('#messages'))return;
  $('#messages').insertAdjacentHTML('beforebegin',`<button id="pinned-message" class="pinned-message" data-action="jump-message" data-message="${escapeHTML(message.id)}">${icon('pin')}<span class="pinned-message-content"><strong>Pinned message</strong><span>${escapeHTML(messageText(message))}</span></span>${icon('chevron')}</button>`);
}
function jumpToMessage(id) {
  const element=document.querySelector(`[data-message-id="${CSS.escape(id)}"]`);if(!element)return;
  element.scrollIntoView({block:'center',behavior:'smooth'});element.classList.add('message-highlight');
  setTimeout(()=>element.classList.remove('message-highlight'),1200);
}
function reactionPicker(id) {
  if(!getMessage(id))return;
  openModal('React to message',`<div class="emoji-grid message-emoji-picker">${['😀','😃','😄','😁','😊','🥰','😍','😎','🤩','🥳','😂','🤣','😉','🙂','🙃','😌','😘','🤔','🫡','😅','😴','👋','👍','🙌','👏','🙏','🤝','💪','❤️','💚','✨','🔥','🎉','🌿','☀️','🌈','☕','🍕','🎈','📚','💻','🚀'].map(emoji=>`<button data-action="react-message" data-message="${escapeHTML(id)}" data-emoji="${emoji}" aria-label="React with ${emoji}">${emoji}</button>`).join('')}</div>`);
}
async function copyMessage(id) {
  const message=getMessage(id);if(!message)return;const text=messageText(message);
  try {await navigator.clipboard.writeText(text);toast('Message copied');}
  catch {
    const input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;left:-9999px';document.body.append(input);input.select();
    const copied=document.execCommand('copy');input.remove();
    if(copied)toast('Message copied');else openModal('Copy message',`<label class="field">Message<textarea id="copy-text" readonly rows="4">${escapeHTML(text)}</textarea></label>`);
  }
}
function forwardMessagePicker(id) {
  if(!getMessage(id))return;state.forwardMessage={chatId:state.selected,messageId:id};
  openModal('Forward message',`<p>Choose a private conversation.</p><div class="contact-list forward-contacts">${data.chats.filter(c=>['person','self'].includes(c.type)&&c.id!=='meta').map(c=>`<button class="chat-row" data-action="forward-to" data-id="${escapeHTML(c.id)}" aria-label="Forward to ${escapeHTML(c.name)}">${avatar(c)}<span class="chat-name">${escapeHTML(c.name)}</span></button>`).join('')}</div>`);
}
function refreshChatPreview(chatId) {
  const c=getChat(chatId),last=(data.messages[chatId]||[]).reduce((newest,message)=>!newest||message.sentAt>=newest.sentAt?message:newest,null);if(!c)return;
  c.preview=last?messageText(last):'';c.previewIcon=last?.attachment?(last.attachment.type.startsWith('image/')?'image':'document'):null;c.outgoing=!!last?.outgoing;
  if(last)c.lastMessageAt=last.sentAt;
  c.time=formatChatTime(c.lastMessageAt);
}
function deleteMessage(id) {
  const messages=data.messages[state.selected]||[],index=messages.findIndex(m=>m.id===id);if(index<0)return;
  const entry={id:uniqueId(),chatId:state.selected,index,message:messages[index]};
  data.trash.push(entry);messages.splice(index,1);refreshChatPreview(state.selected);save();closeModal();renderMessages(false);renderSidebar();toast('Message deleted',entry.id);
}
function messageInfo(id) {
  const m=getMessage(id);if(!m)return;
  const when=`${messageDayLabel(m.sentAt)} at ${formatMessageTime(m.sentAt)}`;
  openModal('Message info',`<div class="message-info-preview">${escapeHTML(messageText(m))}</div><div class="message-receipt">${icon(m.outgoing?'read':'check')}<div><strong>${m.outgoing?'Read':'Received'}</strong><p>${escapeHTML(when)}</p></div></div>${m.outgoing?`<div class="message-receipt">${icon('check')}<div><strong>Delivered</strong><p>${escapeHTML(when)}</p></div></div>`:''}<p class="demo-note">Sample message details from this local conversation.</p>`);
}
function openModal(title,body,footer='',extraClass='') {
  modalReturnFocus=document.activeElement;
  $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal ${extraClass}" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><header class="modal-header"><h2>${escapeHTML(title)}</h2>${iconButton('close','Close dialog','close-modal')}</header>${body}${footer?`<div class="modal-actions">${footer}</div>`:''}</section></div>`;
  const input=$('#modal-root input,#modal-root textarea');(input||$('#modal-root button'))?.focus();
}
function closeModal() {
  if(state.call)finishCall();
  $('#modal-root').innerHTML='';
  if(modalReturnFocus?.isConnected)modalReturnFocus.focus();
}
function modalButtons(action,label='Save') {return `<button class="secondary-button" data-action="close-modal">Cancel</button><button class="solid-button" data-action="${action}">${label}</button>`;}
function highlightMessages() {
  const q=state.searchText.toLowerCase().trim();let first;let count=0;
  document.querySelectorAll('.message').forEach(el=>{const match=!!q&&el.textContent.toLowerCase().includes(q);el.classList.toggle('match',match);if(match){count++;first||=el;}});
  if($('#match-count'))$('#match-count').textContent=q?`${count} found`:'';
  first?.scrollIntoView({block:'center'});
}
function updateComposer() {
  const el=$('#message-input');if(!el)return;
  state.drafts[state.selected]=el.value;el.style.height='auto';el.style.height=Math.min(140,Math.max(28,el.scrollHeight))+'px';
  $('#send-button').hidden=!el.value.trim();$('#composer .voice-button').hidden=!!el.value.trim();
}
function appendMessage(chatId,message) {
  const chat=getChat(chatId);if(!chat)return;
  message.id||=uniqueId();message.sentAt||=Date.now();message.time=formatMessageTime(message.sentAt);
  (data.messages[chatId]||=[]).push(message);
  refreshChatPreview(chatId);
  save();
  if(state.selected===chatId)renderMessages();
  renderSidebar();renderRail();
}
function sendMessage() {
  const el=$('#message-input');const text=el?.value.trim();if(!text||!state.selected)return;
  const chatId=state.selected;state.drafts[chatId]='';el.value='';updateComposer();state.emoji=false;$('#emoji-panel')?.remove();
  const reply=state.replyTo?structuredClone(state.replyTo):undefined;state.replyTo=null;$('#reply-preview')?.remove();
  appendMessage(chatId,{text,outgoing:true,reply});el.focus();
  if(chatId==='meta'){
    let response='This local assistant demo can help you explore the interface. Try searching chats, adding a favorite, or switching the theme in Settings.';
    if(/hello|^hi\b|hey/i.test(text))response='Hey! 👋 Welcome to your local WhatsApp UI. What would you like to try?';
    else if(/theme|dark|light/i.test(text))response='To change the theme, open Menu → Settings → Appearance. Your preference is saved in this browser.';
    else if(/search|find/i.test(text))response='Use the search bar above your chat list to search phone numbers and messages. You can also search within a conversation using the search icon in its header.';
    else if(/pin|message/i.test(text))response='Open a message’s arrow menu to reply, react, copy, forward, pin, or star it. Pinned messages appear above the conversation.';
    setTimeout(()=>appendMessage(chatId,{text:response}),500);
  }
}
function openMeta() {
  if(!getChat('meta')){const now=Date.now();data.chats.push({id:'meta',name:'Meta AI',type:'person',avatar:'initial',initial:'M',color:'#eee8ff',ink:'#7353dd',preview:'Ask a question or find a little inspiration',lastMessageAt:now,about:'Local assistant demo'});data.messages.meta=[{id:'ai-welcome',text:'Hi! 👋 I’m the local assistant demo. Ask me about themes, search, or message actions to explore the UI.',sentAt:now}];save();}
  openChat('meta');
}
function renderDetail() {
  $('#contact-detail')?.remove();const c=getChat();if(!c)return;
  $('#main').insertAdjacentHTML('beforeend',`<aside id="contact-detail" class="detail-panel" aria-label="Contact info"><header class="view-header">${iconButton('close','Close contact info','close-detail')}<h2>${['group','community'].includes(c.type)?'Group info':'Contact info'}</h2></header><div class="profile-cover">${avatar(c)}<h2>${escapeHTML(c.name)}</h2><p>${escapeHTML(c.members||c.about||'Hey there! I am using WhatsApp.')}</p></div><div class="profile-block"><p class="label">${c.members?'Members':'About'}</p><p style="font-size:14px;line-height:22px">${escapeHTML(c.members||c.about||'Available')}</p></div><button class="detail-action" data-action="toggle-favorite">${icon('star')}<span>${c.favorite?'Remove from favorites':'Add to favorites'}</span></button><button class="detail-action" data-action="toggle-pin">${icon('pin')}<span>${c.pinned?'Unpin chat':'Pin chat'}</span></button><button class="detail-action" data-action="nav" data-view="media">${icon('media')}<span>Media and documents</span></button><p class="demo-note">This conversation contains sample data stored locally in your browser.</p></aside>`);
}
function toggleChatProperty(property) {
  const c=getChat();if(!c)return;c[property]=!c[property];save();renderSidebar();if(state.detail)renderDetail();
  toast(property==='favorite'?(c.favorite?'Added to favorites':'Removed from favorites'):(c.pinned?'Chat pinned':'Chat unpinned'));
}
function chooseAttachment(kind,chatId=state.selected) {
  if(!chatId){openPanel('send-document');return;}
  pendingAttachmentChat=chatId;const input=$('#attachment-input');input.accept=kind==='image'?'image/png,image/jpeg,image/gif,image/webp':'';input.value='';input.click();
}
async function handleAttachment(file) {
  if(!file)return;
  if(file.size>5*1024*1024){toast('Choose a file smaller than 5 MB for this local demo.');return;}
  const chatId=pendingAttachmentChat;pendingAttachmentChat=null;if(!getChat(chatId))return;
  try {
    const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
    const type=['image/png','image/jpeg','image/gif','image/webp'].includes(file.type)?file.type:(file.type?.startsWith('image/')?'application/octet-stream':file.type||'application/octet-stream');
    appendMessage(chatId,{attachment:{name:file.name,size:file.size,type,url},outgoing:true});
    if(state.selected!==chatId)openChat(chatId);
  }catch{toast('Could not read that file. Try another file.');}
}
function startCall(chatId,type='voice') {
  const c=getChat(chatId);if(!c)return;
  state.call={chatId,type,start:Date.now()};
  openModal(type==='video'?'Video call':'Voice call',`<div class="call-stage">${avatar(c)}<h2>${escapeHTML(c.name)}</h2><p id="call-time" class="call-type">Demo call · 00:00</p><div class="call-controls">${iconButton('mic','Toggle microphone','call-mic')}${type==='video'?iconButton('video','Toggle camera','call-camera'):''}${iconButton('call','End call','end-call','hangup')}</div><p class="call-demo-label">This is a local call preview. No call is placed, and your camera and microphone are not accessed.</p></div>`);
  clearInterval(callTimer);callTimer=setInterval(()=>{if(state.call&&$('#call-time')){const sec=Math.floor((Date.now()-state.call.start)/1000);$('#call-time').textContent=`Demo call · ${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}},1000);
}
function finishCall() {
  clearInterval(callTimer);if(!state.call)return;
  data.calls.unshift({chatId:state.call.chatId,type:state.call.type,time:`Today, ${clockTime()}`});data.calls=data.calls.slice(0,30);state.call=null;save();if(state.view==='calls'&&!state.panel)renderCallsSidebar();
}
function startRecording() {
  if(!state.selected)return;state.recording={chatId:state.selected,start:Date.now()};
  $('#composer').innerHTML=`${iconButton('trash','Cancel voice message','cancel-voice')}<span class="recording-label"><span class="recording-dot"></span>Voice message demo <span id="recording-time">0:00</span></span><button type="button" class="icon-button send-button" data-action="send-voice" aria-label="Send demo voice message">${icon('send')}</button>`;
  recordingTimer=setInterval(()=>{if(!state.recording)return;const sec=Math.floor((Date.now()-state.recording.start)/1000);if($('#recording-time'))$('#recording-time').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;},1000);
}
function stopRecording() {clearInterval(recordingTimer);state.recording=null;}
function appearanceModal() {
  openModal('Appearance','<p>Choose how WhatsApp looks on this device.</p>'+`<div class="theme-options">${[['light','Light','sun'],['dark','Dark','moon']].map(([theme,label,img])=>`<button class="theme-option ${data.prefs.theme===theme?'selected':''}" data-action="set-theme" data-theme="${theme}" aria-pressed="${data.prefs.theme===theme}">${icon(img)}${label}</button>`).join('')}</div>`);
}
function notificationsModal() {
  openModal('Notifications',`<p>Customize notifications for this local demo.</p><div class="switch-row"><span>Message sounds</span><button class="switch" role="switch" aria-label="Message sounds" aria-checked="${data.prefs.sounds}" data-action="toggle-pref" data-pref="sounds"></button></div><div class="switch-row"><span>Show message previews</span><button class="switch" role="switch" aria-label="Show message previews" aria-checked="${data.prefs.previews}" data-action="toggle-pref" data-pref="previews"></button></div><p style="margin-top:18px">These preferences are stored in your browser.</p>`,`<button class="solid-button" data-action="done-notifications">Done</button>`);
}
function editProfile(field) {
  openModal(field==='name'?'Your name':'About',`<label class="field">${field==='name'?'Enter your name':'Tell your contacts a little about yourself'}<input id="profile-value" maxlength="${field==='name'?50:139}" value="${escapeHTML(data.profile[field])}" data-field="${field}"></label><p id="modal-error" class="field-error"></p>`,modalButtons('save-profile'));
}
function contactModal() {
  openModal('New contact','<p>Add a sample contact with a random Malaysian phone number.</p><label class="field">Avatar initial<input id="contact-name" placeholder="A" maxlength="1"></label><label class="field">About<input id="contact-about" placeholder="Hey there! I am using WhatsApp." maxlength="139"></label><p id="modal-error" class="field-error"></p>',modalButtons('save-contact','Create contact'));
}
function statusModal(chatId) {
  const c=chatId?getChat(chatId):{name:data.profile.name};
  const captions={jamie:'A little fresh air\ngoes a long way 🌿',maya:'Find joy in\nthe little things ✨',sam:'Good coffee.\nGood company. ☕'};
  openModal(c.name,`<div class="status-story"><span class="story-progress"></span><div class="story-text">${escapeHTML(chatId?captions[chatId]||'Have a lovely day ☀️':data.prefs.myStatus||'Hello, world! 👋').replace(/\n/g,'<br>')}</div><span class="story-caption">${escapeHTML(c.name)} · Today</span></div>`);
}
function previewPhoto(messageId) {
  const m=(data.messages[state.selected]||[]).find(m=>m.id===messageId);if(!m?.attachment)return;
  const url=safeAttachmentUrl(m.attachment.url);if(!url)return;
  openModal(m.attachment.name,`<div class="photo-preview"><img src="${escapeHTML(url)}" alt="${escapeHTML(m.attachment.name)}"></div>`,`<a class="solid-button" style="text-decoration:none" href="${escapeHTML(url)}" download="${escapeHTML(m.attachment.name)}">Download</a>`);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(!button){if(!event.target.closest('#popover'))hideMenu();if(event.target.classList.contains('modal-overlay'))closeModal();return;}
  const action=button.dataset.action;hideMenu();
  switch(action){
    case 'nav':navigate(button.dataset.view);break;
    case 'go-chats':navigate('chats');break;
    case 'open-chat':if(state.selectMode){const id=button.dataset.id;state.selectIds=state.selectIds.includes(id)?state.selectIds.filter(c=>c!==id):[...state.selectIds,id];renderSidebar();}else openChat(button.dataset.id);break;
    case 'mobile-back':state.selected=null;state.channel=null;stopRecording();render();break;
    case 'new-chat':openPanel('new-chat');break;
    case 'new-call':openPanel('new-call');break;
    case 'send-document':openPanel('send-document');break;
    case 'sidebar-back':state.panel=null;state.query='';renderSidebar();break;
    case 'filter':state.filter=button.dataset.filter;renderSidebar();break;
    case 'clear-search':state.query='';renderSidebar();$('#sidebar-search')?.focus();break;
    case 'filter-menu':showMenu(button,[{label:'Private chats',icon:'user',action:'filter',attrs:'data-filter="private"'},{label:'Message yourself',icon:'edit',action:'filter',attrs:'data-filter="self"'},{label:'All chats',icon:'chats',action:'filter',attrs:'data-filter="all"'}]);break;
    case 'main-menu':showMenu(button,[{label:'New contact',icon:'addContact',action:'add-contact'},{label:'Starred messages',icon:'star',action:'starred'},{label:'Select chats',icon:'check',action:'select-chats'},'separator',{label:'Settings',icon:'settings',action:'settings'},{label:'About this demo',icon:'info',action:'help'}]);break;
    case 'select-chats':state.selectMode=true;state.selectIds=[];state.view='chats';state.panel=null;state.filter='all';state.query='';renderSidebar();break;
    case 'cancel-selection':state.selectMode=false;state.selectIds=[];renderSidebar();break;
    case 'bulk-favorite':case 'bulk-read':for(const id of state.selectIds){const c=getChat(id);if(c){if(action==='bulk-favorite')c.favorite=true;else c.unread=0;}}save();state.selectMode=false;state.selectIds=[];renderSidebar();renderRail();toast(action==='bulk-favorite'?'Chats added to favorites':'Chats marked as read');break;
    case 'settings':state.panel='settings';state.query='';renderSidebar();break;
    case 'profile':navigate('profile');break;
    case 'starred':state.panel='starred';renderSidebar();break;
    case 'notifications':notificationsModal();break;
    case 'done-notifications':data.prefs.banner=false;save();closeModal();renderSidebar();toast('Notification preferences saved');break;
    case 'toggle-pref':data.prefs[button.dataset.pref]=!data.prefs[button.dataset.pref];button.setAttribute('aria-checked',String(data.prefs[button.dataset.pref]));save();break;
    case 'appearance':appearanceModal();break;
    case 'set-theme':data.prefs.theme=button.dataset.theme;save();document.documentElement.dataset.theme=data.prefs.theme;document.querySelectorAll('.theme-option').forEach(el=>{el.classList.toggle('selected',el.dataset.theme===data.prefs.theme);el.setAttribute('aria-pressed',String(el.dataset.theme===data.prefs.theme));});break;
    case 'edit-name':editProfile('name');break;
    case 'edit-about':editProfile('about');break;
    case 'save-profile':{const input=$('#profile-value'),value=input.value.trim();if(!value){$('#modal-error').textContent='Please enter a value.';input.focus();break;}data.profile[input.dataset.field]=value;if(input.dataset.field==='name'&&getChat('self'))getChat('self').initial=initials(value);save();closeModal();render();toast('Profile updated');break;}
    case 'add-contact':contactModal();break;
    case 'save-contact':{const initial=initials($('#contact-name').value);if(initial==='?'){$('#modal-error').textContent='Please enter a letter.';$('#contact-name').focus();break;}const id='contact-'+uniqueId(),contact={id,name:initial,initial,type:'person',lastMessageAt:Date.now(),about:$('#contact-about').value.trim()||'Hey there! I am using WhatsApp.',preview:''};normalizeContact(contact,data.chats.length);data.chats.push(contact);data.messages[id]=[];save();closeModal();openChat(id);toast('Contact added');break;}
    case 'ask-meta':openMeta();break;
    case 'chat-info':state.detail=true;renderDetail();break;
    case 'close-detail':state.detail=false;$('#contact-detail')?.remove();break;
    case 'toggle-favorite':toggleChatProperty('favorite');break;
    case 'toggle-pin':toggleChatProperty('pinned');break;
    case 'chat-menu':{const c=getChat();if(!c)break;showMenu(button,[{label:'Contact info',icon:'user',action:'chat-info'},{label:c.favorite?'Remove from favorites':'Add to favorites',icon:'star',action:'toggle-favorite'},{label:c.pinned?'Unpin chat':'Pin chat',icon:'pin',action:'toggle-pin'},'separator',{label:'Close chat',icon:'close',action:'mobile-back'}]);break;}
    case 'conversation-search':state.chatSearch=!state.chatSearch;state.searchText='';renderConversation();$('#conversation-query')?.focus();break;
    case 'close-conversation-search':state.chatSearch=false;state.searchText='';renderConversation();$('#message-input')?.focus();break;
    case 'emoji':state.emoji=!state.emoji;if(state.emoji)renderEmoji();else $('#emoji-panel')?.remove();break;
    case 'insert-emoji':{const input=$('#message-input');if(!input)break;const start=input.selectionStart,end=input.selectionEnd;input.value=input.value.slice(0,start)+button.dataset.emoji+input.value.slice(end);input.focus();input.setSelectionRange(start+button.dataset.emoji.length,start+button.dataset.emoji.length);updateComposer();break;}
    case 'attach':showMenu(button,[{label:'Photos & videos',icon:'image',action:'attach-image'},{label:'Document',icon:'document',action:'attach-document'},{label:'Contact',icon:'addContact',action:'share-contact'}],true);break;
    case 'attach-image':chooseAttachment('image');break;
    case 'attach-document':chooseAttachment('document');break;
    case 'document-contact':openChat(button.dataset.id);chooseAttachment('document');break;
    case 'share-contact':openModal('Share a contact',`<div class="contact-list">${data.chats.filter(c=>c.type==='person'&&c.id!=='meta').map(c=>`<button class="chat-row" data-action="send-contact" data-id="${c.id}">${avatar(c)}<span class="chat-name">${escapeHTML(c.name)}</span></button>`).join('')}</div>`);break;
    case 'send-contact':{const c=getChat(button.dataset.id);closeModal();if(c&&state.selected)appendMessage(state.selected,{text:`👤 ${c.name}\n${c.about||'Sample contact'}`,outgoing:true});break;}
    case 'preview-photo':previewPhoto(button.dataset.message);break;
    case 'message-menu':showMessageMenu(button,getMessage(button.dataset.message));break;
    case 'message-info':messageInfo(button.dataset.message);break;
    case 'copy-message':copyMessage(button.dataset.message);break;
    case 'react-more':reactionPicker(button.dataset.message);break;
    case 'react-message':{const m=getMessage(button.dataset.message);if(m){m.reaction=m.reaction===button.dataset.emoji?null:button.dataset.emoji;save();closeModal();renderMessages(false);}break;}
    case 'forward-message':forwardMessagePicker(button.dataset.message);break;
    case 'forward-to':{const source=state.forwardMessage,m=source&&getMessage(source.messageId,source.chatId);if(m){const id=button.dataset.id;closeModal();appendMessage(id,{text:m.text||'',attachment:m.attachment?structuredClone(m.attachment):undefined,outgoing:true,forwarded:true});state.forwardMessage=null;toast(`Forwarded to ${getChat(id).name}`);}break;}
    case 'pin-message':{const m=getMessage(button.dataset.message);if(m){m.pinned=!m.pinned;save();renderMessages(false);toast(m.pinned?'Message pinned':'Message unpinned');}break;}
    case 'ask-about-message':{const m=getMessage(button.dataset.message);if(m){const text=messageText(m);openMeta();appendMessage('meta',{text:`Help me with this message:\n“${text}”`,outgoing:true});appendMessage('meta',{text:'This is a local assistant preview. You can reply to this message, react to it, or pin it to keep it easy to find.'});}break;}
    case 'delete-message':openModal('Delete message?','<p>Remove this message from your local conversation. You can undo the deletion.</p>',`<button class="secondary-button" data-action="close-modal">Cancel</button><button class="solid-button danger" data-action="confirm-delete-message" data-message="${escapeHTML(button.dataset.message)}">Delete for me</button>`);break;
    case 'confirm-delete-message':deleteMessage(button.dataset.message);break;
    case 'undo-delete':{const index=data.trash.findIndex(item=>item.id===button.dataset.id);if(index>=0){const item=data.trash.splice(index,1)[0],messages=data.messages[item.chatId]||=[];messages.splice(Math.min(item.index,messages.length),0,item.message);refreshChatPreview(item.chatId);save();if(state.selected===item.chatId)renderMessages(false);renderSidebar();toast('Message restored');}break;}
    case 'jump-message':jumpToMessage(button.dataset.message);break;
    case 'star-message':{const m=(data.messages[state.selected]||[]).find(m=>m.id===button.dataset.message);if(m){m.starred=!m.starred;save();renderMessages(false);toast(m.starred?'Message starred':'Message unstarred');}break;}
    case 'reply-message':{const m=getMessage(button.dataset.message),input=$('#message-input');if(m&&input){state.replyTo={id:m.id,text:messageText(m),sender:m.outgoing?'You':getChat().name};renderReplyPreview();input.focus();}break;}
    case 'cancel-reply':state.replyTo=null;renderReplyPreview();$('#message-input')?.focus();break;
    case 'voice':startRecording();break;
    case 'cancel-voice':stopRecording();renderConversation();break;
    case 'send-voice':{if(!state.recording)break;const {chatId,start}=state.recording;const seconds=Math.max(1,Math.floor((Date.now()-start)/1000));stopRecording();appendMessage(chatId,{text:`🎙 Voice message · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} (local demo)`,outgoing:true});renderConversation();break;}
    case 'voice-call':startCall(state.selected,'voice');break;
    case 'video-call':startCall(state.selected,'video');break;
    case 'call-contact':startCall(button.dataset.id,button.dataset.type||'voice');break;
    case 'call-mic':case 'call-camera':button.classList.toggle('toggled');button.setAttribute('aria-pressed',String(button.classList.contains('toggled')));break;
    case 'end-call':finishCall();closeModal();toast('Demo call ended');break;
    case 'new-status':if(data.prefs.myStatus){openModal('My status',`<div class="status-story"><div class="story-text">${escapeHTML(data.prefs.myStatus).replace(/\n/g,'<br>')}</div></div>`,`<button class="solid-button" data-action="edit-status">Edit status</button>`);}else{openModal('Add status','<p>Share a moment in this local demo.</p><label class="field">Status update<textarea id="status-value" rows="4" maxlength="700" placeholder="What’s on your mind?"></textarea></label><p id="modal-error" class="field-error"></p>',modalButtons('save-status','Add status'));}break;
    case 'edit-status':openModal('Edit status',`<label class="field">Status update<textarea id="status-value" rows="4" maxlength="700">${escapeHTML(data.prefs.myStatus)}</textarea></label><p id="modal-error" class="field-error"></p>`,modalButtons('save-status'));break;
    case 'save-status':{const value=$('#status-value').value.trim();if(!value){$('#modal-error').textContent='Enter a status update first.';break;}data.prefs.myStatus=value;save();closeModal();toast('Status saved locally');break;}
    case 'view-status':statusModal(button.dataset.id);break;
    case 'find-channels':navigate('channels');$('#sidebar-search')?.focus();break;
    case 'open-channel':state.channel=button.dataset.id;state.selected=null;state.view='channels';render();break;
    case 'follow-channel':data.prefs['follow-'+button.dataset.id]=!data.prefs['follow-'+button.dataset.id];save();renderSidebar();renderChannel();toast(data.prefs['follow-'+button.dataset.id]?'Channel followed locally':'Channel unfollowed');break;
    case 'media-chat':openChat(button.dataset.id);break;
    case 'encryption':openModal('End-to-end encryption','<div class="feature-icon">'+icon('lock')+'</div><p>The original WhatsApp uses end-to-end encryption for personal messages and calls. This recreation is a standalone UI demo. Its sample messages are stored in your browser and are never sent to WhatsApp.</p>','<button class="solid-button" data-action="close-modal">Got it</button>');break;
    case 'help':openModal('About this demo','<p>A local recreation of the WhatsApp Web interface, built from your Chrome reference.</p><p style="margin-top:14px">Search private chats, send sample messages, share local files, react, reply, forward, pin, and star messages. Messages and preferences are saved in this browser.</p><p style="margin-top:14px">Calls, voice messages, and the assistant are UI demonstrations. This app does not connect to WhatsApp.</p>','<button class="solid-button" data-action="close-modal">Got it</button>');break;
    case 'close-modal':closeModal();break;
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='message-input')updateComposer();
  else if(event.target.id==='sidebar-search'){
    rememberSidebarScroll();
    state.query=event.target.value;
    if(state.view==='chats'&&!state.panel){renderChatList();const key=sidebarScrollKey();$('#sidebar').dataset.scrollKey=key;$('#sidebar .sidebar-scroll').scrollTop=state.sidebarScroll[key]||0;const clear=$('.search-wrap .search-clear');if(state.query&&!clear)event.target.insertAdjacentHTML('afterend',iconButton('close','Clear search','clear-search','search-clear'));else if(!state.query&&clear)clear.remove();}
    else{renderSidebar();const el=$('#sidebar-search');el?.focus();}
  }else if(event.target.id==='conversation-query'){state.searchText=event.target.value;highlightMessages();}
});
document.addEventListener('change',event=>{
  if(event.target.id==='attachment-input')handleAttachment(event.target.files[0]);
});
document.addEventListener('submit',event=>{if(event.target.id==='composer'){event.preventDefault();sendMessage();}});
document.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&event.target.id==='message-input'&&!event.shiftKey&&!event.isComposing){event.preventDefault();sendMessage();}
  if(event.key==='Escape'){
    if($('#modal-root').firstChild){closeModal();return;}
    if(!$('#popover').hidden){hideMenu(true);return;}
    if(state.detail){state.detail=false;$('#contact-detail')?.remove();return;}
    if(state.emoji){state.emoji=false;$('#emoji-panel')?.remove();return;}
    if(state.chatSearch){state.chatSearch=false;state.searchText='';renderConversation();}
  }
  if((event.ctrlKey||event.metaKey)&&event.key==='k'){event.preventDefault();$('#sidebar-search')?.focus();}
  if((event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))&&event.target.closest('.message')){event.preventDefault();const bubble=event.target.closest('.message');showMessageMenu(bubble.querySelector('.message-action'),getMessage(bubble.dataset.messageId));}
  if(!$('#popover').hidden&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    const items=Array.from($('#popover').querySelectorAll('[role="menuitem"]'));if(items.length){event.preventDefault();const index=items.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length;items[next].focus();}
  }
  if(event.key==='Tab'&&$('#modal-root').firstChild){
    const focusable=Array.from($('#modal-root').querySelectorAll('button,input,textarea,select,a[href]')).filter(el=>!el.disabled&&el.offsetParent!==null);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
document.addEventListener('contextmenu',event=>{const bubble=event.target.closest('.message[data-message-id]');if(bubble){event.preventDefault();showMessageMenu(bubble.querySelector('.message-action'),getMessage(bubble.dataset.messageId));}});
document.addEventListener('scroll',event=>{if(event.target.id==='messages')hideMenu();else if(event.target.classList?.contains('sidebar-scroll')&&event.target.closest('#sidebar'))rememberSidebarScroll();},true);
window.addEventListener('resize',()=>hideMenu());
render();
save();
