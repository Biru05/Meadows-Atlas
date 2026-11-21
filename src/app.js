'use strict';
const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function el(parent,tag,text){const e=document.createElement(tag);e.textContent=text||'';parent.append(e);return e}
function button(parent,text,action,active){const b=el(parent,'button',text);if(active!==undefined)b.setAttribute('aria-pressed',String(active));b.onclick=action;return b}
const q={"fields":[{"fieldCaption":"Region"},{"fieldCaption":"State/Province"},{"fieldCaption":"Order ID"},{"fieldCaption":"Customer Name"},{"fieldCaption":"Order Date"},{"fieldCaption":"Sales","function":"SUM","fieldAlias":"SalesSum"},{"fieldCaption":"Profit","function":"SUM","fieldAlias":"ProfitSum"},{"fieldCaption":"Quantity","function":"SUM","fieldAlias":"QuantitySum"},{"fieldCaption":"Discount","function":"SUM","fieldAlias":"DiscountSum"},{"fieldCaption":"Discount","function":"COUNT","fieldAlias":"Lines"}]};
const names=['Sales','Profit','Profit ratio','Profit per order','Sales per customer','Avg. discount','Quantity'];
const formats=[money,money,n=>n.toFixed(1)+'%',n=>'$'+n.toFixed(2),n=>'$'+n.toFixed(2),n=>n.toFixed(2)+'%',n=>n.toLocaleString('en-US')];
const goals=[null,null,null,60,null,null,null], selected=new Set();
let region='',order='',mode='Tiles',range=null,data=[],months=[],motion=matchMedia('(prefers-reduced-motion: reduce)').matches?0:520;
function stats(rows){const sales=d3.sum(rows,d=>d.SalesSum),profit=d3.sum(rows,d=>d.ProfitSum),orders=new Set(rows.map(d=>d['Order ID'])).size,customers=new Set(rows.map(d=>d['Customer Name'])).size;
return [sales,profit,sales?100*profit/sales:null,orders?profit/orders:null,customers?sales/customers:null,rows.length?100*d3.sum(rows,d=>d.DiscountSum)/(d3.sum(rows,d=>d.Lines)||1):null,d3.sum(rows,d=>d.QuantitySum)]}
function svg(id,w,h){return d3.select(id).append('svg').attr('viewBox','0 0 '+w+' '+h).attr('width','100%')}
function choose(place,add){if(!add){const only=selected.size===1&&selected.has(place);selected.clear();if(!only)selected.add(place)}else if(selected.has(place))selected.delete(place);else selected.add(place);render()}
const rowsGrid=['BC AB SK MB .. ON .. QC .. NB PE NL','.. .. .. .. .. .. .. .. .. .. ME NS','AK .. .. .. .. WI .. .. .. VT NH ..','WA ID MT ND MN IL MI .. NY MA .. ..','OR NV WY SD IA IN OH PA NJ CT RI ..','CA UT CO NE MO KY WV VA MD DE .. ..','.. AZ NM KS AR TN NC SC DC .. .. ..','HI .. .. OK LA MS AL GA .. .. .. ..','.. .. .. TX .. .. .. .. FL .. .. ..'];
const codes='Alabama:AL Alaska:AK Arizona:AZ Arkansas:AR California:CA Colorado:CO Connecticut:CT Delaware:DE Florida:FL Georgia:GA Hawaii:HI Idaho:ID Illinois:IL Indiana:IN Iowa:IA Kansas:KS Kentucky:KY Louisiana:LA Maine:ME Maryland:MD Massachusetts:MA Michigan:MI Minnesota:MN Mississippi:MS Missouri:MO Montana:MT Nebraska:NE Nevada:NV New_Hampshire:NH New_Jersey:NJ New_Mexico:NM New_York:NY North_Carolina:NC North_Dakota:ND Ohio:OH Oklahoma:OK Oregon:OR Pennsylvania:PA Rhode_Island:RI South_Carolina:SC South_Dakota:SD Tennessee:TN Texas:TX Utah:UT Vermont:VT Virginia:VA Washington:WA West_Virginia:WV Wisconsin:WI Wyoming:WY District_of_Columbia:DC British_Columbia:BC Alberta:AB Saskatchewan:SK Manitoba:MB Ontario:ON Quebec:QC New_Brunswick:NB Prince_Edward_Island:PE Newfoundland_and_Labrador:NL Nova_Scotia:NS'.split(' ').map(x=>x.replaceAll('_',' ').split(':'));
const abbr=new Map(codes),tile={};rowsGrid.forEach((row,y)=>row.split(' ').forEach((k,x)=>tile[k]=[x,y]));
const coords='AL -87 33;AK -152 64;AZ -112 34;AR -92 35;CA -120 37;CO -105.5 39;CT -72.7 41.6;DE -75.5 39;FL -82 28;GA -83 33;HI -156 20;ID -114 44;IL -89 40;IN -86 40;IA -93 42;KS -98 38;KY -85 37.6;LA -92 31;ME -69 45;MD -76.8 39;MA -71.8 42.3;MI -85 44;MN -94 46;MS -90 33;MO -92.5 38.5;MT -110 47;NE -100 41.5;NV -117 39;NH -71.6 43.8;NJ -74.6 40;NM -106 34.5;NY -75 43;NC -80 35.5;ND -100 47.5;OH -83 40.4;OK -97.5 35.5;OR -120.5 44;PA -77.7 41;RI -71.5 41.7;SC -81 34;SD -100 44.5;TN -86 36;TX -99 31;UT -111 39;VT -72.7 44;VA -79 37.5;WA -120.5 47.4;WV -80.6 38.6;WI -90 44.5;WY -107.5 43;DC -77 38.9;BC -124 54;AB -115 54;SK -106 54;MB -98 54;ON -85 51;QC -72 52;NB -66.5 46.5;PE -63.4 46.4;NL -56 49;NS -63 45'.split(';');
const geo=new Map(coords.map(e=>{let [k,x,y]=e.split(' ');return [k,[+x,+y]]}));
function render(){
 const base=data.filter(d=>(!region||d.Region===region)&&(!order||d.band===order)),dated=base.filter(d=>!range||(d.month>=range[0]&&d.month<=range[1])),context=base.filter(d=>!selected.size||selected.has(d['State/Province'])),active=dated.filter(d=>!selected.size||selected.has(d['State/Province']));
 const report=stats(active),byMonth=d3.nest().key(d=>d.month).map(active),series=months.filter(m=>!range||(m>=range[0]&&m<=range[1])).map(m=>stats(byMonth.get(m)||[]));
 $('#controls').replaceChildren();function tabs(items,value,cb){let g=el($('#controls'),'fieldset');items.forEach(([k,v])=>button(g,v,()=>{cb(k);render()},value===k))}
 tabs([['','All regions'],...[...new Set(data.map(d=>d.Region))].sort().map(k=>[k,k])],region,k=>{region=k;selected.clear()});
 tabs([['','All orders'],['Profitable','Profitable'],['Unprofitable','Unprofitable']],order,k=>order=k);
 button($('#controls'),'Targets',()=>{$('#targets').hidden=!$('#targets').hidden;render()},!$('#targets').hidden);
 button($('#controls'),'Reset filters',()=>{region=order='';range=null;selected.clear();render()});
 $('#targets').replaceChildren();el($('#targets'),'h3','Targets for the current selection');
 names.forEach((name,i)=>{let l=el($('#targets'),'label',name),input=el(l,'input');input.type='number';input.step='any';input.placeholder='Set target';input.value=goals[i]??'';input.onchange=()=>{goals[i]=input.value===''?null:input.valueAsNumber;render()}});
 $('#cards').replaceChildren();names.forEach((name,i)=>{let c=el($('#cards'),'section');c.className='card';el(c,'span',name);el(c,'strong',report[i]==null?'—':formats[i](report[i]));let goal=goals[i];el(c,'small',goal==null?'Target unset':('Target '+formats[i](goal)+(report[i]==null?'':(report[i]>=goal?' · Above/equal':' · Below'))));let s=svg(c,120,32),v=series.map(d=>d[i]),y=d3.scaleLinear().domain(d3.extent(v.filter(Number.isFinite))).range([29,3]);s.append('path').attr('d',d3.line().defined(Number.isFinite).x((d,j)=>2+j*116/Math.max(1,v.length-1)).y(y)(v)).attr('stroke','#487b62').attr('fill','none').attr('stroke-width',2)});
 $('#status').textContent=[region||'All regions',order||'All orders',selected.size?[...selected].join(', '):'All places',(range||[months[0],months.at(-1)]).join(' – ')].join('  ·  ');
 $('#panels').hidden=false;$('#modes').replaceChildren();['Tiles','Map'].forEach(k=>button($('#modes'),k,()=>{mode=k;render()},mode===k));
 const atlas=$('#atlas');atlas.replaceChildren();const places=d3.nest().key(d=>d['State/Province']).entries(dated).map(p=>({name:p.key,v:stats(p.values)})),s=svg(atlas,530,320);
 const color=d3.scaleLinear().domain([-.5,0,.5]).range(['#ba684b','#ece9d5','#397454']).clamp(true);
 if(mode==='Map'){
 const byCode=new Map(places.map(p=>[abbr.get(p.name),p]));
 const lookup=el(atlas,'select');lookup.setAttribute('aria-label','Select state or province');el(lookup,'option','Select a state or province…').value='';
 [...places].sort((a,b)=>a.name.localeCompare(b.name)).forEach(p=>el(lookup,'option',p.name).value=p.name);
 lookup.onchange=()=>{if(lookup.value)choose(lookup.value,false)};
 const info=el(atlas,'output','Hover or focus a place to see its profit margin.');info.className='mapinfo';
 atlasBoundaries.forEach(f=>{const p=byCode.get(f.k),v=p?.v[2],label=p?p.name+' · '+(v==null?'Margin unavailable':formats[2](v)+' profit margin'):f.name+' · No data';
 const shape=s.append('path').attr('d',f.path).attr('fill',v==null?'#d9ddcf':color(v/100)).attr('stroke',p&&selected.has(p.name)?'#1e3928':'#fffdf2').attr('stroke-width',p&&selected.has(p.name)?2:0.7).attr('opacity',p&&selected.size&&!selected.has(p.name)?.55:1);
 shape.append('title').text(label);
 if(p)shape.attr('role','button').attr('tabindex',0).attr('aria-label',label).attr('aria-pressed',selected.has(p.name)).style('cursor','pointer').on('mouseenter focus',()=>{info.textContent=label}).on('click',()=>choose(p.name,d3.event.ctrlKey||d3.event.metaKey)).on('keydown',()=>{if(['Enter',' '].includes(d3.event.key)){d3.event.preventDefault();choose(p.name,d3.event.ctrlKey||d3.event.metaKey)}})
 });
 const callouts=new Map(['PE','NS','NH','MA','RI','CT','NJ','DE','MD','DC'].map((k,i)=>[k,[455,106+i*13]]));
 const labels=s.append('g').attr('class','atlas-labels').attr('aria-hidden','true').attr('pointer-events','none');
 atlasBoundaries.forEach(f=>{
   const [x,y]=f.anchor, dest=callouts.get(f.k), [tx,ty]=dest||f.anchor;
   if(dest)labels.append('path').attr('d','M'+x+','+y+' L'+(tx-12)+','+ty+' H'+(tx-8)).attr('fill','none').attr('stroke','#647769').attr('stroke-width',0.65);
   labels.append('text').attr('x',tx).attr('y',ty).attr('dy','.34em').attr('text-anchor','middle').text(f.k);
 });
 el(atlas,'small','Boundaries: Natural Earth · Gray: no margin data · Alaska and Hawaii shown as insets.');
 }else places.forEach((p,j)=>{let k=abbr.get(p.name),t=tile[k]||[j%12,9],pt=[20+t[0]*44,20+t[1]*33];
 let g=s.append('g').attr('transform','translate('+pt+')').attr('role','button').attr('tabindex',0).attr('aria-label',p.name+' profit margin '+formats[2](p.v[2]||0)).style('cursor','pointer');
 let w=mode==='Map'?18:37,h=mode==='Map'?14:27;
 g.append('rect').attr('x',-w/2).attr('y',-h/2).attr('width',w).attr('height',h).attr('rx',mode==='Map'?7:4).attr('fill',color((p.v[2]||0)/100)).attr('stroke',selected.has(p.name)?'#162c24':'#bbbfa9').attr('stroke-width',selected.has(p.name)?3:1);
 g.append('text').attr('text-anchor','middle').attr('dy','.35em').attr('font-size',mode==='Map'?8:10).attr('fill',Math.abs(p.v[2])>35?'white':'#20352d').text(k||p.name.slice(0,2));g.append('title').text(p.name+' · '+formats[2](p.v[2]||0));g.on('click',()=>choose(p.name,d3.event.ctrlKey||d3.event.metaKey)).on('keydown',()=>{if(['Enter',' '].includes(d3.event.key)){d3.event.preventDefault();choose(p.name,d3.event.ctrlKey||d3.event.metaKey)}})});
 $('#months').replaceChildren();const chart=svg('#months',520,210),x=d3.scaleBand().domain(months).range([56,510]).padding(.16);
 const bars=months.map(m=>{let a=context.filter(d=>d.month===m);return [d3.sum(a.filter(d=>d.band==='Unprofitable'),d=>d.SalesSum),d3.sum(a.filter(d=>d.band==='Profitable'),d=>d.SalesSum)]});
 const y=d3.scaleLinear().domain([0,d3.max(bars,b=>b[0]+b[1])||1]).nice().range([178,10]);chart.append('g').attr('transform','translate(55,0)').call(d3.axisLeft(y).ticks(4).tickFormat(d=>'$'+d3.format('~s')(d)));
 bars.forEach((b,j)=>{b.forEach((v,i)=>{let base=i?b[0]:0;chart.append('rect').attr('x',x(months[j])).attr('width',x.bandwidth()).attr('y',y(base)).attr('height',0).attr('fill',i?'#488163':'#c47955').transition().duration(motion).attr('y',y(base+v)).attr('height',y(base)-y(base+v))});if(!j||months[j].slice(0,4)!==months[j-1].slice(0,4))chart.append('text').attr('x',x(months[j])).attr('y',197).attr('font-size',10).text(months[j].slice(0,4))});
 const brush=d3.brushX().extent([[55,8],[510,178]]).on('end',()=>{if(!d3.event.sourceEvent||!d3.event.selection)return;let [a,b]=d3.event.selection;let ms=months.filter(m=>x(m)+x.bandwidth()>=a&&x(m)<=b);if(ms.length){range=[ms[0],ms.at(-1)];render()}});
 const bg=chart.append('g').call(brush);if(range)bg.call(brush.move,[x(range[0]),x(range[1])+x.bandwidth()]);chart.on('dblclick',()=>{range=null;render()});
 $('#dates').replaceChildren();[0,1].forEach(i=>{let l=el($('#dates'),'label',i?'Through ':'From '),sel=el(l,'select');months.forEach(m=>el(sel,'option',m));sel.value=(range||[months[0],months.at(-1)])[i];sel.onchange=()=>{let a=[...(range||[months[0],months.at(-1)])];a[i]=sel.value;range=a.sort();render()}});button($('#dates'),'Clear dates',()=>{range=null;render()});
 $('#ranks').replaceChildren();[false,true].forEach(gain=>{let sec=el($('#ranks'),'section');el(sec,'h3',gain?'Most profit made':'Most profit lost');let list=places.filter(p=>(!selected.size||selected.has(p.name))&&(gain?p.v[1]>0:p.v[1]<0)).sort((a,b)=>(gain?-1:1)*(a.v[1]-b.v[1])).slice(0,7);if(!list.length)el(sec,'p','None in selection');list.forEach(p=>{let b=button(sec,p.name,()=>choose(p.name,false));el(b,'b',money(p.v[1]))})});
}
(async()=>{let src=localSources;window.atlasSources=src;window.dispatchEvent(new Event("atlas-ready"));let ds=src.find(s=>s.name==='Superstore Datasource')||src[0];let result=await ds.queryAsync(q);data=result.data;if(!data?.length)throw Error('No visible orders');const profit=d3.nest().key(d=>d['Order ID']).rollup(v=>d3.sum(v,d=>d.ProfitSum)).map(data);data.forEach(d=>{d.month=String(d['Order Date']).slice(0,7);d.band=profit.get(d['Order ID'])<0?'Unprofitable':'Profitable'});months=[...new Set(data.map(d=>d.month))].sort();render()})().catch(e=>$('#status').textContent='Unable to open the journal: '+(e.message||e));
