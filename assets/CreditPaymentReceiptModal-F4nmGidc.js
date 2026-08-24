import{t as e}from"./react-vendor-DHJkoFBs.js";import{r as t}from"./index-CpRR1eqq.js";import{n,t as r}from"./printDocument-DvZ2-TiO.js";import{t as i}from"./useSettings-DKxI-Wyl.js";var a=e(),o={Cash:`Cash`,MoMo:`Mobile Money`,Cheque:`Cheque`,"Bank Transfer":`Bank Transfer`};function s(e){try{return new Date(e).toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,year:`numeric`})}catch{return e}}function c({receipt:e,onClose:c}){let{settings:l}=i(),{activeBusiness:u}=t(),d=l.currencySymbol||`₵`,f=e=>`${d}${e.toLocaleString(`en-GH`,{minimumFractionDigits:2})}`,p=e.balanceLeft<=.005,m=l.storeLogo||u?.logoUrl||``,h=l.storeName||u?.businessName||`Store`,g=l.storeAddress||u?.address||``,_=l.storePhone||u?.phone||``;return(0,a.jsx)(`div`,{className:`fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4`,children:(0,a.jsxs)(`div`,{className:`bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl`,children:[(0,a.jsxs)(`div`,{className:`flex items-center justify-between px-6 py-4 border-b border-slate-100`,children:[(0,a.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,a.jsx)(`div`,{className:`w-10 h-10 flex items-center justify-center bg-indigo-100 rounded-xl`,children:(0,a.jsx)(`i`,{className:`ri-receipt-line text-indigo-600 text-xl`})}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`h2`,{className:`text-slate-800 font-bold text-base`,children:`Payment Receipt`}),(0,a.jsxs)(`p`,{className:`text-slate-400 text-xs`,children:[`Receipt #`,e.receiptNo]})]})]}),(0,a.jsx)(`button`,{onClick:c,className:`w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600`,children:(0,a.jsx)(`i`,{className:`ri-close-line text-lg`})})]}),(0,a.jsxs)(`div`,{className:`p-6`,children:[(0,a.jsxs)(`div`,{className:`border border-slate-200 rounded-xl overflow-hidden`,children:[(0,a.jsxs)(`div`,{className:`bg-indigo-600 text-white text-center px-5 py-4`,children:[m&&(0,a.jsx)(`div`,{className:`mb-2 flex justify-center`,children:(0,a.jsx)(`div`,{className:`w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center`,children:(0,a.jsx)(`img`,{src:m,alt:`${h} logo`,className:`w-full h-full object-contain p-1.5`})})}),(0,a.jsx)(`p`,{className:`font-bold text-base`,children:h}),(0,a.jsx)(`p`,{className:`text-xs text-white/80 mt-0.5`,children:`Credit Payment Receipt`})]}),(0,a.jsx)(`div`,{className:`px-5 py-4 space-y-2 border-b border-dashed border-slate-200`,children:[[`Receipt No.`,e.receiptNo],[`Invoice No.`,e.invoiceNo],[`Customer`,e.customerName],[`Payment Date`,s(e.paymentDate)],[`Payment Method`,o[e.paymentMethod]],[`Recorded By`,e.cashier]].map(([e,t])=>(0,a.jsxs)(`div`,{className:`flex justify-between gap-4 text-xs`,children:[(0,a.jsx)(`span`,{className:`text-slate-400`,children:e}),(0,a.jsx)(`span`,{className:`text-slate-700 font-bold text-right`,children:t})]},e))}),(0,a.jsxs)(`div`,{className:`px-5 py-4 bg-slate-50 space-y-2`,children:[(0,a.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500`,children:[(0,a.jsx)(`span`,{children:`Invoice Total`}),(0,a.jsx)(`span`,{className:`font-mono text-slate-700`,children:f(e.invoiceTotal)})]}),(0,a.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500`,children:[(0,a.jsx)(`span`,{children:`Previously Paid`}),(0,a.jsx)(`span`,{className:`font-mono text-slate-700`,children:f(e.previousPaid)})]}),(0,a.jsxs)(`div`,{className:`flex justify-between text-sm text-emerald-600 font-bold`,children:[(0,a.jsx)(`span`,{children:`Payment Received`}),(0,a.jsx)(`span`,{className:`font-mono`,children:f(e.amountPaid)})]}),(0,a.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500`,children:[(0,a.jsx)(`span`,{children:`Total Paid`}),(0,a.jsx)(`span`,{className:`font-mono text-slate-700`,children:f(e.totalPaid)})]}),(0,a.jsxs)(`div`,{className:`flex justify-between pt-2 border-t border-slate-300`,children:[(0,a.jsx)(`span`,{className:`text-slate-800 font-bold text-sm`,children:`Balance Left`}),(0,a.jsx)(`span`,{className:`font-mono font-extrabold text-base ${p?`text-emerald-600`:`text-rose-600`}`,children:f(e.balanceLeft)})]})]})]}),(0,a.jsx)(`div`,{className:`mt-4 rounded-xl px-4 py-3 text-center text-sm font-bold ${p?`bg-emerald-50 text-emerald-700`:`bg-amber-50 text-amber-700`}`,children:p?`Invoice settled in full`:`Partial payment recorded`})]}),(0,a.jsxs)(`div`,{className:`px-6 py-4 border-t border-slate-100 flex gap-3`,children:[(0,a.jsxs)(`button`,{onClick:()=>{let t=[[`Receipt No.`,e.receiptNo],[`Invoice No.`,e.invoiceNo],[`Customer`,e.customerName],[`Invoice Date`,s(e.invoiceDate)],[`Payment Date`,s(e.paymentDate)],[`Payment Method`,o[e.paymentMethod]],[`Recorded By`,e.cashier]],i=m?`<img src="${r(m)}" alt="${r(h)} logo" style="width:44px;height:44px;object-fit:contain;background:#fff;border-radius:9px;display:block;margin:0 auto 8px;padding:4px;"/>`:``;n(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt ${e.receiptNo}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 80mm; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 10pt; color: #1e293b; background: #fff; }
  </style>
</head>
<body>
  <div style="background:#4f46e5;color:#fff;text-align:center;padding:18px 14px 14px;">
    ${i}
    <div style="font-size:15px;font-weight:800;margin-bottom:3px;">${r(h)}</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.82);line-height:1.5;">${r(g)}</div>
    ${_?`<div style="font-size:10px;color:rgba(255,255,255,0.82);">${r(_)}</div>`:``}
    <div style="font-size:11px;font-weight:700;margin-top:10px;letter-spacing:0.08em;">CREDIT PAYMENT RECEIPT</div>
  </div>

  <div style="padding:12px 14px;border-top:1px dashed #cbd5e1;">
    ${t.map(([e,t])=>`
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;font-size:11px;">
        <span style="color:#64748b;">${e}</span>
        <span style="font-weight:700;color:#1e293b;text-align:right;">${r(t)}</span>
      </div>
    `).join(``)}
  </div>

  <div style="background:#f8fafc;padding:12px 14px;border-top:1px dashed #cbd5e1;">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:6px;">
      <span>Invoice Total</span><span>${f(e.invoiceTotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:6px;">
      <span>Previously Paid</span><span>${f(e.previousPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#059669;margin-bottom:6px;font-weight:800;">
      <span>Payment Received</span><span>${f(e.amountPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:7px;">
      <span>Total Paid</span><span>${f(e.totalPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #cbd5e1;">
      <span style="font-size:13px;font-weight:800;color:#1e293b;">BALANCE LEFT</span>
      <span style="font-size:15px;font-weight:900;color:${p?`#059669`:`#dc2626`};">${f(e.balanceLeft)}</span>
    </div>
  </div>

  <div style="padding:10px 14px;text-align:center;border-top:1px dashed #cbd5e1;">
    <div style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;background:${p?`#dcfce7`:`#fef3c7`};color:${p?`#15803d`:`#b45309`};">
      ${p?`INVOICE SETTLED`:`PARTIAL PAYMENT`}
    </div>
    ${l.receiptFooter?`<p style="font-size:10px;color:#94a3b8;line-height:1.5;margin-top:10px;">${r(l.receiptFooter)}</p>`:``}
  </div>

</body>
</html>`,{title:`Payment Receipt ${e.receiptNo}`,windowFeatures:`width=420,height=800`,autoClose:!1})},className:`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer`,children:[(0,a.jsx)(`i`,{className:`ri-printer-line text-base`}),`Print Receipt`]}),(0,a.jsx)(`button`,{onClick:c,className:`flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer`,children:`Done`})]})]})})}export{c as t};