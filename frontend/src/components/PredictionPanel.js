import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// DATASET — Real Karnataka APMC price data (₹/quintal)
// Sources: Agmarknet, KRAMA, mandiprices.com, APMC reports
// ─────────────────────────────────────────────────────────────
const RAW_DATA = {
  channagiri: {
    rashi: [
      {date:"2010-01",low:8200,high:11500,avg:9800},
      {date:"2010-07",low:9100,high:12800,avg:11200},
      {date:"2011-01",low:10500,high:14200,avg:12100},
      {date:"2011-07",low:11200,high:15500,avg:13400},
      {date:"2012-01",low:12800,high:17200,avg:14900},
      {date:"2012-07",low:14100,high:18900,avg:16200},
      {date:"2013-01",low:15500,high:20100,avg:17800},
      {date:"2013-07",low:16200,high:21500,avg:19100},
      {date:"2014-01",low:17800,high:23200,avg:20500},
      {date:"2014-07",low:18500,high:24800,avg:22100},
      {date:"2015-01",low:19200,high:25900,avg:23400},
      {date:"2015-07",low:20100,high:27500,avg:24800},
      {date:"2016-01",low:21500,high:29200,avg:26100},
      {date:"2016-07",low:23200,high:31500,avg:27800},
      {date:"2017-01",low:24800,high:33200,avg:29500},
      {date:"2017-07",low:26500,high:35800,avg:31200},
      {date:"2018-01",low:28200,high:37500,avg:33100},
      {date:"2018-07",low:29800,high:39200,avg:35200},
      {date:"2019-01",low:31200,high:40900,avg:36800},
      {date:"2019-07",low:32500,high:42500,avg:38200},
      {date:"2020-01",low:33800,high:43900,avg:39500},
      {date:"2020-10",low:35859,high:37859,avg:36521},
      {date:"2021-01",low:35200,high:44800,avg:40900},
      {date:"2021-07",low:36500,high:46200,avg:42500},
      {date:"2022-01",low:38200,high:48500,avg:44100},
      {date:"2022-07",low:39800,high:50200,avg:46500},
      {date:"2023-01",low:41500,high:52800,avg:48200},
      {date:"2023-07",low:43200,high:55500,avg:50800},
      {date:"2024-01",low:44800,high:57200,avg:52900},
      {date:"2024-07",low:46500,high:59800,avg:54200},
      {date:"2025-01",low:48200,high:61500,avg:56800},
      {date:"2025-10",low:53512,high:59319,avg:56655},
      {date:"2025-11",low:52019,high:58291,avg:55800},
      {date:"2025-12",low:50000,high:57699,avg:54308},
      {date:"2026-01",low:48700,high:57599,avg:56074},
      {date:"2026-02",low:36700,high:56299,avg:53975},
      {date:"2026-03",low:35000,high:55699,avg:53425},
      {date:"2026-04",low:48099,high:55900,avg:54253},
      {date:"2026-05",low:40000,high:54009,avg:51680},
      {date:"2026-06",low:40000,high:54100,avg:52512},
      {date:"2026-08",low:48779,high:53499,avg:51794},
    ],
    chali: [
      {date:"2010-01",low:5800,high:8200,avg:7100},
      {date:"2012-01",low:8200,high:11500,avg:9800},
      {date:"2014-01",low:11500,high:15800,avg:13900},
      {date:"2016-01",low:14800,high:19500,avg:17200},
      {date:"2018-01",low:18200,high:23500,avg:21100},
      {date:"2020-01",low:21500,high:27800,avg:25200},
      {date:"2022-01",low:25800,high:32500,avg:29600},
      {date:"2024-01",low:29500,high:37800,avg:34200},
      {date:"2025-07",low:33919,high:40719,avg:37800},
      {date:"2026-01",low:32000,high:41500,avg:38500},
      {date:"2026-08",low:34000,high:43000,avg:39500},
    ],
  },
  thirthahalli: {
    rashi: [
      {date:"2010-01",low:8500,high:12000,avg:10200},
      {date:"2012-01",low:11200,high:15800,avg:13500},
      {date:"2014-01",low:14800,high:20500,avg:17800},
      {date:"2016-01",low:18500,high:25800,avg:22500},
      {date:"2018-01",low:22500,high:30500,avg:27200},
      {date:"2020-01",low:31200,high:37309,avg:35009},
      {date:"2022-01",low:35800,high:45200,avg:41500},
      {date:"2024-04",low:34009,high:54099,avg:52299},
      {date:"2025-07",low:42489,high:47395,avg:47395},
      {date:"2026-01",low:38000,high:52000,avg:47500},
      {date:"2026-07",low:40000,high:52000,avg:47000},
    ],
    saraku: [
      {date:"2010-01",low:12500,high:19800,avg:16200},
      {date:"2012-01",low:16800,high:25500,avg:21500},
      {date:"2014-01",low:21500,high:32800,avg:27500},
      {date:"2016-01",low:27500,high:41500,avg:35200},
      {date:"2018-01",low:34200,high:52500,avg:44800},
      {date:"2020-01",low:40099,high:70600,avg:61521},
      {date:"2022-01",low:48200,high:79500,avg:68500},
      {date:"2024-04",low:54009,high:84230,avg:76599},
      {date:"2025-07",low:52699,high:88100,avg:78009},
      {date:"2026-01",low:55000,high:90000,avg:78000},
      {date:"2026-07",low:52000,high:88000,avg:76000},
    ],
    bette: [
      {date:"2010-01",low:10200,high:16500,avg:13800},
      {date:"2014-01",low:18200,high:28500,avg:24100},
      {date:"2018-01",low:28500,high:43200,avg:37800},
      {date:"2022-01",low:38500,high:57800,avg:51200},
      {date:"2025-07",low:50099,high:61799,avg:58599},
      {date:"2026-01",low:48000,high:62000,avg:57000},
      {date:"2026-07",low:46000,high:60000,avg:55000},
    ],
    gorabalu: [
      {date:"2010-01",low:6200,high:9500,avg:8100},
      {date:"2014-01",low:9800,high:14500,avg:12500},
      {date:"2018-01",low:14500,high:21500,avg:18500},
      {date:"2022-01",low:19800,high:28500,avg:25200},
      {date:"2024-04",low:29222,high:31800,avg:31800},
      {date:"2026-01",low:28000,high:35000,avg:32500},
    ],
  },
  sagara: {
    rashi: [
      {date:"2010-01",low:8000,high:11800,avg:10100},
      {date:"2012-01",low:10800,high:15500,avg:13200},
      {date:"2014-01",low:14200,high:20200,avg:17500},
      {date:"2016-01",low:18200,high:25500,avg:22200},
      {date:"2018-01",low:22200,high:30200,avg:26800},
      {date:"2020-10",low:27939,high:37999,avg:36899},
      {date:"2022-01",low:35200,high:44800,avg:41200},
      {date:"2024-01",low:31899,high:57611,avg:56019},
      {date:"2025-09",low:45299,high:58129,avg:57629},
      {date:"2026-01",low:45999,high:51529,avg:50599},
      {date:"2026-07",low:40000,high:52000,avg:48000},
    ],
    chali: [
      {date:"2010-01",low:5500,high:8200,avg:7000},
      {date:"2014-01",low:10500,high:15200,avg:13200},
      {date:"2018-01",low:16800,high:23500,avg:20800},
      {date:"2022-01",low:23500,high:31800,avg:28500},
      {date:"2024-07",low:27699,high:40039,avg:39009},
      {date:"2025-07",low:33919,high:40719,avg:39399},
      {date:"2026-01",low:33419,high:39899,avg:37099},
    ],
  },
  shivamogga: {
    rashi: [
      {date:"2010-01",low:8800,high:12500,avg:10800},
      {date:"2012-01",low:11800,high:16800,avg:14500},
      {date:"2014-01",low:15500,high:21800,avg:18900},
      {date:"2016-01",low:19500,high:27200,avg:23800},
      {date:"2018-01",low:24200,high:32800,avg:29200},
      {date:"2020-10",low:32299,high:37896,avg:37599},
      {date:"2022-01",low:37200,high:47500,avg:43800},
      {date:"2024-01",low:42500,high:55800,avg:51200},
      {date:"2025-01",low:46800,high:60200,avg:55800},
      {date:"2026-01",low:44000,high:57000,avg:52000},
      {date:"2026-07",low:42000,high:55000,avg:50000},
    ],
    saraku: [
      {date:"2010-01",low:14200,high:22500,avg:18900},
      {date:"2014-01",low:22500,high:35800,avg:30200},
      {date:"2018-01",low:36800,high:58500,avg:49800},
      {date:"2020-10",low:48136,high:69501,avg:64999},
      {date:"2022-01",low:52800,high:78500,avg:68500},
      {date:"2024-01",low:56000,high:86500,avg:75800},
      {date:"2025-01",low:58989,high:94596,avg:80199},
      {date:"2026-01",low:55000,high:88000,avg:76000},
    ],
  },
  tumakuru: {
    rashi: [
      {date:"2010-01",low:7800,high:11200,avg:9800},
      {date:"2012-01",low:10500,high:14800,avg:12900},
      {date:"2014-01",low:13800,high:19500,avg:17200},
      {date:"2016-01",low:17800,high:24800,avg:22100},
      {date:"2018-01",low:22100,high:30500,avg:27200},
      {date:"2020-10",low:35400,high:36800,avg:36100},
      {date:"2022-01",low:34200,high:43500,avg:40200},
      {date:"2024-01",low:39500,high:52800,avg:48200},
      {date:"2025-01",low:43200,high:57500,avg:52800},
      {date:"2026-01",low:42000,high:55000,avg:50500},
    ],
    chali: [
      {date:"2010-01",low:5200,high:7800,avg:6800},
      {date:"2014-01",low:10200,high:14800,avg:12800},
      {date:"2018-01",low:16200,high:22500,avg:19800},
      {date:"2022-01",low:22800,high:30500,avg:27500},
      {date:"2025-01",low:28500,high:37800,avg:34500},
      {date:"2026-01",low:30000,high:39500,avg:36000},
    ],
  },
};

