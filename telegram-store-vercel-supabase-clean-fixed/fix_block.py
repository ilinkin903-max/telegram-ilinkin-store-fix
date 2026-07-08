from pathlib import Path
p=Path('/mnt/data/v34/lib/botHandlers.js')
s=p.read_text()
start=s.index('function escapeMarkdownText')
end=s.index('\n\nasync function sendProductUpdated', start)
block=r'''function escapeMarkdownText(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[');
}

function formatProductInfoText(value, maxLength = 900) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text === '-') return '-';
  const clean = text.length > maxLength ? text.slice(0, maxLength).trim() + '\n...' : text;
  return escapeMarkdownText(clean);
}'''
s=s[:start]+block+s[end:]
p.write_text(s)
