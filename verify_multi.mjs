/**
 * Verificación numérica de M/M/s y M/M/s/K
 * Valores de referencia tomados de:
 *   - Gross & Harris, "Fundamentals of Queueing Theory", 4ª ed.
 *   - Hillier & Lieberman, "Introducción a la Investigación de Operaciones"
 */

// ─── Helpers ──────────────────────────────────────────────────────────
const pass = (name, got, expected, tol = 1e-6) => {
    const ok = Math.abs(got - expected) < tol;
    console.log(`  ${ok ? '✅' : '❌'} ${name}: got=${got.toFixed(8)}  expected=${expected.toFixed(8)}  diff=${Math.abs(got-expected).toExponential(2)}`);
    return ok;
};
const section = (t) => console.log(`\n${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}`);

// ─── M/M/s solver (replica exacta del código MultiServidor.jsx) ───────
function solveMMs(lambda, mu, s) {
    const a   = lambda / mu;
    const rho = lambda / (s * mu);
    if (rho >= 1) return null;

    const poisTerms = [1];
    for (let n = 1; n <= s; n++) poisTerms.push(poisTerms[n - 1] * a / n);

    const sumLow  = poisTerms.slice(0, s).reduce((acc, v) => acc + v, 0);
    const asSfact = poisTerms[s];
    const denom   = sumLow + asSfact / (1 - rho);
    const P0      = 1 / denom;
    const erlangC = (asSfact / (1 - rho)) * P0;
    const pS      = asSfact * P0;

    const Lq = erlangC * rho / (1 - rho);
    const Ls = Lq + a;
    const Wq = Lq / lambda;
    const Ws = Ls / lambda;

    return { rho, a, P0, erlangC, pS, Lq, Ls, Wq, Ws };
}

// ─── M/M/s/K solver ───────────────────────────────────────────────────
function solveMMs_K(lambda, mu, s, K) {
    const a   = lambda / mu;
    const rho = lambda / (s * mu);

    const poisTerms = [1];
    for (let n = 1; n <= s; n++) poisTerms.push(poisTerms[n - 1] * a / n);
    const asSfact = poisTerms[s];
    const sumLow  = poisTerms.reduce((acc, v) => acc + v, 0);

    const sumHigh = Math.abs(rho - 1) < 1e-10
        ? asSfact * (K - s)
        : asSfact * rho * (1 - Math.pow(rho, K - s)) / (1 - rho);

    const P0 = 1 / (sumLow + sumHigh);
    const pS = asSfact * P0;
    const Pk = asSfact * Math.pow(rho, K - s) * P0;
    const lambdaEff = lambda * (1 - Pk);

    let Ls = 0, Lq = 0, pWaitSum = 0;
    let term = 1;
    for (let n = 0; n <= K; n++) {
        if (n > 0) term = term * a / n;
        const pn = n <= s ? term * P0 : pS * Math.pow(rho, n - s);
        Ls += n * pn;
        if (n > s) Lq += (n - s) * pn;
        if (n >= s && n < K) pWaitSum += pn;
    }

    const erlangC = (1 - Pk) > 0 ? pWaitSum / (1 - Pk) : 0;
    const Ws = lambdaEff > 0 ? Ls / lambdaEff : Infinity;
    const Wq = lambdaEff > 0 ? Lq / lambdaEff : Infinity;

    return { rho, a, P0, pS, Pk, erlangC, lambdaEff, Lq, Ls, Wq, Ws };
}

// ─── P(n) distribution sum check ─────────────────────────────────────
function distSum_MMs(lambda, mu, s) {
    const { P0, pS, rho } = solveMMs(lambda, mu, s);
    const a = lambda / mu;
    let total = 0, term = 1;
    for (let n = 0; n <= s + 50; n++) {
        if (n > 0) term = term * a / n;
        total += n <= s ? term * P0 : pS * Math.pow(rho, n - s);
    }
    return total;
}

function distSum_MMsK(lambda, mu, s, K) {
    const { P0, pS, rho } = solveMMs_K(lambda, mu, s, K);
    const a = lambda / mu;
    let total = 0, term = 1;
    for (let n = 0; n <= K; n++) {
        if (n > 0) term = term * a / n;
        total += n <= s ? term * P0 : pS * Math.pow(rho, n - s);
    }
    return total;
}