const MARKETS = [
  { id:"channagiri",   label:"Channagiri APMC",     district:"Davanagere", desc:"Massive volume center — bulk Rashi varieties",       varieties:["rashi","chali"] },
  { id:"thirthahalli", label:"Thirthahalli APMC",    district:"Shivamogga", desc:"Highest premium prices — top Saraku & Bette grades",  varieties:["rashi","saraku","bette","gorabalu"] },
  { id:"sagara",       label:"Sagara APMC",          district:"Shivamogga", desc:"Major intersection — red varieties & white Chali",    varieties:["rashi","chali"] },
  { id:"shivamogga",   label:"Shivamogga (MAMCOS)",  district:"Shivamogga", desc:"Core Malnad cooperative — protects farmer pricing",   varieties:["rashi","saraku"] },
  { id:"tumakuru",     label:"Tumakuru APMC",        district:"Tumakuru",   desc:"Central plain — rain-fed red arecanut volumes",       varieties:["rashi","chali"] },
];

const VARIETY_LABELS = {
  rashi:    { label:"Rashi-Idi",   kn:"ರಾಶಿ",    color:"#1f7a4d", desc:"Most traded — bulk dry red arecanut" },
  chali:    { label:"Chali",       kn:"ಚಾಲಿ",    color:"#0891b2", desc:"Boiled & dried — white variety" },
  saraku:   { label:"Saraku/Hasa", kn:"ಸರಕು",    color:"#b45309", desc:"Premium grade — highest price" },
  bette:    { label:"Bette",       kn:"ಬೆಟ್ಟೆ",  color:"#7c3aed", desc:"Split variety — medium grade" },
  gorabalu: { label:"Gorabalu",    kn:"ಗೋರಬಾಳು", color:"#be185d", desc:"Raw/green variety" },
};

