import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, html, out] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1080,height:1080}});
await p.goto('file://'+html); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
const data = await p.evaluate(() => {
  const items=[]; let idx=0;
  const zOf=e=>{ for(let n=e;n&&n!==document.body;n=n.parentElement){const z=getComputedStyle(n).zIndex; if(z!=='auto') return +z;} return 0; };
  const opOf=e=>{ let o=1; for(let n=e;n&&n!==document.documentElement;n=n.parentElement) o*=+getComputedStyle(n).opacity; return o; };
  // ascent ratio
  const t=document.createElement('div'); t.style.cssText='position:absolute;left:0;top:-500px;font-size:100px;line-height:normal;white-space:nowrap';
  t.innerHTML='あ<span style="display:inline-block;width:0;height:0"></span>'; document.body.appendChild(t);
  const r=document.createRange(); r.selectNodeContents(t.firstChild); const ct=r.getBoundingClientRect().top; const bl=t.lastChild.getBoundingClientRect().bottom;
  const asc=(bl-ct)/100; t.remove();
  const bs=getComputedStyle(document.body);
  const bodyBg=bs.backgroundImage!=='none'?bs.backgroundImage:bs.backgroundColor;
  const skip=new Set();
  const all=[...document.body.querySelectorAll('*')];
  for (const e of all) {
    if ([...skip].some(s=>s.contains(e)&&s!==e)) continue;
    const cs=getComputedStyle(e); if (cs.display==='none'||cs.visibility==='hidden') continue;
    const z=zOf(e), op=opOf(e), order=idx++;
    if (e.tagName.toLowerCase()==='svg') { skip.add(e); const rc=e.getBoundingClientRect(); items.push({k:'svg',z,order,x:rc.left,y:rc.top,w:rc.width,h:rc.height,html:e.innerHTML,op}); continue; }
    // untransformed box
    const tf=cs.transform; let angle=0;
    if (tf&&tf!=='none'){ const m=tf.match(/matrix\(([^)]+)\)/); if(m){const v=m[1].split(',').map(Number); angle=Math.atan2(v[1],v[0])*180/Math.PI;} e.style.transform='none'; }
    const rc=e.getBoundingClientRect(); if (tf&&tf!=='none') e.style.transform='';
    const box={x:rc.left,y:rc.top,w:rc.width,h:rc.height,angle};
    if (e.tagName==='IMG') { items.push({k:'img',z,order,...box,src:e.getAttribute('src'),shadow:cs.boxShadow,filter:cs.filter,outline:cs.outlineStyle!=='none'?{w:parseFloat(cs.outlineWidth),c:cs.outlineColor}:null,op}); continue; }
    const bg=cs.backgroundImage!=='none'?cs.backgroundImage:null, bgc=cs.backgroundColor;
    const hasBg=bg||(bgc&&bgc!=='rgba(0, 0, 0, 0)'); const bw=parseFloat(cs.borderTopWidth)||0;
    if (hasBg||bw>0) items.push({k:'box',z,order,...box,bg,bgc,bgSize:cs.backgroundSize,radius:cs.borderTopLeftRadius,radii:[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomRightRadius,cs.borderBottomLeftRadius],border:bw>0?{w:bw,c:cs.borderTopColor}:null,shadow:cs.boxShadow,op,cls:e.className});
    // text nodes
    for (const n of e.childNodes) { if (n.nodeType!==3||!n.textContent.trim()) continue;
      const txt=n.textContent; const lines=[]; let cur=null;
      for (let i=0;i<txt.length;i++){ if(/\s/.test(txt[i])&&!cur) continue; const rg=document.createRange(); rg.setStart(n,i); rg.setEnd(n,i+1); const rr=rg.getClientRects()[0]; if(!rr) continue;
        if(!cur||Math.abs(rr.top-cur.top)>3){ cur={top:rr.top,left:rr.left,text:''}; lines.push(cur);} cur.text+=txt[i]; cur.right=rr.right; }
      for (const l of lines) { const fs=parseFloat(cs.fontSize); items.push({k:'text',z,order,x:l.left,y:l.top+asc*fs,text:l.text.replace(/\s+$/,''),fs,fw:cs.fontWeight,color:cs.color,ls:cs.letterSpacing,op,angle,cx:box.x+box.w/2,cy:box.y+box.h/2}); }
    }
  }
  return {bodyBg,items,asc};
});
fs.writeFileSync(out, JSON.stringify(data)); await b.close();