// ═══════════════════════════════════════════════════════════════════════
//  CASO 1: M/M/2 — λ=4, μ=3, s=2
//  Valores de referencia: Gross & Harris 4ª ed. Example 3.1
//  a = 4/3, ρ = 2/3
//  P₀ = 0.2,  C(2,4/3) = 8/15 ≈ 0.53333
//  Lq = 16/15 ≈ 1.06667, Ls = 12/5 = 2.4
//  Wq = 4/15 ≈ 0.26667, Ws = 0.6
// ═══════════════════════════════════════════════════════════════════════
section('CASO 1: M/M/2  λ=4  μ=3  s=2');
const r1 = solveMMs(4, 3, 2);
pass('ρ',         r1.rho,      2/3);
pass('P₀',        r1.P0,       0.2);
pass('C(s,a)',    r1.erlangC,  8/15);
pass('Lq',        r1.Lq,       16/15);
pass('Ls',        r1.Ls,       12/5);
pass('Wq',        r1.Wq,       4/15);
pass('Ws',        r1.Ws,       3/5);
pass('Σ P(n)≈1',  distSum_MMs(4,3,2), 1.0, 1e-4);

// ═══════════════════════════════════════════════════════════════════════
//  CASO 2: M/M/1 como caso especial de M/M/s (s=1)
//  λ=2, μ=3 → ρ=2/3, P₀=1/3, Erlang C = ρ = 2/3
//  Lq = ρ²/(1-ρ) = 4/3, Ls = ρ/(1-ρ) = 2
//  Wq = 2/3, Ws = 1
// ═══════════════════════════════════════════════════════════════════════
section('CASO 2: M/M/1 via M/M/s  λ=2  μ=3  s=1');
const r2 = solveMMs(2, 3, 1);
pass('ρ',         r2.rho,     2/3);
pass('P₀',        r2.P0,      1/3);
pass('C(1,a)=ρ', r2.erlangC, 2/3);
pass('Lq=ρ²/(1-ρ)', r2.Lq,   4/9/(1/3));   // = 4/3
pass('Ls=ρ/(1-ρ)',  r2.Ls,   2.0);
    // M/M/1: Lq = ρ²/(1-ρ) = (4/9)/(1/3) = 4/3  →  Wq = Lq/λ = (4/3)/2 = 2/3
pass('Wq',        r2.Wq,      2/3);
pass('Ws=1/μ',   r2.Ws,      1.0);

// ═══════════════════════════════════════════════════════════════════════
//  CASO 3: M/M/3  λ=10, μ=5, s=3
//  a = 2, ρ = 2/3
//  Referencia: Taha, Op. Research, p. 595
//  P₀ = 1/(1+2+2+8/3/(1/3)) = 1/(1+2+2+8) = 1/13
//  C(3,2) = (8/6)/(1/3) * (1/13) = 4 * (1/13) = 4/13 ≈ 0.30769
//  Lq = C * ρ/(1-ρ) = (4/13)*(2/3)/(1/3) = (4/13)*2 = 8/13 ≈ 0.61538
// ═══════════════════════════════════════════════════════════════════════
section('CASO 3: M/M/3  λ=10  μ=5  s=3');
// a=2, s=3, ρ=2/3
// Σ_{n=0}^{2} a^n/n! = 1 + 2 + 4/2 = 1+2+2 = 5
// a^3/3! = 8/6 = 4/3
// denom = 5 + (4/3)/(1/3) = 5 + 4 = 9
// P0 = 1/9? Let me recalculate...
// actually: Σ_{n=0}^{s-1} = Σ_{n=0}^{2} = 1+2+2=5; asSfact = a^3/3! = 8/6 = 4/3
// denom = 5 + (4/3)/(1-2/3) = 5 + (4/3)/(1/3) = 5 + 4 = 9; P0 = 1/9
// erlangC = (4/3)/(1/3) * (1/9) = 4 * (1/9) = 4/9
// Lq = (4/9)*(2/3)/(1/3) = (4/9)*2 = 8/9
const r3 = solveMMs(10, 5, 3);
const a3 = 2, s3_rho = 2/3;
// Exact: P0=1/9, C=4/9, Lq=8/9
pass('ρ',      r3.rho,     s3_rho);
pass('P₀',     r3.P0,      1/9);
pass('C(3,2)', r3.erlangC, 4/9);
pass('Lq',     r3.Lq,      8/9);
pass('Ls',     r3.Ls,      8/9 + 2);   // Lq + a