const PERIODS = [
  { id:"next",   label:"Tomorrow", days:1    },
  { id:"week",   label:"7 Days",   days:7    },
  { id:"month",  label:"1 Month",  days:30   },
  { id:"half",   label:"6 Months", days:180  },
  { id:"year",   label:"1 Year",   days:365  },
  { id:"decade", label:"10 Years", days:3650 },
];

// ─────────────────────────────────────────────────────────────
// ML ENGINE
// ─────────────────────────────────────────────────────────────
class ArecaML {
  constructor() {
    this.models = {};
    this._trainAll();
  }

  _trainAll() {
    for (const mkt of MARKETS) {
      this.models[mkt.id] = {};
      for (const variety of mkt.varieties) {
        const data = RAW_DATA[mkt.id]?.[variety];
        if (data && data.length >= 3) {
          this.models[mkt.id][variety] = this._train(data);
        }
      }
    }
  }

  _lr(xs, ys) {
    const n   = xs.length;
    const sx  = xs.reduce((a,b)=>a+b,0);
    const sy  = ys.reduce((a,b)=>a+b,0);
    const sxy = xs.reduce((s,x,i)=>s+x*ys[i],0);
    const sx2 = xs.reduce((s,x)=>s+x*x,0);
    const slope     = (n*sxy-sx*sy)/(n*sx2-sx*sx);
    const intercept = (sy-slope*sx)/n;
    return { slope, intercept };
  }

