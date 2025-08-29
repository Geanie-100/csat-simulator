export type Customer = "AWS" | "Lab";
export type Feature = "Search" | "Export" | "Change management";

export interface Inputs {
  featureScores: Record<Customer, Record<Feature, number>>; // 0..1
  overall: Record<Customer, number>; // 0..1
  usage: Record<Customer, Record<Feature, number>>; // raw counts
  alpha: number; // usage emphasis
}

export interface WeightsOut {
  weights: Record<Customer, Record<Feature, number>>;
  intercept: Record<Customer, number>;
}

const FEATS: Feature[] = ["Search","Export","Change management"];

export function usageShares(usage: Record<Customer, Record<Feature, number>>) {
  const shares: Record<Customer, Record<Feature, number>> = { AWS: {Search:0, Export:0, "Change management":0}, Lab:{Search:0, Export:0, "Change management":0}};
  (Object.keys(usage) as Customer[]).forEach(c => {
    const total = FEATS.map(f=>usage[c][f]).reduce((a,b)=>a+b,0) || 1;
    FEATS.forEach(f => shares[c][f] = usage[c][f] / total);
  });
  return shares;
}

export function computeWeights(inputs: Inputs): WeightsOut {
  const { featureScores, overall, usage, alpha } = inputs;
  const shares = usageShares(usage);
  const eps = 1e-6;
  const weights: WeightsOut["weights"] = { AWS: {Search:0, Export:0, "Change management":0}, Lab:{Search:0, Export:0, "Change management":0}};
  const intercept: WeightsOut["intercept"] = { AWS: 0, Lab: 0 };

  (Object.keys(overall) as Customer[]).forEach(c => {
    const prox = FEATS.map(f => 1 / (Math.abs(featureScores[c][f] - overall[c]) + eps));
    const raw = FEATS.map((f,i) => prox[i] * Math.pow(shares[c][f], alpha));
    const sum = raw.reduce((a,b)=>a+b,0) || 1;
    FEATS.forEach((f,i)=> weights[c][f] = raw[i] / sum);
    const pred = FEATS.map(f=>weights[c][f]*featureScores[c][f]).reduce((a,b)=>a+b,0);
    intercept[c] = overall[c] - pred;
  });

  return { weights, intercept };
}

export function predictOverall(inputs: Inputs, deltas?: Record<Customer, Partial<Record<Feature, number>>>) {
  const { featureScores, alpha, usage, overall } = inputs;
  const { weights, intercept } = computeWeights(inputs);
  const out: Record<Customer, { now: number; pred: number; delta: number }> = { AWS: { now: overall.AWS, pred: 0, delta: 0 }, Lab: { now: overall.Lab, pred: 0, delta: 0 } };

  (Object.keys(overall) as Customer[]).forEach(c => {
    const fs: Record<Feature, number> = { ...featureScores[c] } as any;
    if (deltas && deltas[c]) {
      (Object.keys(deltas[c]) as Feature[]).forEach(f => {
        const v = (fs[f] ?? 0) + (deltas[c]![f] ?? 0);
        fs[f] = Math.max(0, Math.min(1, v));
      });
    }
    const pred = intercept[c] + (["Search","Export","Change management"] as Feature[]).map(f=>weights[c][f]*fs[f]).reduce((a,b)=>a+b,0);
    out[c].pred = pred;
    out[c].delta = pred - out[c].now;
  });
  return { weights, intercept, result: out };
}