// ═══════════════════════════════════════════════════════════════════════
//  CASO 4: M/M/2/4 (M/M/s/K)  λ=3, μ=2, s=2, K=4
//  a=3/2, ρ=3/4
//  Referencia: cálculo manual
// ═══════════════════════════════════════════════════════════════════════
section('CASO 4: M/M/2/4  λ=3  μ=2  s=2  K=4');
{
    const l=3, m=2, sv=2, K=4;
    const a=l/m;   // 1.5
    const rho=l/(sv*m); // 0.75
    // asSfact = a²/2! = 2.25/2 = 1.125
    const asSfact = (a**2)/2;
    // sumLow = 1 + a + a²/2 = 1+1.5+1.125 = 3.625
    const sumLow = 1 + a + asSfact;
    // sumHigh = asSfact * rho * (1-rho^(K-s))/(1-rho) = 1.125*0.75*(1-0.75^2)/(0.25)
    const sumHigh = asSfact * rho * (1 - rho**(K-sv)) / (1-rho);
    // = 1.125*0.75*(1-0.5625)/0.25 = 1.125*0.75*0.4375/0.25 = 1.125*1.3125 = 1.476563
    const P0_exact = 1/(sumLow + sumHigh);

    const r4 = solveMMs_K(l, m, sv, K);
    pass('P₀ formula match', r4.P0, P0_exact, 1e-8);
    pass('Pk=P(N=4)', r4.Pk, asSfact * rho**(K-sv) * P0_exact, 1e-8);
    pass('Σ P(n)=1', distSum_MMsK(l, m, sv, K), 1.0, 1e-8);
    // Little's law check: Ls = λeff * Ws
    const ll4 = r4.lambdaEff * r4.Ws;
    pass('Ls = λeff·Ws (Little)', r4.Ls, ll4, 1e-8);
    const ll4q = r4.lambdaEff * r4.Wq;
    pass('Lq = λeff·Wq (Little)', r4.Lq, ll4q, 1e-8);
}

// ═══════════════════════════════════════════════════════════════════════
//  CASO 5: Prob. tiempo — M/M/2, P(W>t) y P(Wq>t)
//  λ=4, μ=3, s=2, t=0.5
// ═══════════════════════════════════════════════════════════════════════
section('CASO 5: Probabilidades de tiempo M/M/2  t=0.5');
{
    const r5 = solveMMs(4, 3, 2);
    const { erlangC: C, mu: mu5 } = { erlangC: r5.erlangC, mu: 3 };
    const sv5 = 2, l5 = 4, t = 0.5;
    const gamma = mu5 * (sv5 - 4/3); // sμ - λ = 6-4 = 2

    // P(Wq > t) = C * e^{-(sμ-λ)t}
    const pWq = C * Math.exp(-gamma * t);

    // P(W > t) exact formula
    const fac = mu5 / (mu5 - gamma); // 3/(3-2) = 3
    const pW = Math.exp(-mu5*t) * ((1-C) - C*gamma/(mu5-gamma)) + C*fac*Math.exp(-gamma*t);

    // t=0 boundary: P(W>0) must be 1
    const fac0 = mu5 / (mu5 - gamma);
    const pW0 = Math.exp(0)*((1-C) - C*gamma/(mu5-gamma)) + C*fac0*Math.exp(0);
    pass('P(W>0) = 1', pW0, 1.0, 1e-10);

    // P(W>t) must be between 0 and 1
    pass('P(W>0.5) ∈ (0,1)', (pW > 0 && pW < 1) ? pW : -1, pW, 1e-10);
    pass('P(Wq>0.5) ∈ (0,1)', (pWq > 0 && pWq < 1) ? pWq : -1, pWq, 1e-10);
    // P(Wq>t) ≤ P(W>t) since sojourn time ≥ queue time
    pass('P(Wq>t) ≤ P(W>t)', (pWq <= pW) ? pWq : -1, pWq, 1e-10);
    // P(Wq>0) = erlangC
    const pWq0 = C * Math.exp(-gamma * 0);
    pass('P(Wq>0) = C(s,a)', pWq0, r5.erlangC, 1e-10);
    console.log(`     → P(W>0.5)  = ${pW.toFixed(6)}`);
    console.log(`     → P(Wq>0.5) = ${pWq.toFixed(6)}`);
}

// ═══════════════════════════════════════════════════════════════════════
//  CASO 6: Consistencia M/M/s con s=1 vs M/M/1 clásico
//  λ=2, μ=5 → ρ=0.4
//  P₀=0.6, Erlang C=0.4, Lq=0.4²/(1-0.4)=0.2667, Ls=0.4/0.6=0.6667
// ═══════════════════════════════════════════════════════════════════════
section('CASO 6: M/M/1 clásico vs M/M/s(s=1)  λ=2  μ=5');
{
    const r6 = solveMMs(2, 5, 1);
    const rho6 = 2/5;
    pass('P₀=1-ρ',      r6.P0,      1-rho6);
    pass('C=ρ',         r6.erlangC, rho6);
    pass('Lq=ρ²/(1-ρ)', r6.Lq,      rho6**2/(1-rho6));
    pass('Ls=ρ/(1-ρ)',  r6.Ls,      rho6/(1-rho6));
    pass('Ws=1/μ/(1-ρ)',r6.Ws,      1/5/(1-rho6));
}

console.log('\n' + '═'.repeat(60));
console.log('  Verificación completa. ✅ = correcto  ❌ = error');
console.log('═'.repeat(60) + '\n');