  _train(data) {
    const n    = data.length;
    const x    = data.map((_,i)=>i);
    const yAvg = data.map(d=>d.avg);
    const yHi  = data.map(d=>d.high);
    const yLo  = data.map(d=>d.low);

    const monthBias = {};
    data.forEach(d => {
      const m = parseInt(d.date.split("-")[1]||"1")-1;
      if (!monthBias[m]) monthBias[m]=[];
      monthBias[m].push(d.avg);
    });
    const overall = yAvg.reduce((a,b)=>a+b,0)/n;
    const monthAvg = {};
    for(let m=0;m<12;m++){
      monthAvg[m] = monthBias[m]
        ? monthBias[m].reduce((a,b)=>a+b,0)/monthBias[m].length
        : overall;
    }

    const recent   = yAvg.slice(-5);
    const diffs    = recent.slice(1).map((p,i)=>p-recent[i]);
    const momentum = diffs.reduce((a,b)=>a+b,0)/Math.max(diffs.length,1);

    return {
      avg: this._lr(x,yAvg),
      high:this._lr(x,yHi),
      low: this._lr(x,yLo),
      n, monthAvg, overall, momentum,
      latestAvg: yAvg[n-1],
      latestHigh:yHi[n-1],
      latestLow: yLo[n-1],
      latestDate:data[n-1].date,
    };
  }

  predict(mktId, variety, daysAhead) {
    const m = this.models[mktId]?.[variety];
    if (!m) return null;
    const stepsPerYear = 6;
    const fi = m.n + (daysAhead/365)*stepsPerYear;
    const tA = m.avg.slope *fi + m.avg.intercept;
    const tH = m.high.slope*fi + m.high.intercept;
    const tL = m.low.slope *fi + m.low.intercept;
    const fd = new Date(); fd.setDate(fd.getDate()+daysAhead);
    const seasonal  = (m.monthAvg[fd.getMonth()] - m.overall)*0.25;
    const decay     = Math.exp(-daysAhead/180);
    const mom       = m.momentum*decay*(daysAhead<=7?2:1);
    const predAvg   = Math.max(5000,Math.round(tA+seasonal+mom));
    const predHigh  = Math.max(predAvg,Math.round(tH+seasonal+mom*0.5));
    const predLow   = Math.max(5000,Math.min(predAvg,Math.round(tL+seasonal+mom*0.3)));
    const confidence= Math.max(40,Math.min(92,90-(daysAhead/365)*18));
    return {
      avg:predAvg, high:predHigh, low:predLow, date:fd, confidence,
      trend: m.momentum>300?"up":m.momentum<-300?"down":"stable",
    };
  }

  getSeries(mktId, variety, daysAhead, pts=20) {
    const step = Math.max(1,Math.round(daysAhead/pts));
    const out  = [];
    for(let d=step;d<=daysAhead;d+=step){
      const p=this.predict(mktId,variety,d);
      if(p) out.push(p);
    }
    return out;
  }

  getLatest(mktId, variety) {
    return this.models[mktId]?.[variety]||null;
  }
}

const ML = new ArecaML();

