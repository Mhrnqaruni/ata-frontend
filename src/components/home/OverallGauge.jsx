import React,{useId} from 'react';
const position=(value,r=90)=>{const a=Math.PI*(1-value/100);return [130+r*Math.cos(a),122-r*Math.sin(a)];};
const arc=(a,b)=>{const s=position(a),e=position(b);return `M ${s[0]} ${s[1]} A 90 90 0 0 1 ${e[0]} ${e[1]}`;};
export default function OverallGauge({value}){
 const id=useId().replace(/:/g,'');const v=Math.max(0,Math.min(100,value));const point=position(v);const green=v>=70;
 return <svg className="home-gauge" style={{'--gauge-tone':green?'var(--mst-ok)':'var(--mst-accent)'}} viewBox="0 0 260 168" role="img" aria-label={`Overall average ${value.toFixed(1)} percent, zero to one hundred scale. Filled to ${v.toFixed(1)} percent.`}>
  <defs>
   <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor="var(--gauge-tone)" stopOpacity=".72"/>
    <stop offset=".48" stopColor="var(--gauge-tone)"/>
    <stop offset="1" stopColor="var(--gauge-tone)" stopOpacity=".78"/>
   </linearGradient>
   <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
    <stop stopColor="#fff" stopOpacity=".72"/><stop offset=".5" stopColor="#fff" stopOpacity=".08"/><stop offset="1" stopColor="#fff" stopOpacity=".3"/>
   </linearGradient>
  </defs>
  <path d={arc(0,100)} className="home-gauge-rim"/>
  <path d={arc(0,100)} fill="none" stroke='var(--mst-neutral)' strokeWidth="13" strokeLinecap="round"/>
  {v>0&&<path d={arc(0,v)} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="13" strokeLinecap="round"/>}
  <path d={arc(0,100)} fill="none" stroke={`url(#${id}-shine)`} strokeWidth="2" strokeLinecap="round" transform="translate(0 -3)"/>
  <circle cx={point[0]} cy={point[1]} r="8" fill="var(--gauge-tone)" opacity=".12"/>
  <circle cx={point[0]} cy={point[1]} r="4.5" fill="var(--gauge-tone)" stroke="var(--mst-solid)" strokeWidth="2"/>
  <text x="130" y="102" textAnchor="middle" className="home-gauge-value">{value.toFixed(1)}%</text>
  <text x="130" y="124" textAnchor="middle" className="home-axis">Overall average</text>
  <text x="38" y="148" className="home-axis" textAnchor="middle">0%</text>
  <text x="222" y="148" className="home-axis" textAnchor="middle">100%</text>
 </svg>;
}
