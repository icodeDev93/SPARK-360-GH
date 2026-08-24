export function escapePrintHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type PrintHtmlOptions = {
  title?: string;
  windowFeatures?: string;
  autoClose?: boolean;
};

const PRINT_SCRIPT = (autoClose: boolean) => `
<script>
  (function () {
    function waitForImages() {
      var images = Array.prototype.slice.call(document.images || []);
      if (!images.length) return Promise.resolve();
      return Promise.all(images.map(function (img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
    }

    function runPrint() {
      Promise.all([
        waitForImages(),
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
      ]).then(function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 180);
      });
    }

    window.addEventListener('load', runPrint);
    ${autoClose ? "window.addEventListener('afterprint', function () { setTimeout(function () { window.close(); }, 250); });" : ''}
  }());
<\/script>`;

export function printHtml(html: string, options: PrintHtmlOptions = {}): boolean {
  const win = window.open('', '_blank', options.windowFeatures ?? 'width=900,height=820');
  if (!win) {
    window.alert('Printing was blocked by the browser. Please allow popups for this app and try again.');
    return false;
  }

  const script = PRINT_SCRIPT(options.autoClose ?? false);
  const finalHtml = html.includes('</body>')
    ? html.replace('</body>', `${script}</body>`)
    : `${html}${script}`;

  win.document.open();
  win.document.write(finalHtml);
  win.document.close();
  if (options.title) win.document.title = options.title;
  return true;
}
