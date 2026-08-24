function e(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}var t=e=>`
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
    ${e?`window.addEventListener('afterprint', function () { setTimeout(function () { window.close(); }, 250); });`:``}
  }());
<\/script>`;function n(e,n={}){let r=window.open(``,`_blank`,n.windowFeatures??`width=900,height=820`);if(!r)return window.alert(`Printing was blocked by the browser. Please allow popups for this app and try again.`),!1;let i=t(n.autoClose??!1),a=e.includes(`</body>`)?e.replace(`</body>`,`${i}</body>`):`${e}${i}`;return r.document.open(),r.document.write(a),r.document.close(),n.title&&(r.document.title=n.title),!0}export{n,e as t};