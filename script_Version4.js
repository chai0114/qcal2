// Queuing calculator with plotting (Chart.js)
// Supports M/M/1 and M/M/c (Erlang C)

const el = id => document.getElementById(id);

function factorial(n){
  if (n < 0) return NaN;
  if (n === 0) return 1;
  let f = 1;
  for(let i=1;i<=n;i++) f *= i;
  return f;
}

function mm1(lambda, mu){
  const rho = lambda / mu;
  if (rho >= 1) return { error: "System unstable (ρ >= 1)" };
  const Lq = (rho * rho) / (1 - rho);
  const L = rho / (1 - rho);
  const Wq = Lq / lambda;
  const W = 1 / (mu - lambda);
  return { model: "M/M/1", lambda, mu, rho, Lq, L, Wq, W };
}

function mmc(lambda, mu, c){
  if (c < 1) return { error: "c must be >= 1" };
  const r = lambda / mu;
  const rho = r / c;
  if (rho >= 1) return { error: "System unstable (ρ >= 1)" };

  // compute p0
  let sum = 0;
  for (let n = 0; n <= c - 1; n++){
    sum += Math.pow(r, n) / factorial(n);
  }
  const last = Math.pow(r, c) / (factorial(c) * (1 - rho));
  const p0 = 1 / (sum + last);

  const Pw = last * p0; // probability a job waits
  const Lq = (Math.pow(r, c) * rho) / (factorial(c) * Math.pow(1 - rho, 2)) * p0;
  const L = Lq + r;
  const Wq = Lq / lambda;
  const W = Wq + 1 / mu;

  return { model: `M/M/${c}`, lambda, mu, c, r, rho, p0, Pw, Lq, L, Wq, W };
}

function pretty(x){
  if (x === undefined) return '-';
  if (typeof x === 'number') return Number.isFinite(x) ? x.toFixed(6) : String(x);
  return String(x);
}

function showResult(obj){
  const out = [];
  if (obj.error){
    out.push("Error: " + obj.error);
  } else {
    out.push(`Model: ${obj.model}`);
    out.push(`λ (arrival rate): ${obj.lambda}`);
    out.push(`μ (service rate): ${obj.mu}`);
    if (obj.c) out.push(`servers c: ${obj.c}`);
    if (obj.r !== undefined) out.push(`r = λ/μ: ${pretty(obj.r)}`);
    out.push(`ρ (utilization): ${pretty(obj.rho)}`);
    if (obj.p0 !== undefined) out.push(`p0 (idle prob): ${pretty(obj.p0)}`);
    if (obj.Pw !== undefined) out.push(`Pw (prob. must wait): ${pretty(obj.Pw)}`);
    out.push(`Lq (avg # in queue): ${pretty(obj.Lq)}`);
    out.push(`L (avg # in system): ${pretty(obj.L)}`);
    out.push(`Wq (avg waiting time): ${pretty(obj.Wq)}`);
    out.push(`W (avg time in system): ${pretty(obj.W)}`);
  }
  el('out').textContent = out.join('\n');
  return obj;
}

function resultsToCSV(obj){
  if (obj.error) return 'error,' + obj.error;
  const rows = [
    ['model', obj.model],
    ['lambda', obj.lambda],
    ['mu', obj.mu]
  ];
  if (obj.c !== undefined) rows.push(['servers', obj.c]);
  if (obj.r !== undefined) rows.push(['r', obj.r]);
  rows.push(['rho', obj.rho]);
  if (obj.p0 !== undefined) rows.push(['p0', obj.p0]);
  if (obj.Pw !== undefined) rows.push(['Pw', obj.Pw]);
  rows.push(['Lq', obj.Lq]);
  rows.push(['L', obj.L]);
  rows.push(['Wq', obj.Wq]);
  rows.push(['W', obj.W]);
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
}

function copyResults(){
  const text = el('out').textContent;
  if (!navigator.clipboard){
    alert('Clipboard API not available. Select and copy manually.');
    return;
  }
  navigator.clipboard.writeText(text).then(
    ()=> alert('Results copied to clipboard'),
    ()=> alert('Copy failed — select and copy manually')
  );
}

