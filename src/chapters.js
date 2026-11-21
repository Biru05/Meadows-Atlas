(()=>{
const pages=['Overview','Product','Customers','Shipping','Performance','Commission Model','Order Details','Forecast','What If Forecast'];
const cache=new Map(),panel=$('#chapter'),nav=$('#chapters');let page='',sequence=0;
const orderSource='Sample - Superstore';
const sum=(field,alias=field)=>({fieldCaption:field,function:'SUM',fieldAlias:alias});
const dim=field=>({fieldCaption:field});
async function query(source,dimensions,measures){
 const key=JSON.stringify([source,dimensions,measures]);
 if(!cache.has(key)){
 const ds=window.atlasSources?.find(d=>d.name===source);
 if(!ds)throw Error('Waiting for '+source);
 const promise=ds.queryAsync({fields:[...dimensions.map(dim),...measures]}).then(r=>{if(!Array.isArray(r.data))throw Error('No query result');return r.data});
 cache.set(key,promise);promise.catch(()=>cache.delete(key))}
 return cache.get(key)
}
function picker(label,items){const l=el(panel,'label',label);const s=el(l,'select');items.forEach(i=>el(s,'option',i));return s}
function input(label,type,value){const l=el(panel,'label',label);const i=el(l,'input');i.type=type;i.value=value;return i}
function group(rows,key){return d3.nest().key(key).entries(rows)}
function table(host,heads,rows){const details=el(host,'details');el(details,'summary','View exact values · '+rows.length+' rows');const wrap=el(details,'div');wrap.className='scroll';const t=el(wrap,'table'),h=el(el(t,'thead'),'tr');heads.forEach(s=>el(h,'th',s));const body=el(t,'tbody');rows.forEach(row=>{const tr=el(body,'tr');row.forEach(v=>el(tr,'td',String(v??'—')))})}
function chart(host,items){if(!items.length)return;const max=d3.max(items,d=>Math.abs(d[1]))||1;items.slice(0,12).forEach(([name,value])=>{const l=el(host,'div',name+' · '+money(value));const track=el(l,'div');track.className='measure';const fill=d3.select(track).append('i').style('width','0%');fill.transition().duration(motion).style('width',100*Math.abs(value)/max+'%')})}
async function open(name){
 page=name;const seq=++sequence;for(const b of nav.children)b.setAttribute('aria-current',b.textContent===name?'page':'false');
 $('#overview').hidden=name!=='Overview';panel.hidden=name==='Overview';document.querySelector('header p').textContent=name==='Overview'?'A field guide to profitability':name;
 if(panel.hidden)return;
 panel.replaceChildren();el(panel,'h2',name);const loading=el(panel,'p','Opening this chapter…');
 try{
 if(!window.atlasSources)return;
 const isCom=name==='Commission Model',detail=name==='Order Details',shipping=name==='Shipping',product=name==='Product',customer=name==='Customers',perf=name==='Performance',what=name==='What If Forecast',forecast=name==='Forecast';
 const dims=isCom?['Region','Sales Person']:detail?['Region','Order ID','Product Name','Order Date']:shipping?['Region','Ship Mode','Order Date','Ship Date','Order ID']:product?['Region','Category','Sub-Category','Product Name','Segment','Order Date']:customer?['Region','Customer Name','Segment']:['Region','Segment','Category','Order Date'];
 const rows=await query(isCom?'Sales Commission':orderSource,dims,isCom?[sum('Sales')]:[sum('Sales'),sum('Profit'),sum('Quantity')]);
 const targets=perf?await query('Sales Target',['Category','Segment','Order Date'],[sum('Sales Target')]):[];
 if(seq!==sequence)return;loading.remove();
 const regionPick=picker('Region',['All regions',...new Set(rows.map(r=>r.Region).sort())]);
 const dimension=product?'Category':customer||forecast||what||perf?'Segment':shipping?'Ship Mode':null;
 const split=dimension?picker(dimension,['All',...new Set(rows.map(r=>r[dimension]).sort())]):null;
 const lookup=product||customer||detail?input('Search '+(product?'products':customer?'customers':'orders or products'),'search',''):null;
 const quota=isCom?input('Quota · USD','number',500000):null,rate=isCom?input('Commission rate · %','number',18.4):null;
 const growth=what?input('Volume change · %','number',5):null,discount=what?input('Price reduction · %','number',0):null;
 const result=el(panel,'section');function draw(){
 result.replaceChildren();const r=rows.filter(x=>(regionPick.value==='All regions'||x.Region===regionPick.value)&&(!split||split.value==='All'||x[dimension]===split.value)&&(!lookup||[x['Order ID'],x['Product Name'],x['Customer Name']].join(' ').toLowerCase().includes(lookup.value.toLowerCase())));
 if(!r.length){el(result,'p','No matching records.');return}
 const total=(v,k)=>d3.sum(v,x=>+x[k]);const month=x=>String(x['Order Date']).slice(0,7);
 const canvas=el(result,'div');
 atlasVisuals(canvas,{name,rows:r,targets:targets.filter(x=>!split||split.value==='All'||x.Segment===split.value),quota:Number(quota?.value),rate:Number(rate?.value),growth:Number(growth?.value),discount:Number(discount?.value),select:value=>{if(lookup){lookup.value=value;draw()}}});
 if(detail){table(result,['Order','Date','Product','Sales','Profit','Units'],r.map(x=>[x['Order ID'],month(x),x['Product Name'],money(x.Sales),money(x.Profit),x.Quantity]));return}
 if(shipping){table(result,['Shipping mode','Orders','Mean days to ship','Sales'],group(r,x=>x['Ship Mode']).map(g=>[g.key,new Set(g.values.map(x=>x['Order ID'])).size,d3.mean(g.values,x=>(new Date(x['Ship Date'])-new Date(x['Order Date']))/86400000).toFixed(1),money(total(g.values,'Sales'))]));return}
 if(isCom){table(result,['Salesperson','Sales','Quota attainment','Commission'],group(r,x=>x['Sales Person']).map(g=>{const n=total(g.values,'Sales');return [g.key,money(n),+quota.value>0?(100*n/quota.value).toFixed(1)+'%':'—',money(n*rate.value/100)]}));return}
 if(product||customer){const label=product?'Product Name':'Customer Name',groups=group(r,x=>x[label]).map(g=>[g.key,total(g.values,'Sales'),total(g.values,'Profit')]).sort((a,b)=>b[1]-a[1]);if(customer)chart(result,groups);table(result,[product?'Product':'Customer','Sales','Profit','Profit ratio'],groups.map(([n,s,p])=>[n,money(s),money(p),s?(100*p/s).toFixed(1)+'%':'—']));return}
 const series=group(r,month).sort((a,b)=>a.key.localeCompare(b.key)).map(g=>[g.key,total(g.values,'Sales')]);
 if(perf){const tgt=new Map(group(targets.filter(x=>split.value==='All'||x.Segment===split.value),month).map(g=>[g.key,total(g.values,'Sales Target')]));table(result,['Month','Sales','All-region target','Variance vs all-region target'],series.map(([m,v])=>[m,money(v),tgt.has(m)?money(tgt.get(m)):'—',tgt.has(m)?money(v-tgt.get(m)):'—']));return}
 if(what){table(result,['Month','Actual sales','Scenario sales','Change'],series.map(([m,v])=>{const n=v*(1+growth.value/100)*(1-discount.value/100);return [m,money(v),money(n),money(n-v)]}));return}
 if(forecast){el(result,'p','Seasonal baseline · next 12 months repeat the corresponding month from the prior year.');const last=new Date(series.at(-1)[0]+'-01T00:00:00Z'),map=new Map(series),future=[];for(let j=1;j<=12;j++){const date=new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth()+j,1)),m=date.toISOString().slice(0,7),prior=(date.getUTCFullYear()-1)+m.slice(4);if(map.has(prior))future.push([m,map.get(prior)])}table(result,['Observed month','Actual sales'],series.map(([m,v])=>[m,money(v)]))}
 }
 [regionPick,split,lookup,quota,rate,growth,discount].filter(Boolean).forEach(i=>i.oninput=draw);draw();
 }catch(e){if(seq===sequence){loading.textContent='Could not load '+name+': '+e.message;button(panel,'Retry',()=>open(name))}}}
 pages.forEach(name=>button(nav,name,()=>open(name)));open('Overview');window.addEventListener('atlas-ready',()=>open(page));
})();
