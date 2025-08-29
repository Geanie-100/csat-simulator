"use client";
import { useMemo, useState } from "react";
import type { Customer, Feature } from "@/lib/model";
import { predictOverall, computeWeights } from "@/lib/model";

const FEATS: Feature[] = ["Search","Export","Change management"];
const fmt = (x:number)=> (x*100).toFixed(1) + "%";
const pp = (x:number)=> (x*100).toFixed(2);

// Seed data (from your sheet)
const initialOverall: Record<Customer, number> = { AWS: 0.602, Lab: 0.816 };
const initialScores: Record<Customer, Record<Feature, number>> = {
  AWS: { Search: 0.674, Export: 0.562, "Change management": 0.644 },
  Lab: { Search: 0.740, Export: 0.724, "Change management": 0.803 },
};
const initialUsage: Record<Customer, Record<Feature, number>> = {
  AWS: { Search: 4722, Export: 253, "Change management": 2662 },
  Lab: { Search: 1289, Export: 181, "Change management": 2069 },
};

export default function Simulator(){
  const [alpha, setAlpha] = useState(1.0);
  const [deltas, setDeltas] = useState<Record<Customer, Record<Feature, number>>>({
    AWS: { Search: 0, Export: 0, "Change management": 0 },
    Lab: { Search: 0, Export: 0, "Change management": 0 },
  });

  const inputs = useMemo(()=> ({
    featureScores: initialScores,
    overall: initialOverall,
    usage: initialUsage,
    alpha
  }), [alpha]);

  const { weights, intercept, result } = useMemo(()=> predictOverall(inputs, deltas), [inputs, deltas]);
  const alphaLabel = `α (usage emphasis): ${alpha.toFixed(2)}`;

  const reset = ()=> setDeltas({ AWS:{Search:0, Export:0, "Change management":0}, Lab:{Search:0, Export:0, "Change management":0} });

  return (
    <div className="container">
      <div className="panel">
        <div className="h1">Townsend CSAT Driver Simulator</div>
        <div className="muted">Usage-aware feature weights with what‑if analysis for AWS and Lab. Move sliders to simulate feature changes; weights auto-calibrate so current overalls are matched.</div>

        <div className="row" style={{marginTop:16}}>
          <div className="col card">
            <div className="h2">Model controls</div>
            <div className="label">{alphaLabel}</div>
            <input className="slider" type="range" min="0" max="1.25" step="0.05" value={alpha} onChange={(e)=>setAlpha(parseFloat(e.target.value))} />
            <div className="small">0 = ignore usage · 1 = full usage · try 0.5 to dampen</div>
            <div style={{marginTop:12}}>
              <button className="btn" onClick={reset}>Reset sliders</button>
            </div>
          </div>

          <div className="col card">
            <div className="h2">Current overall</div>
            <div className="grid">
              <div><div className="label">AWS</div><div className="val">{fmt(initialOverall.AWS)}</div></div>
              <div><div className="label">Lab</div><div className="val">{fmt(initialOverall.Lab)}</div></div>
              <div><div className="label">Target</div><div className="val">75.0%</div></div>
            </div>
            <div style={{marginTop:10}} className="legend">
              <span className="dot dot-aws" /> <span className="small">AWS</span>
              <span className="dot dot-lab" /> <span className="small">Lab</span>
            </div>
          </div>
        </div>

        <div className="row" style={{marginTop:16}}>
          {(["AWS","Lab"] as Customer[]).map(cust => (
            <div className="col card" key={cust}>
              <div className="h2">{cust} – What‑if adjustments</div>
              {FEATS.map(f => {
                const curr = initialScores[cust][f];
                const d = deltas[cust][f];
                const newVal = Math.max(0, Math.min(1, curr + d));
                return (
                  <div key={f} style={{marginBottom:12}}>
                    <div className="label">{f} score: <span className="val">{fmt(newVal)}</span> <span className="small">(base {fmt(curr)})</span></div>
                    <input className="slider" type="range" min="-0.25" max="0.25" step="0.01"
                      value={d}
                      onChange={(e)=> setDeltas(s=> ({...s, [cust]:{...s[cust], [f]: parseFloat(e.target.value)}}))}
                    />
                  </div>
                );
              })}
              <div className="label">Predicted overall</div>
              <div className="bar"><div style={{width: (Math.max(0, Math.min(1, result[cust].pred))*100)+"%"}}/></div>
              <div className="small">Now: {fmt(result[cust].now)} · Pred: {fmt(result[cust].pred)} · Δ: {pp(result[cust].delta)} pp</div>
            </div>
          ))}
        </div>

        <div className="row" style={{marginTop:16}}>
          {(["AWS","Lab"] as Customer[]).map(cust => (
            <div className="col card" key={cust+"-weights"}>
              <div className="h2">{cust} – Usage‑adjusted weights</div>
              {FEATS.map(f => (
                <div key={f} style={{marginBottom:10}}>
                  <div className="label">{f}: <span className="val">{pp(weights[cust][f])}%</span></div>
                  <div className="bar"><div style={{width: (weights[cust][f]*100)+"%"}}/></div>
                </div>
              ))}
              <div className="small">Intercept b = {pp(intercept[cust])} (calibrates model so current overalls are matched)</div>
              <div className="small">Elasticity: +10 pts on feature → ~{pp(10*weights[cust]["Search"]/10)} to {pp(10*weights[cust]["Change management"]/10)} pp overall (feature × 0.10)</div>
            </div>
          ))}
        </div>

        <div className="row" style={{marginTop:16}}>
          <div className="col card">
            <div className="h2">Assumptions</div>
            <ul className="small">
              <li>Weights ∝ 1 / |feature − overall| × usageShare^α, normalized to sum to 1.</li>
              <li>Intercept aligns predictions with current overalls.</li>
              <li>Sliders adjust feature scores on a 0–1 scale (±25 pp bounds here for safety).</li>
              <li>This is an explanatory, usage-aware proxy model; not causal inference.</li>
            </ul>
          </div>
          <div className="col card">
            <div className="h2">Inputs (from survey)</div>
            <div className="grid">
              <div><span className="label">AWS Search</span><div className="val">{fmt(initialScores.AWS.Search)}</div></div>
              <div><span className="label">AWS Export</span><div className="val">{fmt(initialScores.AWS.Export)}</div></div>
              <div><span className="label">AWS Change</span><div className="val">{fmt(initialScores.AWS["Change management"])}</div></div>
              <div><span className="label">Lab Search</span><div className="val">{fmt(initialScores.Lab.Search)}</div></div>
              <div><span className="label">Lab Export</span><div className="val">{fmt(initialScores.Lab.Export)}</div></div>
              <div><span className="label">Lab Change</span><div className="val">{fmt(initialScores.Lab["Change management"])}</div></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