function downloadCSV(content, filename){
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* Charting */
let chart = null;

function createChart(labels, data, metricLabel){
  const ctx = document.getElementById('chart').getContext('2d');

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metricLabel,
        data,
        spanGaps: false,
        borderColor: '#0366d6',
        backgroundColor: 'rgba(3,102,214,0.08)',
        pointRadius: 0.9,
        borderWidth: 1.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'λ (arrival rate)' },
          ticks: { maxRotation: 0 }
        },
        y: {
          title: { display: true, text: metricLabel },
          beginAtZero: true,
          suggestedMin: 0
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context){
              const v = context.raw;
              if (v === null) return 'unstable';
              return `${context.dataset.label}: ${Number.isFinite(v) ? v.toFixed(6) : v}`;
            }
          }
        }
      }
    }
  });
}

function computeMetricForLambda(metric, model, lambda, mu, c){
  if (model === 'mm1'){
    const res = mm1(lambda, mu);
    if (res.error) return null;
    return res[metric];
  } else {
    const res = mmc(lambda, mu, c);
    if (res.error) return null;
    return res[metric];
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const model = el('model');
  const serversLabel = el('servers-label');

  model.addEventListener('change', ()=>{
    if (model.value === 'mmc') serversLabel.style.display = 'block';
    else serversLabel.style.display = 'none';
  });

  el('compute').addEventListener('click', ()=>{
    const lambda = parseFloat(el('lambda').value);
    const mu = parseFloat(el('mu').value);
    if (isNaN(lambda) || isNaN(mu) || lambda < 0 || mu <= 0){
      el('out').textContent = 'Please enter valid λ (>=0) and μ (>0).';
      return;
    }
    let result;
    if (model.value === 'mm1'){
      result = mm1(lambda, mu);
    } else {
      const c = parseInt(el('servers').value, 10) || 1;
      result = mmc(lambda, mu, c);
    }
    showResult(result);
  });

  el('example').addEventListener('click', ()=>{
    model.value = 'mmc';
    el('lambda').value = 5;
    el('mu').value = 3;
    el('servers').value = 3;
    el('servers-label').style.display = 'block';
  });

  el('copy').addEventListener('click', copyResults);

  el('export-csv').addEventListener('click', ()=>{
    const outText = el('out').textContent;
    if (!outText || outText.startsWith('No results')) { alert('Compute results first.'); return; }
    const lambda = parseFloat(el('lambda').value);
    const mu = parseFloat(el('mu').value);
    let result;
    if (model.value === 'mm1') result = mm1(lambda, mu);
    else result = mmc(lambda, mu, parseInt(el('servers').value, 10) || 1);

    const csv = resultsToCSV(result);
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    downloadCSV(csv, `queue-results-${ts}.csv`);
  });

  el('plot').addEventListener('click', ()=>{
    const metric = el('metric').value;
    const lambdaMax = parseFloat(el('lambda-max').value);
    const points = parseInt(el('points').value, 10) || 100;
    const mu = parseFloat(el('mu').value);
    const modelVal = model.value;
    const c = parseInt(el('servers').value, 10) || 1;

    if (isNaN(lambdaMax) || lambdaMax <= 0){
      alert('Enter a valid λ range max (>0).');
      return;
    }
    if (isNaN(mu) || mu <= 0){
      alert('Enter a valid μ (>0) for the plot.');
      return;
    }
    if (modelVal === 'mmc' && (!Number.isInteger(c) || c < 1)){
      alert('Enter a valid number of servers c (>=1).');
      return;
    }

    const labels = [];
    const data = [];
    const minLambda = 1e-6;
    for (let i = 0; i < points; i++){
      const lambda = minLambda + (lambdaMax - minLambda) * (i / (points - 1));
      labels.push(Number(lambda.toFixed(6)));
      const value = computeMetricForLambda(metric, modelVal, lambda, mu, c);
      data.push(value === null ? null : Number(value));
    }

    const metricLabel = (document.querySelector('#metric option:checked').textContent) || metric;
    createChart(labels, data, metricLabel);
  });

  el('clear-plot').addEventListener('click', ()=>{
    if (chart) chart.destroy();
    chart = null;
    const ctx = document.getElementById('chart').getContext('2d');
    ctx.clearRect(0,0,document.getElementById('chart').width, document.getElementById('chart').height);
  });
});