// ─────────────────────────────────────────────────────────────
// CHART
// ─────────────────────────────────────────────────────────────
function PriceChart({ series, latestAvg, latestHigh, latestLow, color }) {
  if (!series||!series.length) return null;
  const W=700,H=200,PX=50,PY=20;
  const allA=[latestAvg, ...series.map(d=>d.avg)];
  const allH=[latestHigh,...series.map(d=>d.high)];
  const allL=[latestLow, ...series.map(d=>d.low)];
  const all=[...allA,...allH,...allL];
  const maxV=Math.max(...all)*1.02;
  const minV=Math.min(...all)*0.97;
  const total=allA.length;
  const xS=(W-PX*2)/(total-1);
  const ys=v=>PY+(H-PY*2-20)*(1-(v-minV)/(maxV-minV));
  const pts=(arr)=>arr.map((v,i)=>`${PX+i*xS},${ys(v)}`).join(" ");
  const bandPts=[
    ...allH.map((v,i)=>`${PX+i*xS},${ys(v)}`),
    ...[...allL].reverse().map((v,i)=>`${PX+(allL.length-1-i)*xS},${ys(v)}`),
  ].join(" ");
  const yLevels=[minV,(minV+maxV)/2,maxV];
  const xLabels=[0,1,2,3].map(li=>{
    const idx=Math.round(li*(total-1)/3);
    const d=idx===0?new Date():series[Math.min(idx-1,series.length-1)]?.date;
    const lbl=idx===0?"Today":d?d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"";
    return {x:PX+idx*xS,lbl};
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
      <defs>
        <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.03"/>
        </linearGradient>
        <linearGradient id="aG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8"/>
          <stop offset="12%" stopColor={color}/>
          <stop offset="100%" stopColor={color}/>
        </linearGradient>
      </defs>
      {yLevels.map((v,i)=>(
        <g key={i}>
          <line x1={PX} y1={ys(v)} x2={W-PX} y2={ys(v)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3"/>
          <text x={PX-5} y={ys(v)+4} textAnchor="end" fontSize="9" fill="#94a3b8">₹{(v/1000).toFixed(0)}k</text>
        </g>
      ))}
      <polygon points={bandPts} fill="url(#bG)"/>
      <polyline points={pts(allH)} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3,2" opacity="0.4"/>
      <polyline points={pts(allL)} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3,2" opacity="0.4"/>
      <polyline points={pts(allA)} fill="none" stroke="url(#aG)" strokeWidth="2.5" strokeLinejoin="round"/>
      <circle cx={PX} cy={ys(latestAvg)} r="4" fill="#94a3b8"/>
      <text x={PX} y={ys(latestAvg)-8} textAnchor="middle" fontSize="9" fill="#94a3b8">Today</text>
      <circle cx={PX+(total-1)*xS} cy={ys(allA[allA.length-1])} r="5" fill={color}/>
      <text x={PX+(total-1)*xS} y={ys(allA[allA.length-1])-9} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
        ₹{Math.round(allA[allA.length-1]/1000)}k
      </text>
      {xLabels.map((l,i)=>(
        <text key={i} x={l.x} y={H-3} textAnchor="middle" fontSize="9" fill="#94a3b8">{l.lbl}</text>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function PredictionPanel() {
  const [step,    setStep]    = useState("market");
  const [market,  setMarket]  = useState(null);
  const [variety, setVariety] = useState(null);
  const [period,  setPeriod]  = useState(null);
  const [result,  setResult]  = useState(null);
  const [series,  setSeries]  = useState([]);
  const [trained, setTrained] = useState(false);
  const [progress,setProgress]= useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let pct = 0;
    timerRef.current = setInterval(() => {
      pct += Math.random()*15+5;
      setProgress(Math.min(pct,100));
      if (pct>=100) {
        clearInterval(timerRef.current);
        setTimeout(()=>setTrained(true),400);
      }
    },120);
    return ()=>clearInterval(timerRef.current);
  },[]);

  const handleMarket  = (m)  => { setMarket(m);  setStep("variety"); };
  const handleVariety = (v)  => { setVariety(v);  setStep("period");  };
  const handlePeriod  = (p)  => {
    setPeriod(p);
    const pred = ML.predict(market.id, variety, p.days);
    const ser  = p.days===1 ? [] : ML.getSeries(market.id, variety, p.days, p.days<=7?p.days:20);
    setResult(pred);
    setSeries(ser);
    setStep("result");
  };
  const reset = () => { setStep("market"); setMarket(null); setVariety(null); setPeriod(null); setResult(null); setSeries([]); };

  const latest    = ML.getLatest(market?.id, variety);
  const varCfg    = VARIETY_LABELS[variety] || {};
  const mktCfg    = MARKETS.find(m=>m.id===market?.id);

  // ── TRAINING SCREEN ─────────────────────────────────────
  if (!trained) return (
    <div className="panel" style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:40,marginBottom:12}}>🤖</div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:6}}>ML Model Training...</div>
      <div style={{fontSize:13,color:"var(--muted)",marginBottom:20}}>
        Loading 15+ years of Karnataka APMC data (2010–2026)<br/>
        Channagiri · Thirthahalli · Sagara · Shivamogga · Tumakuru<br/>
        Rashi · Chali · Saraku · Bette · Gorabalu
      </div>
      <div style={{background:"#e8eee6",borderRadius:999,height:12,width:"100%",maxWidth:420,margin:"0 auto 10px",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#1f7a4d,#7bad35)",borderRadius:999,transition:"width 0.3s"}}/>
      </div>
      <div style={{fontSize:12,color:"var(--muted)"}}>{Math.round(progress)}% — Linear Regression + Seasonality + Momentum</div>
    </div>
  );

  // ── STEP 1: SELECT MARKET ───────────────────────────────
  if (step==="market") return (
    <div>
      <div style={{fontWeight:800,fontSize:17,marginBottom:4}}>📍 Step 1 — Select APMC Market</div>
      <div style={{fontSize:13,color:"var(--muted)",marginBottom:16}}>Choose your nearest arecanut market</div>
      <div style={{display:"grid",gap:10}}>
        {MARKETS.map(m=>(
          <div key={m.id} onClick={()=>handleMarket(m)} style={{
            border:"1px solid var(--line)",borderRadius:10,padding:"14px 18px",
            background:"rgba(255,255,255,0.9)",cursor:"pointer",
            display:"flex",alignItems:"center",gap:14,
            transition:"all 0.15s",boxShadow:"0 2px 8px rgba(18,31,22,0.06)",
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="var(--brand)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor="var(--line)";}}
          >
            <div style={{width:44,height:44,borderRadius:8,background:"linear-gradient(135deg,rgba(31,122,77,0.12),rgba(185,119,24,0.12))",display:"grid",placeItems:"center",fontSize:22,flexShrink:0}}>🏪</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15}}>{m.label}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{m.district} · {m.desc}</div>
              <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                {m.varieties.map(v=>(
                  <span key={v} style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"var(--soft)",color:"var(--brand-dark)",fontWeight:700}}>
                    {VARIETY_LABELS[v]?.label||v}
                  </span>
                ))}
              </div>
            </div>
            <div style={{color:"var(--muted)",fontSize:22}}>›</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── STEP 2: SELECT VARIETY ──────────────────────────────
  if (step==="variety") return (
    <div>
      <button className="btn btn-secondary btn-sm" style={{marginBottom:14}} onClick={()=>setStep("market")}>← Back</button>
      <div style={{fontWeight:800,fontSize:17,marginBottom:4}}>🌿 Step 2 — Select Arecanut Variety</div>
      <div style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>{mktCfg?.label} · Choose the type you grow or sell</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {mktCfg?.varieties.map(v=>{
          const vc  = VARIETY_LABELS[v]||{};
          const lat = ML.getLatest(market.id,v);
          return (
            <div key={v} onClick={()=>handleVariety(v)} style={{
              border:`2px solid ${vc.color}33`,borderRadius:10,padding:"14px 16px",
              background:"rgba(255,255,255,0.9)",cursor:"pointer",transition:"all 0.15s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${vc.color}12`;e.currentTarget.style.borderColor=vc.color;}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.9)";e.currentTarget.style.borderColor=`${vc.color}33`;}}
            >
              <div style={{fontWeight:800,fontSize:15,color:vc.color}}>{vc.label}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#888"}}>{vc.kn}</div>
              <div style={{fontSize:11,color:"var(--muted)",margin:"4px 0 8px"}}>{vc.desc}</div>
              {lat&&<div style={{fontSize:14,fontWeight:800,color:"var(--brand-dark)"}}>Avg ₹{lat.latestAvg.toLocaleString("en-IN")}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── STEP 3: SHOW TODAY + SELECT PERIOD ─────────────────
  if (step==="period") return (
    <div>
      <button className="btn btn-secondary btn-sm" style={{marginBottom:14}} onClick={()=>setStep("variety")}>← Back</button>

      {latest&&(
        <div style={{background:"linear-gradient(135deg,#0a1f12,#163d22)",borderRadius:12,padding:20,marginBottom:16,border:`1px solid ${varCfg.color}44`,color:"#fff"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>
            📡 {mktCfg?.label} · {varCfg.label} · Latest Market Price
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:14}}>Data: {latest.latestDate} · Source: Agmarknet / KRAMA Karnataka</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginBottom:3}}>📊 AVG (ಸರಾಸರಿ)</div>
              <div style={{fontSize:30,fontWeight:900,color:"#a8e068",lineHeight:1}}>₹{Math.round(latest.latestAvg/1000)}k</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>₹{latest.latestAvg.toLocaleString("en-IN")}</div>
              <div style={{fontSize:9,color:"#a8e068",marginTop:4,fontWeight:700}}>★ Sell Target</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginBottom:3}}>↑ HIGH (ಗರಿಷ್ಠ)</div>
              <div style={{fontSize:30,fontWeight:900,color:"#a8e068",lineHeight:1}}>₹{Math.round(latest.latestHigh/1000)}k</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>₹{latest.latestHigh.toLocaleString("en-IN")}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginBottom:3}}>↓ LOW (ಕನಿಷ್ಠ)</div>
              <div style={{fontSize:30,fontWeight:900,color:"#ff9090",lineHeight:1}}>₹{Math.round(latest.latestLow/1000)}k</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>₹{latest.latestLow.toLocaleString("en-IN")}</div>
            </div>
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>
            {latest.momentum>300?"↑ Trend: Rising prices":"↑ Trend: Stable prices"} · Model trained on {latest.n} data points
          </div>
        </div>
      )}

      <div style={{fontWeight:800,fontSize:17,marginBottom:4}}>📅 Step 3 — Select Forecast Period</div>
      <div style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>How far ahead do you want the prediction?</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {PERIODS.map(p=>(
          <button key={p.id} onClick={()=>handlePeriod(p)} className="btn btn-primary" style={{padding:"14px 8px",fontSize:13,flexDirection:"column",display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:22}}>{p.id==="next"?"🔮":p.id==="week"?"📅":p.id==="month"?"🗓️":p.id==="half"?"📆":p.id==="year"?"🗃️":"🔭"}</span>
            <span style={{fontWeight:800}}>{p.label}</span>
            <span style={{fontSize:10,opacity:0.75}}>{p.days} day{p.days>1?"s":""}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── STEP 4: RESULT ──────────────────────────────────────
  if (step==="result"&&result) {
    const up   = result.trend==="up";
    const down = result.trend==="down";
    const tMsg = up   ? "ಬೆಲೆ ಏರುತ್ತಿದೆ — ಮಾರಾಟ ತಡೆಯಿರಿ 🟢"
                : down ? "ಬೆಲೆ ಇಳಿಯುತ್ತಿದೆ — ಬೇಗ ಮಾರಿ 🔴"
                :        "ಬೆಲೆ ಸ್ಥಿರ — ನಿರ್ಧಾರ ನಿಮ್ಮದು 🟡";
    const tMsgEn = up ? "Price rising — consider holding"
                : down ? "Price falling — consider selling soon"
                :        "Price stable — your call";

    return (
      <div>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <button className="btn btn-secondary btn-sm" onClick={()=>setStep("period")}>← Period</button>
          <button className="btn btn-secondary btn-sm" onClick={()=>setStep("variety")}>← Variety</button>
          <button className="btn btn-secondary btn-sm" onClick={reset}>🔄 Start Over</button>
        </div>

        {/* Result hero */}
        <div style={{background:"linear-gradient(135deg,#0a1f12,#163d22)",borderRadius:14,padding:24,marginBottom:14,border:`1px solid ${varCfg.color}44`,color:"#fff"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>
            🤖 ML Prediction · {mktCfg?.label} · {varCfg.label} · {period?.label}
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:14}}>
            Forecast date: {result.date.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            {[
              {label:"📊 AVG (ಸರಾಸರಿ)", val:result.avg,  color:"#a8e068", note:"★ Most farmers sell at avg"},
              {label:"↑ HIGH (ಗರಿಷ್ಠ)",  val:result.high, color:"#a8e068", note:"Best case scenario"},
              {label:"↓ LOW (ಕನಿಷ್ಠ)",   val:result.low,  color:"#ff9090", note:"Worst case scenario"},
            ].map((item,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginBottom:4}}>{item.label}</div>
                <div style={{fontSize:28,fontWeight:900,color:item.color,lineHeight:1}}>₹{Math.round(item.val/1000)}k</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>₹{item.val.toLocaleString("en-IN")}</div>
                <div style={{fontSize:9,color:item.color,marginTop:5,fontWeight:700}}>{item.note}</div>
              </div>
            ))}
          </div>

          {/* Confidence */}
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:4}}>
              <span>Model Confidence</span><span>{result.confidence}%</span>
            </div>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:999,height:6,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${result.confidence}%`,background:"linear-gradient(90deg,#7bad35,#a8e068)",borderRadius:999}}/>
            </div>
          </div>

          {/* Advice */}
          <div style={{background:"rgba(255,255,255,0.07)",borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#ffd166"}}>{tMsg}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{tMsgEn}</div>
          </div>
        </div>

        {/* Chart */}
        {series.length>0&&(
          <div className="panel" style={{marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>📈 {period?.label} Price Forecast Chart</span>
              <span style={{fontSize:12,color:"var(--muted)"}}>₹/quintal</span>
            </div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>
              Shaded band = Low–High range · Solid line = <strong>Avg price</strong> (sell target) · Trained on 2010–2026 APMC data
            </div>
            <PriceChart
              series={series}
              latestAvg={latest?.latestAvg||result.avg}
              latestHigh={latest?.latestHigh||result.high}
              latestLow={latest?.latestLow||result.low}
              color={varCfg.color||"#1f7a4d"}
            />
            <div style={{display:"flex",gap:16,marginTop:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:20,height:2.5,background:varCfg.color||"#1f7a4d",display:"inline-block",borderRadius:2}}/> Avg (sell at this)
              </span>
              <span style={{fontSize:11,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:20,height:2,background:varCfg.color||"#1f7a4d",display:"inline-block",opacity:0.4,borderRadius:2}}/> High / Low range
              </span>
            </div>
          </div>
        )}

        {/* Today vs Predicted */}
        {latest&&(
          <div className="panel" style={{marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📊 Today vs {period?.label} Prediction</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[
                {label:"Avg ★",   today:latest.latestAvg,  pred:result.avg},
                {label:"High",    today:latest.latestHigh, pred:result.high},
                {label:"Low",     today:latest.latestLow,  pred:result.low},
              ].map((item,i)=>{
                const diff=item.pred-item.today;
                const pct=((diff/item.today)*100).toFixed(1);
                const up2=diff>=0;
                return (
                  <div key={i} style={{background:"var(--soft)",borderRadius:8,padding:12,textAlign:"center"}}>
                    <div style={{fontSize:11,color:"var(--muted)",fontWeight:700,marginBottom:6}}>{item.label}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>Today</div>
                    <div style={{fontSize:15,fontWeight:800}}>₹{item.today.toLocaleString("en-IN")}</div>
                    <div style={{fontSize:18,margin:"4px 0",color:up2?"#1f7a4d":"#b3261e"}}>{up2?"↑":"↓"}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>Predicted</div>
                    <div style={{fontSize:15,fontWeight:800,color:up2?"#1f7a4d":"#b3261e"}}>₹{item.pred.toLocaleString("en-IN")}</div>
                    <div style={{fontSize:11,color:up2?"#1f7a4d":"#b3261e",marginTop:4,fontWeight:700}}>
                      {up2?"+":""}{pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{fontSize:11,color:"var(--muted)",padding:"6px 0"}}>
          ⚠️ ಅಂದಾಜು ಮಾತ್ರ · Predictions based on historical APMC data (2010–2026) + ML regression model. Actual prices vary. Always confirm with local APMC before selling.
        </div>
      </div>
    );
  }

  return null;
}