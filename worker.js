import { DurableObject } from "cloudflare:workers";

const PAGE = String.raw`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#111827">
<title>קיר החתימות של כולם</title>
<style>
:root{color-scheme:dark;--bg:#0b1020;--panel:#151d31;--line:#2a3650;--text:#f5f7ff;--muted:#aab5cc;--accent:#79e2b4}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#1b2b46,var(--bg) 65%);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;min-height:100vh}
header{text-align:center;padding:26px 16px 14px}h1{margin:0 0 8px;font-size:clamp(25px,5vw,40px)}header p{margin:0;color:var(--muted)}
main{width:min(1100px,100%);padding:14px;margin:auto;display:grid;gap:16px}.panel{background:#151d31eF;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 12px 40px #0003}
h2{font-size:19px;margin:0 0 12px}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
input,button{font:inherit;border-radius:10px;border:1px solid var(--line);padding:10px 13px}input{background:#0d1425;color:var(--text);min-width:0;flex:1}button{background:#24334d;color:var(--text);cursor:pointer;touch-action:manipulation}button.primary{background:var(--accent);color:#082318;border-color:transparent;font-weight:800}button:disabled{opacity:.5;cursor:not-allowed}
#pad{display:block;width:100%;height:240px;background:#fff;border-radius:12px;touch-action:none;cursor:crosshair;border:1px solid #d8deeb}
.tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}.tools label{display:flex;gap:7px;align-items:center;color:var(--muted)}.tools input[type=color]{width:44px;height:38px;padding:2px;flex:none}.tools input[type=range]{width:110px;flex:none}
#status{color:var(--muted);font-size:14px;min-height:20px;margin-top:10px}.topline{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
#wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:12px}.signature{background:#f8fafc;border-radius:12px;padding:10px;color:#111827;overflow:hidden}.signature img{display:block;width:100%;height:110px;object-fit:contain;background:#fff;border-radius:7px}.sigmeta{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px;font-size:13px}.sigmeta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.empty{color:var(--muted);text-align:center;padding:28px 8px;grid-column:1/-1}
footer{text-align:center;color:var(--muted);font-size:12px;padding:8px 16px 25px}
@media(max-width:520px){header{padding-top:20px}main{padding:10px}.panel{padding:12px}#pad{height:200px}.row button{flex:1}}
</style>
</head>
<body>
<header><h1>✍️ קיר החתימות של כולם</h1><p>חותמים כאן — והחתימה מופיעה אצל כל המבקרים באתר.</p></header>
<main>
<section class="panel">
<h2>החתימה שלך</h2>
<div class="row"><input id="name" maxlength="32" placeholder="השם שיופיע ליד החתימה" autocomplete="nickname"><button id="clear">נקה ציור</button></div>
<div style="height:10px"></div><canvas id="pad" aria-label="משטח ציור לחתימה"></canvas>
<div class="tools"><label>צבע <input id="color" type="color" value="#14213d"></label><label>עובי <input id="width" type="range" min="1" max="9" value="3"></label><button id="undo">בטל קו</button><button class="primary" id="publish">פרסם חתימה</button></div>
<div id="status" role="status">אפשר לצייר עם העכבר או עם האצבע.</div>
</section>
<section class="panel"><div class="topline"><h2>החתימות שפורסמו</h2><span id="count">0 חתימות</span></div><div id="wall"><div class="empty">טוען חתימות…</div></div></section>
</main><footer>אל תכתבו מידע פרטי בחתימה. כל חתימה שתפורסם גלויה לכל המבקרים.</footer>
<script>
(() => {
const $=id=>document.getElementById(id), canvas=$("pad"), ctx=canvas.getContext("2d");
let strokes=[], active=null, lastSignatureIds="", busy=false;
function resizeCanvas(preserve=true){
 const old=document.createElement("canvas");old.width=canvas.width;old.height=canvas.height;if(preserve)old.getContext("2d").drawImage(canvas,0,0);
 const rect=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#fff";ctx.fillRect(0,0,rect.width,rect.height);
 if(preserve&&old.width&&old.height)ctx.drawImage(old,0,0,old.width,old.height,0,0,rect.width,rect.height);
}
function redraw(){const r=canvas.getBoundingClientRect();ctx.fillStyle="#fff";ctx.fillRect(0,0,r.width,r.height);for(const s of strokes){ctx.strokeStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();s.points.forEach((p,i)=>i?ctx.lineTo(p.x*r.width,p.y*r.height):ctx.moveTo(p.x*r.width,p.y*r.height));if(s.points.length===1){ctx.lineTo(s.points[0].x*r.width+.1,s.points[0].y*r.height+.1)}ctx.stroke();}}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
canvas.addEventListener("pointerdown",e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);active={color:$("color").value,width:Number($("width").value),points:[point(e)]};strokes.push(active);redraw()});
canvas.addEventListener("pointermove",e=>{if(!active)return;e.preventDefault();active.points.push(point(e));redraw()});
function end(){active=null}canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
$("clear").onclick=()=>{strokes=[];redraw();$("status").textContent="הציור נוקה."};
$("undo").onclick=()=>{strokes.pop();redraw()};
window.addEventListener("resize",()=>{resizeCanvas(false);redraw()});resizeCanvas(false);
function imageData(){return canvas.toDataURL("image/png")}
async function api(path,options){const r=await fetch(path,{...options,headers:{"content-type":"application/json",...(options&&options.headers||{})}});const data=await r.json().catch(()=>({error:"תשובה לא תקינה מהשרת"}));if(!r.ok)throw new Error(data.error||("שגיאת שרת "+r.status));return data}
$("publish").onclick=async()=>{if(busy)return;if(!strokes.some(s=>s.points.length)){ $("status").textContent="קודם צריך לצייר חתימה.";return}busy=true;$("publish").disabled=true;$("status").textContent="מפרסם…";try{await api("/api/signatures",{method:"POST",body:JSON.stringify({name:$("name").value.trim()||"אורח",image:imageData()})});strokes=[];redraw();$("status").textContent="החתימה פורסמה לכולם!";await load()}catch(e){$("status").textContent="לא הצלחנו לפרסם: "+e.message}finally{busy=false;$("publish").disabled=false}};
async function load(){try{const data=await api("/api/signatures");const sigs=data.signatures||[];const ids=sigs.map(s=>s.id).join(",");if(ids!==lastSignatureIds){lastSignatureIds=ids;const wall=$("wall");wall.replaceChildren();$("count").textContent=sigs.length+" חתימות";if(!sigs.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="עדיין אין חתימות. אפשר להיות הראשון!";wall.append(empty)}for(const s of sigs){const card=document.createElement("article");card.className="signature";const img=document.createElement("img");img.src=s.image;img.alt="חתימה של "+s.name;const meta=document.createElement("div");meta.className="sigmeta";const name=document.createElement("span");name.textContent=s.name;const date=document.createElement("small");date.textContent=new Date(s.createdAt).toLocaleDateString("he-IL");meta.append(name,date);card.append(img,meta);wall.append(card)}}}catch(e){$("status").textContent="אין חיבור לשרת כרגע: "+e.message}}
load();setInterval(load,3000);
})();
</script></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/signatures") {
      const id = env.SIGNATURES.idFromName("public-signature-wall");
      return env.SIGNATURES.get(id).fetch(request);
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    return new Response("Not found", { status: 404 });
  }
};

export class SignatureRoom extends DurableObject {
  async fetch(request) {
    const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" } });
    if (url.pathname !== "/api/signatures" && url.pathname !== "/") return Response.json({ error: "Not found" }, { status: 404, headers });
    if (request.method === "GET") {
      const entries = await this.ctx.storage.list({ prefix: "sig:", reverse: true, limit: 300 });
      const signatures = [...entries.values()].sort((a,b) => b.createdAt - a.createdAt);
      return Response.json({ signatures }, { headers });
    }
    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return Response.json({ error: "JSON לא תקין" }, { status: 400, headers }); }
      const name = typeof body.name === "string" ? body.name.trim().slice(0,32) : "";
      const image = typeof body.image === "string" ? body.image : "";
      if (!name) return Response.json({ error: "צריך להוסיף שם" }, { status: 400, headers });
      if (!image.startsWith("data:image/png;base64,") || image.length > 250000) return Response.json({ error: "החתימה ריקה או גדולה מדי" }, { status: 400, headers });
      const now = Date.now();
      const id = crypto.randomUUID();
      const signatures = await this.ctx.storage.list({ prefix: "sig:" });
      if (signatures.size >= 300) {
        const oldest = [...signatures.entries()].sort((a,b) => a[1].createdAt - b[1].createdAt)[0];
        if (oldest) await this.ctx.storage.delete(oldest[0]);
      }
      await this.ctx.storage.put("sig:" + id, { id, name, image, createdAt: now });
      return Response.json({ ok: true, id }, { status: 201, headers });
    }
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }
}
