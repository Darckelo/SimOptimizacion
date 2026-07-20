import React, { useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import {
    BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Settings, Users, Ruler, BarChart2, TrendingUp, Compass,
    Infinity as InfinityIcon, Hash, Server,
} from 'lucide-react';
import TourOverlay from '@/Components/TourOverlay';
import CustomTooltip from '@/Components/CustomTooltip';
import useSectionNav from '@/hooks/useSectionNav';
import { buildFormStyles } from '@/theme/formStyles';
import { DARK_BASE, LIGHT_BASE } from '@/theme/palettes';

// ─── Paletas de tema (base compartida + extras propios de este módulo) ─
const DARK_C = {
    ...DARK_BASE,
    labelText: '#ffffff', infoBoxText: '#ffffff',
    tabInactiveBg: 'rgba(30,41,59,0.6)', tabInactiveText: '#94a3b8',
};
const LIGHT_C = {
    ...LIGHT_BASE,
    labelText: '#1e293b', infoBoxText: '#1e293b',
    tabInactiveBg: 'rgba(241,245,249,0.8)',
};

const fmt = (n, d = 6) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(d) : '—';

const SUB_NAV_DEF = [
    { id: 'config',  Icon: Settings,  label: 'Configuración'    },
    { id: 'results', Icon: Users,     label: 'Resultados'       },
    { id: 'prob',    Icon: Hash,      label: 'Probabilidades'   },
    { id: 'dist',    Icon: Ruler,     label: 'Distribución P(n)'},
    { id: 'charts',  Icon: BarChart2, label: 'Gráficas'         },
];

const TOUR_STEPS_MULTI = [
    {
        targetId: 'sec-config', sectionName: 'Configuración', Icon: Settings, accentColor: '#6366f1',
        what: 'Ingresa los parámetros del sistema: λ (llegadas), μ (servicio por servidor), s (número de servidores) y, si aplica, la capacidad máxima K.',
        dos: [
            'Usa M/M/s para sistemas con cola infinita y varios servidores en paralelo.',
            'Usa M/M/s/K para capacidad máxima fija K ≥ s.',
            'Verifica que ρ = λ/(s·μ) < 1 en M/M/s para estabilidad del sistema.',
        ],
        donts: [
            'No ingreses s = 0 — mínimo 1 servidor.',
            'En M/M/s no dejes ρ ≥ 1 — el sistema sería inestable.',
            'En M/M/s/K no uses K < s — debe haber al menos un espacio por servidor.',
        ],
    },
    {
        targetId: 'sec-results', sectionName: 'Resultados', Icon: TrendingUp, accentColor: '#10b981',
        what: 'Muestra todas las métricas del sistema: utilización por servidor, Erlang C, P₀, Ls, Lq, Ws, Wq y métricas adicionales para M/M/s/K.',
        dos: [
            'Lee C(s,a) — Erlang C — para saber la probabilidad de que un cliente tenga que esperar.',
            'Usa Ls/Lq para el número promedio de clientes en sistema/cola.',
            'Usa Ws/Wq para tiempos promedio de permanencia.',
        ],
        donts: [
            'No confundas ρ (utilización por servidor) con a = λ/μ (carga ofrecida total).',
            'No uses resultados de M/M/s cuando ρ ≥ 1.',
        ],
    },
    {
        targetId: 'sec-prob', sectionName: 'Probabilidades', Icon: Hash, accentColor: '#f59e0b',
        what: 'Calcula probabilidades específicas de tiempo de espera P(W > t), P(WQ > t) y de número de clientes P(N = n), P(N > n).',
        dos: [
            'Usa "Espera (t)" para calcular la fracción de clientes que esperan más de t tiempo.',
            'Usa "Clientes (n)" para ver la probabilidad de cada estado del sistema.',
            'Asegúrate de usar las mismas unidades de tiempo que para λ y μ.',
        ],
        donts: [
            'Para M/M/s/K, las probabilidades de tiempo son aproximadas numéricamente.',
        ],
    },
    {
        targetId: 'sec-dist', sectionName: 'Distribución P(n)', Icon: Ruler, accentColor: '#f59e0b',
        what: 'Tabla con la probabilidad P(n) de que haya exactamente n clientes en el sistema y la distribución acumulada.',
        dos: [
            'Las primeras s filas (n = 0..s) muestran estados con servidores disponibles.',
            'Para n > s, todos los servidores están ocupados y hay cola de espera.',
        ],
        donts: [
            'No esperes P(n) para n > K en M/M/s/K — esos estados no existen.',
        ],
    },
    {
        targetId: 'sec-charts', sectionName: 'Gráficas', Icon: BarChart2, accentColor: '#8b5cf6',
        what: 'Visualiza la distribución P(n) y la CDF acumulada de forma interactiva.',
        dos: [
            'Observa el quiebre visual en n = s — desde ese punto todos los servidores están ocupados.',
            'Pasa el cursor sobre las barras para ver los valores exactos.',
        ],
        donts: [
            'No interpretes la altura directamente como porcentaje — es una probabilidad (0 a 1).',
        ],
    },
];

// ═══════════════════════════════════════════════════════════════════════
// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
export default function MultiServidor() {
    const { isDark } = useTheme();
    const C = isDark ? DARK_C : LIGHT_C;

    const { cardStyle, labelStyle, inputStyle } = buildFormStyles(C);

    // ── State ─────────────────────────────────────────────────────────
    const [tipo, setTipo]         = useState('sinlimite'); // 'sinlimite' M/M/s | 'conlimite' M/M/s/K
    const [lambda, setLambda]     = useState('4');
    const [mu, setMu]             = useState('3');
    const [sServ, setSServ]       = useState('2');
    const [K, setK]               = useState('8');
    const { activeSection, subNav } = useSectionNav(SUB_NAV_DEF, 'config');
    const [showTour, setShowTour] = useState(false);
    const [probTab, setProbTab]   = useState('espera');
    const [tProb, setTProb]       = useState('1');
    const [nProb, setNProb]       = useState('3');

    const l  = parseFloat(lambda);
    const m  = parseFloat(mu);
    const sv = parseInt(sServ, 10);
    const k  = parseInt(K, 10);

    // ── Validaciones ──────────────────────────────────────────────────
    const validBase      = !isNaN(l) && l > 0 && !isNaN(m) && m > 0 && !isNaN(sv) && sv >= 1;
    const a              = validBase ? l / m : NaN;           // carga ofrecida = λ/μ
    const rho            = validBase ? l / (sv * m) : NaN;    // utilización por servidor = λ/(s·μ)
    const validSinLimite = validBase && isFinite(rho) && rho < 1;
    const validConLimite = validBase && !isNaN(k) && k >= sv;
    const isValid        = tipo === 'sinlimite' ? validSinLimite : validConLimite;

    // ═══════════════════════════════════════════════════════════════════
    // ─── CÁLCULOS M/M/s (Sin Límite) ─────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    const resultadosSinLimite = useMemo(() => {
        if (!validSinLimite) return null;

        // Construir términos de Poisson: poisTerms[n] = a^n/n!
        const poisTerms = [1];
        for (let n = 1; n <= sv; n++) poisTerms.push(poisTerms[n - 1] * a / n);

        // Σ_{n=0}^{s-1} a^n/n!
        const sumLow  = poisTerms.slice(0, sv).reduce((acc, v) => acc + v, 0);
        const asSfact = poisTerms[sv]; // a^s / s!

        const denom   = sumLow + asSfact / (1 - rho);
        const P0      = 1 / denom;
        const erlangC = (asSfact / (1 - rho)) * P0; // Erlang C = C(s,a)
        const pS      = asSfact * P0;                // P(N = s)

        const Lq = erlangC * rho / (1 - rho);
        const Ls = Lq + a;
        const Wq = l > 0 ? Lq / l : 0;
        const Ws = l > 0 ? Ls / l : 0;

        return { rho, a, mu: m, s: sv, P0, erlangC, pS, asSfact, Lq, Ls, Wq, Ws };
    }, [l, m, sv, a, rho, validSinLimite]);

    // Distribución P(n) para M/M/s
    const distSinLimite = useMemo(() => {
        if (!validSinLimite || !resultadosSinLimite) return [];
        const { P0, pS } = resultadosSinLimite;
        const maxN = Math.min(Math.max(sv + 20, 25), 60);
        let acum = 0, term = 1;
        return Array.from({ length: maxN + 1 }, (_, n) => {
            if (n > 0) term = term * a / n;
            const pn = n <= sv ? term * P0 : pS * Math.pow(rho, n - sv);
            acum += pn;
            return { n, pn, acum };
        });
    }, [a, rho, sv, validSinLimite, resultadosSinLimite]);

    // ═══════════════════════════════════════════════════════════════════
    // ─── CÁLCULOS M/M/s/K (Con Límite) ───────────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    const resultadosConLimite = useMemo(() => {
        if (!validConLimite) return null;

        // Términos de Poisson hasta s
        const poisTerms = [1];
        for (let n = 1; n <= sv; n++) poisTerms.push(poisTerms[n - 1] * a / n);
        const asSfact = poisTerms[sv]; // a^s/s!

        // Σ_{n=0}^{s} a^n/n!
        const sumLow = poisTerms.reduce((acc, v) => acc + v, 0);

        // Σ_{n=s+1}^{K} a^s/s! · ρ^(n-s) = asSfact · ρ · (1 - ρ^(K-s)) / (1 - ρ)
        let sumHigh;
        if (Math.abs(rho - 1) < 1e-10) {
            sumHigh = asSfact * (k - sv);
        } else {
            sumHigh = asSfact * rho * (1 - Math.pow(rho, k - sv)) / (1 - rho);
        }

        const P0 = 1 / (sumLow + sumHigh);
        const pS = asSfact * P0;
        const Pk = asSfact * Math.pow(rho, k - sv) * P0; // P(N=K) — bloqueo
        const lambdaEff     = l * (1 - Pk);
        const lambdaPerdida = l * Pk;

        // Ls, Lq y P(esperar) calculados numéricamente
        let Ls = 0, Lq = 0, pWaitSum = 0;
        let term = 1;
        for (let n = 0; n <= k; n++) {
            if (n > 0) term = term * a / n;
            const pn = n <= sv ? term * P0 : pS * Math.pow(rho, n - sv);
            Ls += n * pn;
            if (n > sv) Lq += (n - sv) * pn;
            if (n >= sv && n < k) pWaitSum += pn;
        }

        const erlangC = (1 - Pk) > 0 ? pWaitSum / (1 - Pk) : 0; // P(esperar | admitido)
        const Ws = lambdaEff > 0 ? Ls / lambdaEff : Infinity;
        const Wq = lambdaEff > 0 ? Lq / lambdaEff : Infinity;

        return { rho, a, mu: m, s: sv, K: k, P0, pS, Pk, erlangC, lambdaEff, lambdaPerdida, Lq, Ls, Wq, Ws };
    }, [l, m, sv, k, a, rho, validConLimite]);

    // Distribución P(n) para M/M/s/K
    const distConLimite = useMemo(() => {
        if (!validConLimite || !resultadosConLimite) return [];
        const { P0, pS } = resultadosConLimite;
        let acum = 0, term = 1;
        return Array.from({ length: k + 1 }, (_, n) => {
            if (n > 0) term = term * a / n;
            const pn = n <= sv ? term * P0 : pS * Math.pow(rho, n - sv);
            acum += pn;
            return { n, pn, acum };
        });
    }, [a, rho, sv, k, validConLimite, resultadosConLimite]);

    const resultados = tipo === 'sinlimite' ? resultadosSinLimite : resultadosConLimite;
    const dist       = tipo === 'sinlimite' ? distSinLimite : distConLimite;

    // ── Métricas para mostrar ─────────────────────────────────────────
    const metricas = useMemo(() => {
        if (!resultados) return [];
        const base = [
            { symbol: 'ρ',  label: 'Utilización por servidor', value: fmt(resultados.rho, 4),   color: C.accent,  sub: 'λ / (s·μ)' },
            { symbol: 'a',  label: 'Carga ofrecida total',     value: fmt(resultados.a, 4),     color: C.accent2, sub: 'λ / μ' },
            { symbol: 'P₀', label: 'Sistema vacío',            value: fmt(resultados.P0),       color: C.green,   sub: 'Prob. 0 clientes' },
            { symbol: 'C',  label: 'Erlang C — P(esperar)',    value: fmt(resultados.erlangC),  color: '#f472b6', sub: 'Prob. de tener que esperar' },
            { symbol: 'Ls', label: 'Clientes en sistema',      value: fmt(resultados.Ls, 4),    color: C.amber,   sub: 'Promedio en sistema' },
            { symbol: 'Lq', label: 'Clientes en cola',         value: fmt(resultados.Lq, 4),    color: C.amber,   sub: 'Promedio en cola' },
            { symbol: 'Ws', label: 'Tiempo en sistema',        value: fmt(resultados.Ws, 4),    color: C.green,   sub: 'Tiempo prom. sistema' },
            { symbol: 'Wq', label: 'Tiempo en cola',           value: fmt(resultados.Wq, 4),    color: C.green,   sub: 'Tiempo prom. cola' },
        ];
        if (tipo === 'conlimite' && resultados.Pk !== undefined) {
            base.push(
                { symbol: 'λeff',      label: 'Lambda efectiva',       value: fmt(resultados.lambdaEff, 4),     color: '#f472b6', sub: 'λ × (1 − Pₖ) — clientes que entran' },
                { symbol: 'Pₖ',       label: 'Prob. bloqueo / lleno', value: fmt(resultados.Pk),               color: C.danger,  sub: `P(n=K=${resultados.K}) — prob. sistema lleno` },
                { symbol: 'λperdida', label: 'Tasa perdida',          value: fmt(resultados.lambdaPerdida, 4),  color: C.danger,  sub: 'λ × Pₖ — clientes perdidos/tiempo' },
            );
        }
        return base;
    }, [resultados, tipo, C]);

    // ── Calculadora de Probabilidades ─────────────────────────────────
    const probCalc = useMemo(() => {
        if (!isValid || !resultados) return null;
        const t  = parseFloat(tProb);
        const n  = parseInt(nProb, 10);
        const okT = !isNaN(t) && t >= 0;
        const okN = !isNaN(n) && n >= 0;

        let espera = null, clientes = null;

        if (okT) {
            const { erlangC: C_val, mu: mu_, s: sv_, a: a_ } = resultados;
            const gamma = mu_ * (sv_ - a_); // sμ - λ

            const pWq_gt_t = C_val * Math.exp(-gamma * t);

            // P(W > t) fórmula exacta (M/M/s exacto, M/M/s/K aproximado)
            let pW_gt_t;
            if (Math.abs(gamma - mu_) < 1e-10) {
                // Caso especial: γ = μ
                pW_gt_t = Math.exp(-mu_ * t) * (1 + C_val * mu_ * t);
            } else {
                const fac = mu_ / (mu_ - gamma);
                pW_gt_t = Math.exp(-mu_ * t) * ((1 - C_val) - C_val * gamma / (mu_ - gamma))
                        + C_val * fac * Math.exp(-gamma * t);
            }

            espera = {
                pW_gt_t:    Math.max(0, Math.min(1, pW_gt_t)),
                pWQ_gt_t:   Math.max(0, Math.min(1, pWq_gt_t)),
                pHasToWait: C_val,
            };
        }

        if (okN) {
            const row     = dist.find(r => r.n === n);
            const lastRow = dist[dist.length - 1];
            const pN_eq_n  = row ? row.pn : 0;
            const pN_leq_n = row ? row.acum : (lastRow && n > lastRow.n ? lastRow.acum : 0);
            const pN_gt_n  = Math.max(0, 1 - pN_leq_n);
            const pN_geq_n = Math.min(1, pN_eq_n + pN_gt_n);
            clientes = { pN_eq_n, pN_gt_n, pN_leq_n, pN_geq_n };
        }

        return { espera, clientes };
    }, [isValid, resultados, dist, tProb, nProb]);

    // ── Datos Gráficas ────────────────────────────────────────────────
    const datosGrafica = useMemo(() => dist.map(r => ({ n: r.n, pn: r.pn, cdf: r.acum })), [dist]);

    // ══════════════════════════════════════════════════════════════════
    // ─── RENDER ───────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════
    return (
        <AppLayout subNav={subNav} activeSubSection={activeSection}>
            <Head title="Multi-Servidor — M/M/s & M/M/s/K" />

            {showTour && <TourOverlay steps={TOUR_STEPS_MULTI} onClose={() => setShowTour(false)} />}

            {/* ── Alerta ρ ≥ 1 en M/M/s ── */}
            {tipo === 'sinlimite' && validBase && rho >= 1 && (
                <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2000, animation: 'alertEntrance 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
                    <div style={{ background: 'linear-gradient(135deg,rgba(24,20,15,0.95),rgba(15,10,5,0.98))', border: '2px solid #f59e0b', borderRadius: '1.25rem', padding: '2.5rem', boxShadow: '0 0 50px rgba(245,158,11,0.3),0 30px 80px rgba(0,0,0,0.8)', textAlign: 'center', maxWidth: '420px', width: '90vw', backdropFilter: 'blur(8px)' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'bounceSlow 2s ease-in-out infinite alternate' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 0.5rem', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Sistema Inestable</h3>
                        <p style={{ margin: '0 0 1rem', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            En M/M/s, la tasa de llegada <strong style={{ color: '#fbbf24' }}>λ</strong> debe ser menor que la capacidad total de servicio <strong style={{ color: '#fbbf24' }}>s·μ</strong> (ρ &lt; 1).
                        </p>
                        <div style={{ display: 'inline-block', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                            Actualmente ρ = {fmt(rho, 4)} ≥ 1
                        </div>
                    </div>
                    <style>{`
                        @keyframes alertEntrance { 0%{opacity:0;transform:translate(-50%,-40%) scale(0.9)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
                        @keyframes bounceSlow { 0%{transform:translateY(0)} 100%{transform:translateY(-8px)} }
                    `}</style>
                </div>
            )}

            <div style={{ padding: '2rem 1.5rem', background: C.bg, minHeight: '100vh' }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '0.65rem', padding: '0.3rem 1rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>
                            SIMULACIÓN Y OPTIMIZACIÓN
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.3rem', color: C.titleColor }}>
                            Varios Servidores
                        </h1>
                        <p style={{ color: C.muted, fontSize: '0.88rem', margin: 0 }}>Modelos de Líneas de Espera — M/M/s &amp; M/M/s/K</p>
                    </div>
                    <button
                        id="btn-tour-multi"
                        onClick={() => setShowTour(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.5)', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s ease', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', flexShrink: 0, marginTop: '0.25rem' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.35))'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <Compass size={15} /> Tour Guiado
                    </button>
                </div>

                {/* ── Tabs M/M/s | M/M/s/K ── */}
                <div id="sec-config" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'inline-flex', borderRadius: '0.75rem', overflow: 'hidden', border: `1px solid ${C.border}`, background: C.card, backdropFilter: 'blur(12px)' }}>
                        {[
                            { id: 'sinlimite', label: 'Sin Límite en Cola', sub: 'M/M/s',   IconTab: InfinityIcon },
                            { id: 'conlimite', label: 'Con Límite en Cola', sub: 'M/M/s/K', IconTab: Hash },
                        ].map(tab => {
                            const active = tipo === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setTipo(tab.id)}
                                    style={{ padding: '0.85rem 1.75rem', border: 'none', background: active ? C.tabActiveBg : 'transparent', color: active ? '#ffffff' : C.tabInactiveText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: active ? 700 : 500, transition: 'all 0.25s ease' }}
                                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.tabInactiveBg; e.currentTarget.style.color = C.text; } }}
                                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.tabInactiveText; } }}
                                >
                                    <tab.IconTab size={16} />
                                    <div style={{ textAlign: 'left' }}>
                                        <div>{tab.label}</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 400 }}>{tab.sub}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ═══ SECCIÓN 1: Config + Resultados ═══ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>

                        {/* ── Panel Configuración ── */}
                        <div style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.accent, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Settings size={16} /> Parámetros de Entrada
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* Lambda */}
                                <div>
                                    <label style={labelStyle}>λ (Tasa de llegada)</label>
                                    <input style={inputStyle} type="number" step="any" min="0.001" value={lambda} onChange={e => setLambda(e.target.value)} placeholder="Ej: 4" />
                                    {(isNaN(l) || l <= 0) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>λ debe ser mayor que 0</span>}
                                </div>

                                {/* Mu */}
                                <div>
                                    <label style={labelStyle}>μ (Tasa de servicio por servidor)</label>
                                    <input style={inputStyle} type="number" step="any" min="0.001" value={mu} onChange={e => setMu(e.target.value)} placeholder="Ej: 3" />
                                    {(isNaN(m) || m <= 0) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>μ debe ser mayor que 0</span>}
                                </div>

                                {/* Servidores */}
                                <div>
                                    <label style={labelStyle}>s (Número de servidores)</label>
                                    <input style={inputStyle} type="number" step="1" min="1" value={sServ} onChange={e => setSServ(e.target.value)} placeholder="Ej: 2" />
                                    {(isNaN(sv) || sv < 1) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>s debe ser ≥ 1</span>}
                                </div>

                                {/* K (solo M/M/s/K) */}
                                {tipo === 'conlimite' && (
                                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                        <label style={labelStyle}>K (Capacidad máxima del sistema)</label>
                                        <input style={inputStyle} type="number" step="1" min="1" value={K} onChange={e => setK(e.target.value)} placeholder="Ej: 8" />
                                        {validBase && !isNaN(k) && k < sv && <span style={{ color: C.danger, fontSize: '0.72rem' }}>K debe ser ≥ s ({sv})</span>}
                                        {(isNaN(k) || k < 1) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>K debe ser ≥ 1</span>}
                                    </div>
                                )}

                                {/* ρ en tiempo real */}
                                {validBase && (
                                    <div style={{ background: rho < 1 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${rho < 1 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '0.5rem', padding: '0.6rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600 }}>ρ = λ / (s·μ)</div>
                                            <div style={{ fontSize: '0.62rem', color: C.muted }}>a = λ/μ = {fmt(a, 3)}</div>
                                        </div>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: rho < 1 ? C.green : C.danger }}>{fmt(rho, 4)}</span>
                                    </div>
                                )}

                                {/* Info box */}
                                <div style={{ background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.82rem', color: C.infoBoxText, lineHeight: 1.5 }}>
                                    {tipo === 'sinlimite'
                                        ? <><b style={{ color: C.accent }}>M/M/s:</b> s servidores en paralelo, cola infinita. Requiere ρ = λ/(s·μ) &lt; 1 para estabilidad.</>
                                        : <><b style={{ color: C.accent2 }}>M/M/s/K:</b> s servidores, capacidad total K. ρ puede ser ≥ 1. Clientes que llegan al sistema lleno son rechazados.</>
                                    }
                                </div>
                            </div>
                        </div>

                        {/* ── Panel Resultados ── */}
                        <div id="sec-results" style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.green, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} /> Resultados — {tipo === 'sinlimite' ? 'M/M/s' : 'M/M/s/K'}
                            </h2>
                            {isValid && resultados ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                    {metricas.map(({ symbol, label, value, color, sub }) => (
                                        <div key={label} style={{ background: C.resultBg, border: `1px solid ${C.resultBorder}`, borderRadius: '0.65rem', padding: '0.85rem 1rem', transition: 'background 0.3s, border-color 0.3s' }}>
                                            {/* Badge del símbolo matemático */}
                                            <div style={{ display: 'inline-block', background: `${color}18`, border: `1px solid ${color}40`, borderRadius: '0.35rem', padding: '0.15rem 0.5rem', fontSize: '0.9rem', fontFamily: 'serif', fontWeight: 700, color, marginBottom: '0.45rem' }}>
                                                {symbol}
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: C.muted, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
                                            <div style={{ fontSize: '0.62rem', color: C.muted, marginTop: '0.2rem' }}>{sub}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', color: C.danger }}>
                                    {tipo === 'sinlimite'
                                        ? 'Introduce parámetros válidos (λ > 0, μ > 0, s ≥ 1, ρ < 1)'
                                        : 'Introduce parámetros válidos (λ > 0, μ > 0, s ≥ 1, K ≥ s)'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ SECCIÓN: Calculadora de Probabilidades ═══ */}
                    {isValid && resultados && (
                        <div id="sec-prob" style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.accent, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace' }}>%</span>
                                    Calculadora de Probabilidades
                                </h2>
                                <div style={{ display: 'inline-flex', borderRadius: '0.5rem', overflow: 'hidden', border: `1px solid ${C.border}`, background: C.card }}>
                                    {[{ id: 'espera', label: 'Espera (t)' }, { id: 'clientes', label: 'Clientes (n)' }].map(tab => {
                                        const act = probTab === tab.id;
                                        return (
                                            <button key={tab.id} onClick={() => setProbTab(tab.id)} style={{ padding: '0.5rem 1.1rem', border: 'none', background: act ? C.tabActiveBg : 'transparent', color: act ? '#ffffff' : C.tabInactiveText, cursor: 'pointer', fontSize: '0.8rem', fontWeight: act ? 700 : 500, transition: 'all 0.2s ease' }}>
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '1.5rem', alignItems: 'start' }}>
                                {/* Input */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {probTab === 'espera' ? (
                                        <>
                                            <div>
                                                <label style={labelStyle}>Tiempo de espera t</label>
                                                <input style={inputStyle} type="number" step="any" min="0" value={tProb} onChange={e => setTProb(e.target.value)} placeholder="Ej: 1" />
                                            </div>
                                            <div style={{ background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.78rem', color: C.muted, lineHeight: 1.5 }}>
                                                ⚠ El tiempo t debe ingresarse en las mismas unidades temporales usadas para λ y μ.
                                                {tipo === 'conlimite' && <><br /><br />⚙ Para M/M/s/K los valores de tiempo son una aproximación basada en la estructura M/M/s con el mismo ρ efectivo.</>}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label style={labelStyle}>Número de clientes n</label>
                                                <input style={inputStyle} type="number" step="1" min="0" value={nProb} onChange={e => setNProb(e.target.value)} placeholder="Ej: 3" />
                                            </div>
                                            {tipo === 'conlimite' && resultados.K !== undefined && (
                                                <div style={{ background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.78rem', color: C.muted }}>
                                                    Capacidad máxima K = {resultados.K}. Para n &gt; K, P(N=n) = 0.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Resultados */}
                                <div>
                                    {probTab === 'espera' && probCalc?.espera ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                            {[
                                                { label: `P(W > ${tProb})`,  desc: `Prob. permanencia total > ${tProb}.`,    formula: tipo === 'sinlimite' ? 'Exacta (M/M/s)' : 'Aprox. (M/M/s/K)', value: probCalc.espera.pW_gt_t,    color: C.accent  },
                                                { label: `P(WQ > ${tProb})`, desc: `Prob. espera en cola > ${tProb}.`,        formula: tipo === 'sinlimite' ? 'C(s,a)·e^(-(sμ-λ)t)' : 'Aprox.', value: probCalc.espera.pWQ_gt_t,   color: C.accent2 },
                                                { label: 'P(WQ > 0)',        desc: 'Prob. de tener que esperar al llegar.', formula: tipo === 'sinlimite' ? 'C(s,a) — Erlang C' : 'P(N≥s|admitido)', value: probCalc.espera.pHasToWait, color: C.amber   },
                                            ].map(({ label, desc, formula, value, color }) => (
                                                <div key={label} style={{ background: C.resultBg, border: `1px solid ${C.resultBorder}`, borderRadius: '0.65rem', padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color, fontFamily: 'serif', marginBottom: '0.35rem' }}>{label}</div>
                                                    <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: '0.45rem', lineHeight: 1.4 }}>{desc}</div>
                                                    <div style={{ fontSize: '0.62rem', color: C.muted, marginBottom: '0.65rem', fontFamily: 'monospace', background: `${color}12`, padding: '0.2rem 0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>{formula}</div>
                                                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color, fontFamily: 'monospace' }}>{(value * 100).toFixed(4)}%</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : probTab === 'clientes' && probCalc?.clientes ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                            {[
                                                { label: `P(N = ${nProb})`, desc: `Prob. exactamente ${nProb} clientes.`, formula: 'P(n) de tabla', value: probCalc.clientes.pN_eq_n,  color: C.green   },
                                                { label: `P(N > ${nProb})`, desc: `Prob. más de ${nProb} clientes.`,       formula: '1 − P(N≤n)',   value: probCalc.clientes.pN_gt_n,  color: C.accent  },
                                                { label: `P(N ≤ ${nProb})`, desc: `Prob. a lo sumo ${nProb} clientes.`,   formula: 'CDF acumulada', value: probCalc.clientes.pN_leq_n, color: C.accent2 },
                                                { label: `P(N ≥ ${nProb})`, desc: `Prob. al menos ${nProb} clientes.`,    formula: 'P(N=n)+P(N>n)', value: probCalc.clientes.pN_geq_n, color: C.amber   },
                                            ].map(({ label, desc, formula, value, color }) => (
                                                <div key={label} style={{ background: C.resultBg, border: `1px solid ${C.resultBorder}`, borderRadius: '0.65rem', padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color, fontFamily: 'serif', marginBottom: '0.35rem' }}>{label}</div>
                                                    <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: '0.45rem', lineHeight: 1.4 }}>{desc}</div>
                                                    <div style={{ fontSize: '0.62rem', color: C.muted, marginBottom: '0.65rem', fontFamily: 'monospace', background: `${color}12`, padding: '0.2rem 0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>{formula}</div>
                                                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color, fontFamily: 'monospace' }}>{(value * 100).toFixed(4)}%</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ color: C.muted, fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                                            Ingresa un valor válido para calcular.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ SECCIÓN 2: Distribución P(n) — Tabla ═══ */}
                    {dist.length > 0 && (
                        <div id="sec-dist" style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.amber, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Ruler size={16} /> Distribución de Probabilidad P(n)
                            </h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: C.tableHeaderBg }}>
                                            {['n', 'Estado', 'P(n)', 'P acumulada', 'Visualización'].map(h => (
                                                <th key={h} style={{ padding: '0.65rem 1rem', textAlign: h === 'Visualización' ? 'left' : 'center', color: C.accent, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dist.map((row, i) => {
                                            const enCola = row.n > sv;
                                            return (
                                                <tr key={row.n} style={{ background: i % 2 === 0 ? 'transparent' : C.tableRowAlt, transition: 'background 0.15s' }}>
                                                    <td style={{ padding: '0.55rem 1rem', textAlign: 'center', fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}` }}>{row.n}</td>
                                                    <td style={{ padding: '0.55rem 1rem', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '0.25rem', background: enCola ? `${C.danger}15` : `${C.green}15`, color: enCola ? C.danger : C.green, border: `1px solid ${enCola ? C.danger : C.green}30` }}>
                                                            {row.n === 0 ? 'Vacío' : row.n <= sv ? `${row.n}/${sv} serv.` : `Cola (${row.n - sv})`}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.55rem 1rem', textAlign: 'center', fontFamily: 'monospace', color: C.green, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{fmt(row.pn)}</td>
                                                    <td style={{ padding: '0.55rem 1rem', textAlign: 'center', fontFamily: 'monospace', color: C.accent2, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{fmt(row.acum)}</td>
                                                    <td style={{ padding: '0.55rem 1rem', borderBottom: `1px solid ${C.border}` }}>
                                                        <div style={{ width: '100%', height: '8px', background: C.tableBg, borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${Math.min(row.pn * 100 / (dist[0]?.pn || 1) * 100, 100)}%`, height: '100%', background: `linear-gradient(90deg,${C.accent},${C.accent2})`, borderRadius: '4px', transition: 'width 0.4s ease', minWidth: row.pn > 0 ? '2px' : '0' }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ═══ SECCIÓN 3: Gráficas ═══ */}
                    {datosGrafica.length > 0 && (
                        <div id="sec-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                            {/* Gráfica P(n) */}
                            <div style={cardStyle}>
                                <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: C.accent, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart2 size={16} /> Distribución P(n)</span>
                                </h2>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={datosGrafica} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                                        <XAxis dataKey="n" stroke={C.muted} tick={{ fontSize: 11 }} />
                                        <YAxis stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(3)} />
                                        <Tooltip content={<CustomTooltip labelPrefix="n" />} />
                                        <Bar dataKey="pn" name="P(n)" fill={C.accent} radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Gráfica CDF */}
                            <div style={cardStyle}>
                                <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: C.accent2, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={16} /> Distribución Acumulada CDF</span>
                                </h2>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={datosGrafica} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="cdfGradMulti" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={C.accent2} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={C.accent2} stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                                        <XAxis dataKey="n" stroke={C.muted} tick={{ fontSize: 11 }} />
                                        <YAxis stroke={C.muted} tick={{ fontSize: 11 }} domain={[0, 1]} tickFormatter={v => v.toFixed(2)} />
                                        <Tooltip content={<CustomTooltip labelPrefix="n" />} />
                                        <Area type="stepAfter" dataKey="cdf" name="F(n)" stroke={C.accent2} fill="url(#cdfGradMulti)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.72rem', paddingBottom: '1rem' }}>
                        Líneas de Espera — Modelos de Varios Servidores M/M/s &amp; M/M/s/K
                    </div>
                </div>
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </AppLayout>
    );
}
