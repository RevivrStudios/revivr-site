'use client';

export async function copyTextToClipboard(text) {
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Clipboard API failed, trying fallback copy.', error);
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '1px';
  textArea.style.height = '1px';
  textArea.style.padding = '0';
  textArea.style.border = '0';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';
  textArea.style.zIndex = '-1';

  document.body.appendChild(textArea);
  textArea.focus({ preventScroll: true });
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    console.warn('Legacy copy fallback failed.', error);
  }

  document.body.removeChild(textArea);
  return copied;
}

export function showManualCopyDialog(text) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '99999';
  overlay.style.background = 'rgba(0, 0, 0, 0.72)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '24px';

  const panel = document.createElement('div');
  panel.style.width = 'min(760px, 100%)';
  panel.style.maxHeight = '80vh';
  panel.style.background = '#111';
  panel.style.border = '1px solid rgba(255, 179, 71, 0.35)';
  panel.style.borderRadius = '12px';
  panel.style.padding = '16px';
  panel.style.boxShadow = '0 20px 80px rgba(0, 0, 0, 0.5)';

  const title = document.createElement('div');
  title.textContent = 'Browser blocked automatic copy. Press Command-C now.';
  title.style.color = '#ffb347';
  title.style.font = '600 14px system-ui, sans-serif';
  title.style.marginBottom = '10px';

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.width = '100%';
  textarea.style.height = '52vh';
  textarea.style.resize = 'vertical';
  textarea.style.boxSizing = 'border-box';
  textarea.style.background = '#050505';
  textarea.style.color = '#b8d4a0';
  textarea.style.border = '1px solid rgba(255, 255, 255, 0.12)';
  textarea.style.borderRadius = '8px';
  textarea.style.padding = '12px';
  textarea.style.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
  textarea.style.lineHeight = '1.5';

  const close = document.createElement('button');
  close.textContent = 'Done';
  close.style.marginTop = '12px';
  close.style.padding = '8px 14px';
  close.style.borderRadius = '8px';
  close.style.border = '1px solid rgba(255, 179, 71, 0.35)';
  close.style.background = 'rgba(255, 179, 71, 0.12)';
  close.style.color = '#ffb347';
  close.style.font = '600 13px system-ui, sans-serif';
  close.style.cursor = 'pointer';
  close.onclick = () => overlay.remove();

  panel.appendChild(title);
  panel.appendChild(textarea);
  panel.appendChild(close);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  textarea.focus();
  textarea.select();
}
