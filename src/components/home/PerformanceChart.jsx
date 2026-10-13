import React,{useId,useLayoutEffect,useRef,useState} from 'react';
export default function PerformanceChart({items,onInspect}){
 const host=useRef(null);const [width,setWidth]=useState(800);const [active,setActive]=useState(null);const titleId=useId();
 useLayoutEffect(()=>{const el=host.current;const read=()=>setWidth(Math.max(280,Math.round(el.getBoundingClientRect().width)));read();const observer=new ResizeObserver(read);observer.observe(el);return()=>observer.disconnect();},[]);
 const height=166,left=46,right=18,top=12,bottom=34;
 const values=items.map(item=>item.average);
 const low=Math.max(0,Math.min(...values)-5),high=Math.min(100,Math.max(...values)+5);
 const span=Math.max(1,high-low);
 const ticks=[low,low+span/3,low+2*span/3,high];const plotWidth=width-left-right,plotHeight=height-top-bottom;
 const x=i=>items.length===1?left+plotWidth/2:left+i*plotWidth/(items.length-1);const y=value=>top+(high-value)/span*plotHeight;
 const path=items.map((item,i)=>`${i?'L':'M'}${x(i)} ${y(item.average)}`).join(' ');
 const selected=active===null?null:items[active];
 const visibleLabels=width<600?new Set([0,Math.round((items.length-1)/2),items.length-1]):null;
 const date=value=>new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
 return <div className="home-chart" ref={host}>
  <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} aria-labelledby={titleId} role="group">
   <title id={titleId}>Overall student average over time. Scale includes five percentage points below the lowest and above the highest visible average, bounded by zero and one hundred.</title>
   {ticks.map(value=><g key={value}><line className="home-grid-line" x1={left} x2={width-right} y1={y(value)} y2={y(value)}/><text className="home-axis" x={left-10} y={y(value)+4} textAnchor="end">{Number(value.toFixed(1))}%</text></g>)}
   {items.length>1 && <path d={path} className="home-trend"/>}
   {items.map((item,i)=><g key={item.id}>
    <g role="button" tabIndex={0} aria-label={`${item.label || "Overall average"}, ${date(item.date)}, average ${item.average.toFixed(1)} percent, ${item.graded} graded. Open assessment results.`} className="home-point" onFocus={()=>setActive(i)} onBlur={()=>setActive(null)} onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)} onClick={()=>onInspect(item)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onInspect(item);}}}>
     <circle cx={x(i)} cy={y(item.average)} r="14" className="home-point-target"/>
     <circle cx={x(i)} cy={y(item.average)} r={active===i?6:4.5} className="home-point-dot"/>
     <title>{item.label} · {date(item.date)} · {item.average.toFixed(1)}% · {item.graded} graded</title>
    </g>
    {(!visibleLabels || visibleLabels.has(i)) && <>
    <text className="home-label" x={x(i)} y={height-27} textAnchor="middle">{item.label}</text>
    <text className="home-axis" x={x(i)} y={height-9} textAnchor="middle">{date(item.date)}</text>
    </>}
   </g>)}
  </svg>
  <div className="home-chart-note" aria-live="polite" title="Absent and pending results are excluded; real zero grades are included.">{selected?`${selected.label} · ${date(selected.date)} · ${selected.average.toFixed(1)}% average · ${selected.graded} students graded`:items.length===1?'More assessments will show how the average changes.':'Each student is weighted equally.'}</div>
 </div>;
}
