import{a as e}from"./rolldown-runtime-BYbx6iT9.js";import{d as t,t as n}from"./react-vendor-DHJkoFBs.js";import{r}from"./index-CpRR1eqq.js";import{n as i,t as a}from"./printDocument-DvZ2-TiO.js";import{t as o}from"./useSettings-DKxI-Wyl.js";var s=e(t(),1),c=n(),l={Cash:`Cash`,MoMo:`Mobile Money`,Cheque:`Cheque`,"Bank Transfer":`Bank Transfer`},u={Cash:`ri-money-dollar-circle-line`,MoMo:`ri-smartphone-line`,Cheque:`ri-file-text-line`,"Bank Transfer":`ri-bank-line`};function d({items:e,subtotal:t,tax:n,discountAmt:d,grandTotal:f,discount:p,receiptNo:m,paymentMethod:h,customerName:g,onClose:_,onNewSale:v,newSaleLabel:y=`New Sale`}){let{settings:b}=o(),{activeBusiness:x}=r(),S=(0,s.useRef)(null),C=new Date,w=C.toLocaleDateString(`en-US`,{year:`numeric`,month:`long`,day:`numeric`}),T=C.toLocaleTimeString(`en-US`,{hour:`2-digit`,minute:`2-digit`}),E=b.storeLogo||x?.logoUrl||``,D=b.storeName||x?.businessName||`Store`,O=b.storeAddress||x?.address||``,k=b.storePhone||x?.phone||``;return{minimal:{header:`bg-white`,accent:`text-slate-800`,divider:`border-dashed border-slate-300`},classic:{header:`bg-slate-800 text-white`,accent:`text-slate-900`,divider:`border-dashed border-slate-400`},modern:{header:`bg-indigo-600 text-white`,accent:`text-indigo-700`,divider:`border-dashed border-indigo-200`}}[b.receiptTheme],(0,c.jsx)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm`,children:(0,c.jsxs)(`div`,{className:`bg-white rounded-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh] overflow-hidden`,children:[(0,c.jsxs)(`div`,{className:`flex items-center justify-between px-6 py-4 border-b border-slate-100`,children:[(0,c.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,c.jsx)(`div`,{className:`w-10 h-10 flex items-center justify-center bg-emerald-100 rounded-xl`,children:(0,c.jsx)(`i`,{className:`ri-checkbox-circle-fill text-emerald-600 text-xl`})}),(0,c.jsxs)(`div`,{children:[(0,c.jsx)(`h2`,{className:`text-slate-800 font-bold text-base`,children:`Sale Complete!`}),(0,c.jsxs)(`p`,{className:`text-slate-400 text-xs`,children:[`Receipt #`,m]})]})]}),(0,c.jsx)(`button`,{onClick:_,className:`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer`,children:(0,c.jsx)(`i`,{className:`ri-close-line text-lg`})})]}),(0,c.jsx)(`div`,{className:`flex-1 overflow-y-auto px-6 py-4`,children:(0,c.jsxs)(`div`,{ref:S,className:`bg-white border border-slate-200 rounded-xl overflow-hidden font-mono text-sm`,style:{fontFamily:`'Courier New', monospace`},children:[(0,c.jsxs)(`div`,{className:`px-5 py-4 text-center ${b.receiptTheme===`minimal`?`bg-slate-50`:b.receiptTheme===`classic`?`bg-slate-800 text-white`:`bg-indigo-600 text-white`}`,children:[(E||b.receiptShowLogo)&&(0,c.jsx)(`div`,{className:`flex justify-center mb-2`,children:E?(0,c.jsx)(`div`,{className:`w-12 h-12 rounded-lg bg-white border border-white/20 overflow-hidden flex items-center justify-center`,children:(0,c.jsx)(`img`,{src:E,alt:`${D} logo`,className:`w-full h-full object-contain p-1.5`})}):(0,c.jsx)(`div`,{className:`w-10 h-10 rounded-lg flex items-center justify-center ${b.receiptTheme===`minimal`?`bg-indigo-600`:`bg-white/20`}`,children:(0,c.jsx)(`i`,{className:`ri-store-2-line text-xl ${b.receiptTheme,`text-white`}`})})}),(0,c.jsx)(`p`,{className:`font-bold text-base ${b.receiptTheme===`minimal`?`text-slate-800`:`text-white`}`,children:D}),(0,c.jsx)(`p`,{className:`text-xs mt-0.5 ${b.receiptTheme===`minimal`?`text-slate-500`:`text-white/80`}`,children:O}),k&&(0,c.jsx)(`p`,{className:`text-xs ${b.receiptTheme===`minimal`?`text-slate-500`:`text-white/80`}`,children:k})]}),(0,c.jsxs)(`div`,{className:`px-5 py-3 border-t border-dashed border-slate-200 bg-white`,children:[(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500 mb-1`,children:[(0,c.jsx)(`span`,{children:`Receipt No.`}),(0,c.jsx)(`span`,{className:`font-bold text-slate-700`,children:m})]}),g&&(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500 mb-1`,children:[(0,c.jsx)(`span`,{children:`Customer`}),(0,c.jsx)(`span`,{className:`text-slate-700 font-medium`,children:g})]}),(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500 mb-1`,children:[(0,c.jsx)(`span`,{children:`Date`}),(0,c.jsx)(`span`,{className:`text-slate-700`,children:w})]}),(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500 mb-1`,children:[(0,c.jsx)(`span`,{children:`Time`}),(0,c.jsx)(`span`,{className:`text-slate-700`,children:T})]}),(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500`,children:[(0,c.jsx)(`span`,{children:`Payment`}),(0,c.jsxs)(`span`,{className:`flex items-center gap-1 text-slate-700`,children:[(0,c.jsx)(`i`,{className:`${u[h]} text-xs`}),l[h]]})]})]}),(0,c.jsxs)(`div`,{className:`px-5 py-3 border-t border-dashed border-slate-200 bg-white`,children:[(0,c.jsxs)(`div`,{className:`flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2`,children:[(0,c.jsx)(`span`,{className:`flex-1`,children:`Item`}),(0,c.jsx)(`span`,{className:`w-10 text-center`,children:`Qty`}),(0,c.jsx)(`span`,{className:`w-20 text-right`,children:`Amount`})]}),(0,c.jsx)(`div`,{className:`space-y-2`,children:e.map(e=>(0,c.jsxs)(`div`,{className:`flex justify-between text-xs`,children:[(0,c.jsxs)(`div`,{className:`flex-1 min-w-0 pr-2`,children:[(0,c.jsx)(`p`,{className:`text-slate-800 font-semibold truncate`,children:e.name}),(0,c.jsxs)(`p`,{className:`text-slate-400`,children:[b.currencySymbol,e.price.toFixed(2),` each`]})]}),(0,c.jsxs)(`span`,{className:`w-10 text-center text-slate-600 font-mono`,children:[`x`,e.qty]}),(0,c.jsxs)(`span`,{className:`w-20 text-right text-slate-800 font-bold font-mono`,children:[b.currencySymbol,(e.price*e.qty).toFixed(2)]})]},e.id))})]}),(0,c.jsx)(`div`,{className:`px-5 py-3 border-t border-dashed border-slate-200 bg-slate-50`,children:(0,c.jsxs)(`div`,{className:`space-y-1.5`,children:[(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500`,children:[(0,c.jsx)(`span`,{children:`Subtotal`}),(0,c.jsxs)(`span`,{className:`font-mono text-slate-700`,children:[b.currencySymbol,t.toFixed(2)]})]}),b.receiptShowTax&&b.taxEnabled&&(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-slate-500`,children:[(0,c.jsxs)(`span`,{children:[b.taxLabel,` (`,b.taxRate,`%)`]}),(0,c.jsxs)(`span`,{className:`font-mono text-slate-700`,children:[b.currencySymbol,n.toFixed(2)]})]}),p>0&&(0,c.jsxs)(`div`,{className:`flex justify-between text-xs text-emerald-600`,children:[(0,c.jsxs)(`span`,{children:[`Discount (`,p,`%)`]}),(0,c.jsxs)(`span`,{className:`font-mono`,children:[`-`,b.currencySymbol,d.toFixed(2)]})]}),(0,c.jsxs)(`div`,{className:`flex justify-between pt-2 border-t border-slate-300`,children:[(0,c.jsx)(`span`,{className:`text-slate-800 font-bold text-sm`,children:`TOTAL`}),(0,c.jsxs)(`span`,{className:`font-bold text-base font-mono ${b.receiptTheme===`modern`?`text-indigo-600`:`text-slate-900`}`,children:[b.currencySymbol,f.toFixed(2)]})]})]})}),b.receiptShowBarcode&&(0,c.jsxs)(`div`,{className:`px-5 py-3 border-t border-dashed border-slate-200 bg-white text-center`,children:[(0,c.jsxs)(`div`,{className:`flex justify-center gap-px mb-1`,children:[m.split(``).map((e,t)=>(0,c.jsx)(`div`,{className:`bg-slate-800`,style:{width:e===`-`?`4px`:`${t%3==0?3:t%2==0?2:1}px`,height:`32px`}},t)),Array.from({length:20}).map((e,t)=>(0,c.jsx)(`div`,{className:t%3==0?`bg-slate-800`:t%2==0?`bg-slate-400`:`bg-transparent`,style:{width:`${t%3==0?3:2}px`,height:`32px`}},`b${t}`))]}),(0,c.jsx)(`p`,{className:`text-xs text-slate-400 tracking-widest`,children:m})]}),b.receiptFooter&&(0,c.jsx)(`div`,{className:`px-5 py-3 border-t border-dashed border-slate-200 bg-white text-center`,children:(0,c.jsx)(`p`,{className:`text-xs text-slate-400 leading-relaxed`,children:b.receiptFooter})})]})}),(0,c.jsxs)(`div`,{className:`px-6 py-4 border-t border-slate-100 flex gap-3`,children:[(0,c.jsxs)(`button`,{onClick:()=>{let r=b.receiptTheme===`classic`?`#1e293b`:b.receiptTheme===`minimal`?`#f1f5f9`:`#4f46e5`,o=b.receiptTheme===`minimal`?`#1e293b`:`#ffffff`,s=b.receiptTheme===`minimal`?`#64748b`:`rgba(255,255,255,0.82)`,c=b.receiptTheme===`modern`?`#4f46e5`:`#1e293b`,u=e.map(e=>`
      <div style="display:flex;align-items:flex-start;margin-bottom:8px;font-size:11px;">
        <div style="flex:1;padding-right:6px;">
          <div style="font-weight:700;color:#1e293b;">${a(e.name)}</div>
          <div style="color:#94a3b8;font-size:10px;margin-top:1px;">${b.currencySymbol}${e.price.toFixed(2)} each</div>
        </div>
        <div style="width:36px;text-align:center;color:#475569;">x${e.qty}</div>
        <div style="width:76px;text-align:right;font-weight:700;color:#1e293b;">${b.currencySymbol}${(e.price*e.qty).toFixed(2)}</div>
      </div>`).join(``),_=b.receiptShowTax&&b.taxEnabled?`<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;">
           <span>${a(b.taxLabel)} (${b.taxRate}%)</span>
           <span>${b.currencySymbol}${n.toFixed(2)}</span>
         </div>`:``,v=p>0?`<div style="display:flex;justify-content:space-between;font-size:11px;color:#059669;margin-bottom:5px;">
           <span>Discount (${p}%)</span>
           <span>-${b.currencySymbol}${d.toFixed(2)}</span>
         </div>`:``,y=b.receiptShowBarcode?(()=>{let e=m.replace(/\D/g,``).split(``).map(Number),t=[2,1,3,1,2,2,1,3,2,1,2,3,1,2,1,3,2,1,2,2,1,3,1,2,3,1,2,1,3,2].map((t,n)=>t+e[n%e.length]%2),n=0,r=t.map((e,t)=>{let r=t%2==0?`<rect x="${n}" y="0" width="${e*2}" height="40" fill="#1e293b"/>`:``;return n+=e*2+2,r}).join(``);return`<div style="border-top:1px dashed #e2e8f0;padding:10px 14px;text-align:center;">
                ${`<svg width="${n}" height="40" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">${r}</svg>`}
                <div style="font-size:10px;color:#94a3b8;letter-spacing:3px;margin-top:5px;">${m}</div>
              </div>`})():``,x=b.receiptFooter?`<div style="border-top:1px dashed #e2e8f0;padding:8px 14px 14px;text-align:center;">
           <p style="font-size:10px;color:#94a3b8;line-height:1.6;font-style:italic;">${a(b.receiptFooter)}</p>
         </div>`:``;i(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${m}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 80mm; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 10pt; background: #fff; color: #1e293b; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background:${r};color:${o};text-align:center;padding:18px 14px 14px;">
    ${E?`<img src="${a(E)}" alt="${a(D)} logo" style="width:44px;height:44px;object-fit:contain;background:#fff;border-radius:9px;display:block;margin:0 auto 8px;padding:4px;"/>`:b.receiptShowLogo?`<div style="width:38px;height:38px;background:rgba(255,255,255,0.2);border-radius:9px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:10px;font-weight:800;color:#fff;">LOGO</div>`:``}
    <div style="font-size:15px;font-weight:800;margin-bottom:3px;">${a(D)}</div>
    <div style="font-size:10px;color:${s};line-height:1.6;">${a(O)}</div>
    ${k?`<div style="font-size:10px;color:${s};">${a(k)}</div>`:``}
  </div>

  <!-- Meta -->
  <div style="padding:10px 14px;border-top:1px dashed #e2e8f0;">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px;">
      <span style="color:#64748b;">Receipt No.</span>
      <span style="font-weight:700;color:#1e293b;">${a(m)}</span>
    </div>
    ${g?`<div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px;">
      <span style="color:#64748b;">Customer</span>
      <span style="color:#1e293b;font-weight:500;">${a(g)}</span>
    </div>`:``}
    <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px;">
      <span style="color:#64748b;">Date</span>
      <span style="color:#1e293b;">${w}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px;">
      <span style="color:#64748b;">Time</span>
      <span style="color:#1e293b;">${T}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;">
      <span style="color:#64748b;">Payment</span>
      <span style="color:#1e293b;font-weight:500;">${a(l[h])}</span>
    </div>
  </div>

  <!-- Items -->
  <div style="padding:10px 14px;border-top:1px dashed #e2e8f0;">
    <div style="display:flex;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;">
      <div style="flex:1;">Item</div>
      <div style="width:36px;text-align:center;">Qty</div>
      <div style="width:76px;text-align:right;">Amount</div>
    </div>
    ${u}
  </div>

  <!-- Totals -->
  <div style="background:#f8fafc;padding:10px 14px;border-top:1px dashed #e2e8f0;">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;">
      <span>Subtotal</span>
      <span>${b.currencySymbol}${t.toFixed(2)}</span>
    </div>
    ${_}
    ${v}
    <div style="display:flex;justify-content:space-between;padding-top:7px;border-top:1px solid #cbd5e1;margin-top:3px;">
      <span style="font-weight:800;font-size:13px;color:#1e293b;">TOTAL</span>
      <span style="font-weight:800;font-size:15px;color:${c};">${b.currencySymbol}${f.toFixed(2)}</span>
    </div>
  </div>

  ${y}
  ${x}

</body>
</html>`,{title:`Receipt ${m}`,windowFeatures:`width=420,height=800`,autoClose:!1})},className:`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap`,children:[(0,c.jsx)(`span`,{className:`w-5 h-5 flex items-center justify-center`,children:(0,c.jsx)(`i`,{className:`ri-printer-line text-base`})}),`Print Receipt`]}),(0,c.jsxs)(`button`,{onClick:v,className:`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap`,children:[(0,c.jsx)(`span`,{className:`w-5 h-5 flex items-center justify-center`,children:(0,c.jsx)(`i`,{className:`ri-add-line text-base`})}),y]})]})]})})}export{d as t};