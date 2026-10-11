/** Package the supplied standalone UI without sharing its CSS or event handlers. */
export function whatsappDocument(template: string, css: string, script: string, assets: Record<string, string>): string {
  const resolveAssets = (source: string) => source.replace(/assets\/[\w.-]+/g, path => {
    const url = assets[path];
    if (!url) throw new Error(`Missing WhatsApp UI asset: ${path}`);
    return url;
  });
  // Keep WABuddy's demo messages separate from the original project's storage.
  const localScript = resolveAssets(script).replaceAll('whatsapp-ui-demo-v1', 'wabuddy-whatsapp-preview-v1');
  return resolveAssets(template)
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${resolveAssets(css)}</style>`)
    .replace('<script src="app.js" defer></script>', '')
    .replace('</body>', `<script>${localScript.replace(/<\/script/gi, '<\\/script')}</script></body>`);
}
