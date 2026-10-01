import{m as e}from"./index-CarBoUWY.js";import{n as t}from"./printDocument-DvZ2-TiO.js";function n(e){return e==null?``:String(e).replace(/\u00c2\u00a2|\u00e2\u201a\u00b5|Ã¢â€šÂµ|â‚µ/g,`₵`).replace(/\u00e2\u20ac\u201d|â€”|â€“/g,`-`).replace(/\u00c3\u2014|Ã—/g,`x`).replace(/\u00c2\u00b7|Â·/g,`-`).replace(/\u00e2\u20ac\u00a6|â€¦/g,`...`).replace(/\u00e2\u20ac\u02dc|\u00e2\u20ac\u2122|â€˜|â€™/g,`'`).replace(/\u00e2\u20ac\u0153|\u00e2\u20ac\u009d|â€œ|â€�/g,`"`).replace(/[<>]/g,``).replace(/[ \t]+/g,` `).trim()}function r(e){return`₵${Number(e||0).toLocaleString(`en-GH`,{minimumFractionDigits:2,maximumFractionDigits:2})}`}function i(e){if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?n(e):t.toLocaleDateString(`en-GH`,{year:`numeric`,month:`short`,day:`numeric`})}function a(){if(typeof window>`u`)return{};let t=localStorage.getItem(e);if(!t)return{};for(let e=0;e<localStorage.length;e+=1){let r=localStorage.key(e);if(!(!r||!r.startsWith(`bizzyapp:businesses:`)))try{let e=JSON.parse(localStorage.getItem(r)||`[]`);if(!Array.isArray(e))continue;let i=e.find(e=>e?.id===t);if(i)return{businessName:n(i.businessName||i.business_name||``),legalName:n(i.legalName||i.legal_name||``),address:n(i.address||``),phone:n(i.phone||``),email:n(i.email||``),logoUrl:n(i.logoUrl||i.logo_url||``)}}catch{continue}}return{}}function o(e){return e.businessName||e.legalName||`Selected Business`}function s(e){return[e.address,e.phone,e.email].map(n).filter(Boolean).join(` | `)}function c(e,t){return e.logoUrl?`<img src="${d(e.logoUrl)}" alt="${d(o(e))} logo" style="width:100%;height:100%;object-fit:contain;display:block;" />`:d(t)}function l(e,t,n){if(!t&&!n||!e)return!0;let r=new Date(e);if(Number.isNaN(r.getTime()))return!0;if(r.setHours(0,0,0,0),t){let e=new Date(t);if(e.setHours(0,0,0,0),r<e)return!1}if(n){let e=new Date(n);if(e.setHours(23,59,59,999),r>e)return!1}return!0}function u(e){let t=n(e);return/[",\n\r]/.test(t)?`"${t.replace(/"/g,`""`)}"`:t}function d(e){return n(e).replace(/&/g,`&amp;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}function f({filename:e,columns:t,rows:n,totals:r}){let i=a(),s=[[`Business Name`,o(i)],...i.legalName&&i.legalName!==i.businessName?[[`Legal Name`,i.legalName]]:[],...i.address?[[`Address`,i.address]]:[],...i.phone?[[`Phone`,i.phone]]:[],...i.email?[[`Email`,i.email]]:[],...i.logoUrl?[[`Logo URL`,i.logoUrl]]:[],[`Generated At`,new Date().toLocaleString(`en-GH`)],[]],c=n.map((e,n)=>t.map(t=>u(t.value(e,n))).join(`,`)),l=r?.length?[``,...r.map(e=>`${u(e.label)},${u(e.value)}`)]:[],d=[...s.map(e=>e.map(u).join(`,`)),t.map(e=>u(e.header)).join(`,`),...c,...l].join(`
`),f=new Blob([`\uFEFF${d}`],{type:`text/csv;charset=utf-8;`}),p=URL.createObjectURL(f),m=document.createElement(`a`);m.href=p,m.download=`${e}.csv`,document.body.appendChild(m),m.click(),document.body.removeChild(m),URL.revokeObjectURL(p)}function p({title:e,filename:n,subtitle:r,columns:i,rows:l,totals:u}){let f=new Date().toLocaleString(`en-GH`),p=a(),m=s(p),h=o(p),g=c(p,h.charAt(0).toUpperCase()||`B`),_=l.map((e,t)=>`
    <tr>${i.map(n=>`<td>${d(n.value(e,t))}</td>`).join(``)}</tr>
  `).join(``),v=u?.length?`<div class="totals">${u.map(e=>`<div><span>${d(e.label)}</span><strong>${d(e.value)}</strong></div>`).join(``)}</div>`:``;t(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${d(e)}</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 landscape; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; background: #fff; }
          .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; margin-bottom: 18px; }
          .brand { display: flex; align-items: center; gap: 10px; }
          .mark { width: 40px; height: 40px; border-radius: 10px; background: #fff; border: 1px solid #dbe3f0; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 800; padding: 4px; }
          h1 { font-size: 21px; margin: 0 0 4px; }
          .subtitle { color: #64748b; font-size: 12px; }
          .meta { text-align: right; color: #64748b; font-size: 11px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
          th { background: #eef2ff; color: #3730a3; text-align: left; padding: 9px 8px; border: 1px solid #dbe3f0; text-transform: uppercase; font-size: 9px; letter-spacing: .04em; }
          td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; }
          tr:nth-child(even) td { background: #f8fafc; }
          .totals { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
          .totals div { border: 1px solid #dbe3f0; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 9px 12px; min-width: 170px; }
          .totals span { color: #64748b; display: block; font-size: 10px; text-transform: uppercase; }
          .totals strong { display: block; margin-top: 3px; font-size: 15px; }
          .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="mark">${g}</div>
            <div>
              <h1>${d(h)}</h1>
              <div class="subtitle">${m?d(m):`Business report`}</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>${d(e)}</strong></div>
            ${r?`<div>${d(r)}</div>`:``}
            <div>Generated: ${d(f)}</div>
            <div>Records: ${l.length}</div>
          </div>
        </div>
        <table>
          <thead><tr>${i.map(e=>`<th>${d(e.header)}</th>`).join(``)}</tr></thead>
          <tbody>${_||`<tr><td colspan="${i.length}">No records found</td></tr>`}</tbody>
        </table>
        ${v}
        <div class="footer">
          <span>Confidential - Internal Use Only</span>
          <span>${d(e)}</span>
        </div>
      </body>
    </html>`,{title:n,windowFeatures:`width=1100,height=820`})}function m(e,t){return!e&&!t?`All dates`:e&&t?`${i(e)} to ${i(t)}`:e?`From ${i(e)}`:`Until ${i(t)}`}export{r as a,p as i,m as n,i as o,f as r,l as s,n as t};