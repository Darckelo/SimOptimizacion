import React, { useState, useMemo, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import {
    BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Settings, Users, Ruler, BarChart2, TrendingUp, Compass,
    CheckCircle, XCircle, Infinity, Hash,
} from 'lucide-react';
import TourOverlay from '@/Components/TourOverlay';
import CustomTooltip from '@/Components/CustomTooltip';
import useSectionNav from '@/hooks/useSectionNav';
import { buildFormStyles } from '@/theme/formStyles';
import { DARK_BASE, LIGHT_BASE } from '@/theme/palettes';

// ─── Paletas de tema (base compartida + extras propios de este módulo) ─
const DARK_C = {
    ...DARK_BASE,
    resultContinuaBg: 'rgba(99,102,241,0.07)',
    resultContinuaBorder: 'rgba(99,102,241,0.3)',
    disabledBg: 'rgba(15,23,42,0.4)',
    disabledBorder: 'rgba(99,102,241,0.08)',
    labelText: '#ffffff',
    infoBoxText: '#ffffff',
    tabInactiveBg: 'rgba(30,41,59,0.6)',
    tabInactiveBorder: 'rgba(99,102,241,0.2)',
    tabInactiveText: '#94a3b8',
};
const LIGHT_C = {
    ...LIGHT_BASE,
    resultContinuaBg: 'rgba(79,70,229,0.07)',
    resultContinuaBorder: 'rgba(79,70,229,0.30)',
    disabledBg: 'rgba(241,245,249,0.8)',
    disabledBorder: 'rgba(148,163,184,0.3)',
    labelText: '#1e293b',
    infoBoxText: '#1e293b',
    tabInactiveBg: 'rgba(241,245,249,0.8)',
    tabInactiveBorder: 'rgba(99,102,241,0.18)',
};

// ─── Helpers ──────────────────────────────────────────────────────────
const fmt = (n, d = 6) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(d) : '—';

// ─── Sub-nav ──────────────────────────────────────────────────────────
const SUB_NAV_DEF = [
    { id: 'config',  Icon: Settings,   label: 'Configuración' },
    { id: 'results', Icon: Users,      label: 'Resultados' },
    { id: 'dist',    Icon: Hash,       label: 'Distribución P(n)' },
    { id: 'charts',  Icon: BarChart2,  label: 'Gráficas' },
];

// ─── Tour Guiado — pasos por sección ───────────────────────────────
const TOUR_STEPS_ESPERA = [
    {
        targetId: 'sec-config',
        sectionName: 'Configuración',
        Icon: Settings,
        accentColor: '#6366f1',
        what: 'Aquí seleccionas el modelo (M/M/1 o M/M/1/K) e ingresas λ, μ y, si aplica, la capacidad K.',
        dos: [
            'Usa M/M/1 si la cola es infinita (sin límite de clientes).',
            'Usa M/M/1/K si el sistema tiene capacidad máxima fija (K clientes).',
            'Ingresa λ (llegadas) y μ (servicio) mayores que cero.',
        ],
        donts: [
            'En M/M/1, no pongas λ ≥ μ — el sistema sería inestable (ρ ≥ 1).',
            'En M/M/1/K, no uses K < 1 — la capacidad mínima es 1.',
            'No dejes campos vacíos ni ingreses valores negativos.',
        ],
    },
    {
        targetId: 'sec-results',
        sectionName: 'Resultados',
        Icon: TrendingUp,
        accentColor: '#10b981',
        what: 'Muestra todas las métricas calculadas: ρ, P₀, Ls, Lq, Ws, Wq y (en M/M/1/K) la probabilidad de pérdida.',
        dos: [
            'Lee ρ (factor de utilización) para saber qué tan cargado está el servidor.',
            'Usa Ls/Lq para conocer cuántos clientes esperan en promedio en sistema/cola.',
            'Usa Ws/Wq para ver el tiempo promedio de espera.',
        ],
        donts: [
            'En M/M/1, no interpretes resultados si ρ ≥ 1 — el sistema es inestable.',
            'No confundas Ls (en sistema) con Lq (solo en cola).',
        ],
    },
    {
        targetId: 'sec-dist',
        sectionName: 'Distribución P(n)',
        Icon: Ruler,
        accentColor: '#f59e0b',
        what: 'Tabla que muestra la probabilidad de que haya exactamente n clientes en el sistema, más la probabilidad acumulada.',
        dos: [
            'Lee P(n) para ver cuán probable es cada estado del sistema.',
            'Revisa la columna acumulada para saber P(X ≤ n) en cualquier punto.',
        ],
        donts: [
            'No sumes las P(n) manualmente — la columna acumulada ya lo hace.',
            'No esperes P(n) para n > K en M/M/1/K — esos estados no existen.',
        ],
    },
    {
        targetId: 'sec-charts',
        sectionName: 'Gráficas',
        Icon: BarChart2,
        accentColor: '#8b5cf6',
        what: 'Visualiza la distribución P(n) y la CDF acumulada de forma interactiva para analizar el comportamiento del sistema.',
        dos: [
            'Usa la gráfica de barras para comparar la probabilidad de cada estado.',
            'Usa la CDF para ver cuánta probabilidad acumula hasta cierto n.',
            'Pasa el cursor sobre las barras para ver los valores exactos.',
        ],
        donts: [
            'No interpretes la altura de una barra como porcentaje directamente — es una probabilidad (0 a 1).',
            'No te alarmes si la CDF no llega a 1 visualmente — el truncado en n=20 no muestra la cola completa.',
        ],
    },
];

// ═══════════════════════════════════════════════════════════════════════
// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
export default function LineasEspera() {
    const { isDark } = useTheme();
    const C = isDark ? DARK_C : LIGHT_C;

    // Estilos dinámicos
    const { cardStyle, labelStyle, inputStyle } = buildFormStyles(C);

    // ── State ─────────────────────────────────────────────────────────
    const [tipo, setTipo] = useState('sinlimite'); // 'sinlimite' | 'conlimite'
    const [lambda, setLambda] = useState('2');
    const [mu, setMu] = useState('3');
    const [K, setK] = useState('5');
    const { activeSection, subNav } = useSectionNav(SUB_NAV_DEF, 'config');
    const [showTour, setShowTour] = useState(false);
    // ── Calculadora de probabilidades
    const [probTab, setProbTab] = useState('espera');
    const [tProb, setTProb] = useState('1');
    const [nProb, setNProb] = useState('3');

    const l = parseFloat(lambda);
    const m = parseFloat(mu);
    const k = parseInt(K, 10);

    // ── Validaciones ──────────────────────────────────────────────────
    const validBase = !isNaN(l) && l > 0 && !isNaN(m) && m > 0;
    const rho = validBase ? l / m : NaN;

    const validSinLimite = validBase && rho < 1;
    const validConLimite = validBase && !isNaN(k) && k >= 1;

    const isValid = tipo === 'sinlimite' ? validSinLimite : validConLimite;

    // ═══════════════════════════════════════════════════════════════════
    // ─── CÁLCULOS M/M/1 (Sin Límite) ─────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    const resultadosSinLimite = useMemo(() => {
        if (!validSinLimite) return null;
        const P0 = 1 - rho;
        const Ls = l / (m - l);
        const Lq = (l * l) / (m * (m - l));
        const Ws = 1 / (m - l);
        const Wq = l / (m * (m - l));
        return { rho, mu: m, P0, Ls, Lq, Ws, Wq };
    }, [l, m, rho, validSinLimite]);

    // Distribución P(n) sin límite
    const distSinLimite = useMemo(() => {
        if (!validSinLimite) return [];
        const rows = [];
        let acum = 0;
        const maxN = 20;
        for (let n = 0; n <= maxN; n++) {
            const pn = (1 - rho) * Math.pow(rho, n);
            acum += pn;
            rows.push({ n, pn, acum });
        }
        return rows;
    }, [rho, validSinLimite]);

    // ═══════════════════════════════════════════════════════════════════
    // ─── CÁLCULOS M/M/1/K (Con Límite) ───────────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    const resultadosConLimite = useMemo(() => {
        if (!validConLimite) return null;

        let P0, Ls;
        if (Math.abs(rho - 1) < 1e-10) {
            // Caso especial ρ = 1
            P0 = 1 / (k + 1);
            Ls = k / 2;
        } else {
            P0 = (1 - rho) / (1 - Math.pow(rho, k + 1));
            Ls = (rho / (1 - rho)) - ((k + 1) * Math.pow(rho, k + 1)) / (1 - Math.pow(rho, k + 1));
        }

        const Pk = P0 * Math.pow(rho, k); // prob de sistema lleno
        const lambdaEff = l * (1 - Pk);    // λ_eff = λ × (1 − Pₖ) — tasa efectiva de ingreso
        const lambdaPerdida = l * Pk;       // λ_perdida = λ × Pₖ — tasa de clientes perdidos
        const perdida = Pk;
        const Lq = Ls - (1 - P0);
        const Ws = lambdaEff > 0 ? Ls / lambdaEff : Infinity;
        const Wq = lambdaEff > 0 ? Lq / lambdaEff : Infinity;

        return { rho, mu: m, P0, Ls, Lq, Ws, Wq, lambdaEff, lambdaPerdida, perdida, Pk, K: k };
    }, [l, m, rho, k, validConLimite]);

    // Distribución P(n) con límite
    const distConLimite = useMemo(() => {
        if (!validConLimite || !resultadosConLimite) return [];
        const rows = [];
        let acum = 0;
        for (let n = 0; n <= k; n++) {
            const pn = resultadosConLimite.P0 * Math.pow(rho, n);
            acum += pn;
            rows.push({ n, pn, acum });
        }
        return rows;
    }, [rho, k, validConLimite, resultadosConLimite]);

    // ── Datos activos según tipo ──────────────────────────────────────
    const resultados = tipo === 'sinlimite' ? resultadosSinLimite : resultadosConLimite;
    const dist = tipo === 'sinlimite' ? distSinLimite : distConLimite;

    // ── Datos para gráficas ───────────────────────────────────────────
    const datosGrafica = useMemo(() => {
        if (!dist.length) return [];
        return dist.map(row => ({
            n: row.n,
            pn: row.pn,
            cdf: row.acum,
        }));
    }, [dist]);

    // ── Métricas para mostrar ─────────────────────────────────────────
    const metricas = useMemo(() => {
        if (!resultados) return [];
        const base = [
            { label: 'Factor de utilización', symbol: 'ρ', value: fmt(resultados.rho), color: C.accent, sub: 'λ / μ' },
            { label: 'Tasa de servicio', symbol: 'μ', value: fmt(resultados.mu), color: C.accent2, sub: 'Serv./unidad tiempo' },
            { label: 'Sistema vacío', symbol: 'P₀', value: fmt(resultados.P0), color: C.green, sub: 'Prob. 0 clientes' },
            { label: 'Clientes en sistema', symbol: 'Ls', value: fmt(resultados.Ls, 4), color: C.amber, sub: 'Promedio en sistema' },
            { label: 'Clientes en cola', symbol: 'Lq', value: fmt(resultados.Lq, 4), color: C.amber, sub: 'Promedio en cola' },
            { label: 'Tiempo en sistema', symbol: 'Ws', value: fmt(resultados.Ws, 4), color: C.green, sub: 'Tiempo prom. sistema' },
            { label: 'Tiempo en cola', symbol: 'Wq', value: fmt(resultados.Wq, 4), color: C.green, sub: 'Tiempo prom. cola' },
        ];
        if (tipo === 'conlimite' && resultados.lambdaEff !== undefined) {
            base.push(
                { label: 'Lambda efectiva', symbol: 'λeff', value: fmt(resultados.lambdaEff, 4), color: '#f472b6', sub: 'λ × (1 − Pₖ) — clientes que entran' },
                { label: 'Prob. bloqueo / lleno', symbol: 'Pₖ', value: fmt(resultados.perdida), color: C.danger, sub: `P(n=K=${resultados.K}) — prob. sistema lleno` },
                { label: 'Tasa perdida', symbol: 'λperdida', value: fmt(resultados.lambdaPerdida, 4), color: C.danger, sub: 'λ × Pₖ — clientes perdidos/tiempo' },
            );
        }
        return base;
    }, [resultados, tipo, C]);

    // ── Calculadora de Probabilidades — cálculos ─────────────────────
    const probCalc = useMemo(() => {
        if (!isValid || !resultados) return null;
        const t   = parseFloat(tProb);
        const n   = parseInt(nProb, 10);
        const okT = !isNaN(t) && t >= 0;
        const okN = !isNaN(n) && n >= 0;

        let espera   = null;
        let clientes = null;

        if (tipo === 'sinlimite') {
            const rho_ = resultados.rho;
            const mu_  = resultados.mu;
            const rate = mu_ - l; // μ − λ

            if (okT) {
                espera = {
                    pW_gt_t:     Math.exp(-rate * t),
                    pWQ_gt_t:    rho_ * Math.exp(-rate * t),
                    pHasToWait:  rho_,
                };
            }
            if (okN) {
                clientes = {
                    pN_eq_n:  (1 - rho_) * Math.pow(rho_, n),
                    pN_gt_n:  Math.pow(rho_, n + 1),
                    pN_leq_n: 1 - Math.pow(rho_, n + 1),
                    pN_geq_n: Math.pow(rho_, n),
                };
            }
        } else {
            // M/M/1/K
            const { P0, Pk, K: kk, mu: mu_, rho: rho_ } = resultados;
            const pAdmit = 1 - Pk;

            if (okN) {
                const pN_eq_n = n <= kk ? P0 * Math.pow(rho_, n) : 0;
                let pN_gt_n = 0;
                for (let j = n + 1; j <= kk; j++) pN_gt_n += P0 * Math.pow(rho_, j);
                clientes = {
                    pN_eq_n,
                    pN_gt_n,
                    pN_leq_n: 1 - pN_gt_n,
                    pN_geq_n: pN_eq_n + pN_gt_n,
                };
            }

            if (okT) {
                // Términos de Poisson: (μt)^j / j!
                const mut = mu_ * t;
                const emu = Math.exp(-mut);
                const pt  = [1];
                for (let j = 1; j <= kk; j++) pt.push(pt[j - 1] * mut / j);

                // P(W > t) = Σ_{n=0}^{K-1} [Pn/(1-PK)] · e^{-μt} · Σ_{j=0}^{n} (μt)^j/j!
                let pW_gt_t = 0, cumPT = 0;
                for (let ni = 0; ni <= kk - 1; ni++) {
                    cumPT += pt[ni];
                    pW_gt_t += (P0 * Math.pow(rho_, ni) / pAdmit) * emu * cumPT;
                }

                // P(WQ > t) = Σ_{n=1}^{K-1} [Pn/(1-PK)] · e^{-μt} · Σ_{j=0}^{n-1} (μt)^j/j!
                let pWQ_gt_t = 0, cumPTQ = 0;
                for (let ni = 1; ni <= kk - 1; ni++) {
                    cumPTQ += pt[ni - 1];
                    pWQ_gt_t += (P0 * Math.pow(rho_, ni) / pAdmit) * emu * cumPTQ;
                }

                espera = {
                    pW_gt_t,
                    pWQ_gt_t,
                    pHasToWait: Math.max(0, (1 - P0 - Pk) / pAdmit),
                };
            }
        }

        return { espera, clientes };
    }, [isValid, resultados, tipo, l, tProb, nProb]);

    // ══════════════════════════════════════════════════════════════════
    // ─── RENDER ───────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════
    return (
        <AppLayout subNav={subNav} activeSubSection={activeSection}>
            <Head title="Líneas de Espera — Teoría de Colas" />

            {showTour && <TourOverlay steps={TOUR_STEPS_ESPERA} onClose={() => setShowTour(false)} />}

            {/* ── Alerta de ρ ≥ 1 en M/M/1 ── */}
            {tipo === 'sinlimite' && validBase && rho >= 1 && (
                <div style={{
                    position: 'fixed', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)', zIndex: 2000,
                    animation: 'alertEntrance 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(24, 20, 15, 0.95), rgba(15, 10, 5, 0.98))',
                        border: '2px solid #f59e0b',
                        borderRadius: '1.25rem', padding: '2.5rem',
                        boxShadow: '0 0 50px rgba(245, 158, 11, 0.3), 0 30px 80px rgba(0, 0, 0, 0.8)',
                        textAlign: 'center', maxWidth: '400px', width: '90vw',
                        backdropFilter: 'blur(8px)',
                    }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'bounceSlow 2s ease-in-out infinite alternate' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 0.5rem', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                            Sistema Inestable
                        </h3>
                        <p style={{ margin: '0 0 1rem', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            En M/M/1 sin límite, la tasa de llegada <strong style={{ color: '#fbbf24' }}>λ</strong> debe ser menor que la tasa de servicio <strong style={{ color: '#fbbf24' }}>μ</strong> (ρ &lt; 1).
                        </p>
                        <div style={{
                            display: 'inline-block', background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '0.5rem',
                            padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600,
                        }}>
                            Actualmente ρ = {fmt(rho, 4)} ≥ 1
                        </div>
                    </div>
                    <style>{`
                        @keyframes alertEntrance {
                            0% { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
                            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                        }
                        @keyframes bounceSlow {
                            0% { transform: translateY(0); }
                            100% { transform: translateY(-8px); }
                        }
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
                            Líneas de Espera
                        </h1>
                        <p style={{ color: C.muted, fontSize: '0.88rem', margin: 0 }}>Teoría de Colas — M/M/1 &amp; M/M/1/K</p>
                    </div>
                    {/* Botón Tour Guiado */}
                    <button
                        id="btn-tour-colas"
                        onClick={() => setShowTour(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.5)', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s ease', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', flexShrink: 0, marginTop: '0.25rem' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35))'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.8)'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.2)'; }}
                    >
                        <Compass size={15} /> Tour Guiado
                    </button>
                </div>

                {/* ── Tabs selector: Sin Límite / Con Límite ── */}
                <div id="sec-config" style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        display: 'inline-flex', borderRadius: '0.75rem', overflow: 'hidden',
                        border: `1px solid ${C.border}`,
                        background: C.card,
                        backdropFilter: 'blur(12px)',
                    }}>
                        {[
                            { id: 'sinlimite', label: 'Sin Límite en Cola', sub: 'M/M/1', IconTab: Infinity },
                            { id: 'conlimite', label: 'Con Límite en Cola', sub: 'M/M/1/K', IconTab: Hash },
                        ].map(tab => {
                            const active = tipo === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setTipo(tab.id)}
                                    style={{
                                        padding: '0.85rem 1.75rem',
                                        border: 'none',
                                        background: active ? C.tabActiveBg : 'transparent',
                                        color: active ? '#ffffff' : C.tabInactiveText,
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        fontSize: '0.85rem', fontWeight: active ? 700 : 500,
                                        transition: 'all 0.25s ease',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={e => {
                                        if (!active) {
                                            e.currentTarget.style.background = C.tabInactiveBg;
                                            e.currentTarget.style.color = C.text;
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!active) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = C.tabInactiveText;
                                        }
                                    }}
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
                                    <input
                                        style={inputStyle}
                                        type="number" step="any" min="0.001"
                                        value={lambda}
                                        onChange={e => setLambda(e.target.value)}
                                        placeholder="Ej: 2"
                                    />
                                    {(isNaN(l) || l <= 0) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>λ debe ser mayor que 0</span>}
                                </div>

                                {/* Mu */}
                                <div>
                                    <label style={labelStyle}>μ (Tasa de servicio)</label>
                                    <input
                                        style={inputStyle}
                                        type="number" step="any" min="0.001"
                                        value={mu}
                                        onChange={e => setMu(e.target.value)}
                                        placeholder="Ej: 3"
                                    />
                                    {(isNaN(m) || m <= 0) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>μ debe ser mayor que 0</span>}
                                </div>

                                {/* K (solo con límite) */}
                                {tipo === 'conlimite' && (
                                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                        <label style={labelStyle}>K (Capacidad máxima del sistema)</label>
                                        <input
                                            style={inputStyle}
                                            type="number" step="1" min="1"
                                            value={K}
                                            onChange={e => setK(e.target.value)}
                                            placeholder="Ej: 5"
                                        />
                                        {(isNaN(k) || k < 1) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>K debe ser ≥ 1</span>}
                                    </div>
                                )}

                                {/* ρ live */}
                                {validBase && (
                                    <div style={{
                                        background: rho < 1 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                        border: `1px solid ${rho < 1 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                        borderRadius: '0.5rem', padding: '0.6rem 0.85rem',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        transition: 'all 0.3s',
                                    }}>
                                        <span style={{ fontSize: '0.78rem', color: C.muted, fontWeight: 600 }}>ρ = λ/μ</span>
                                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: rho < 1 ? C.green : C.danger }}>{fmt(rho, 4)}</span>
                                    </div>
                                )}

                                {/* Info box */}
                                <div style={{ background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.82rem', color: C.infoBoxText, lineHeight: 1.5 }}>
                                    {tipo === 'sinlimite'
                                        ? <><b style={{ color: C.accent }}>M/M/1:</b> Un servidor, cola infinita. Requiere ρ &lt; 1 para estabilidad. Los clientes nunca son rechazados.</>
                                        : <><b style={{ color: C.accent2 }}>M/M/1/K:</b> Un servidor, capacidad limitada a K. ρ puede ser ≥ 1. Los clientes que llegan al sistema lleno se pierden.</>
                                    }
                                </div>
                            </div>
                        </div>

                        {/* ── Panel Resultados ── */}
                        <div id="sec-results" style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.green, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} /> Resultados — {tipo === 'sinlimite' ? 'M/M/1' : 'M/M/1/K'}
                            </h2>
                            {isValid && resultados ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                    {metricas.map(({ label, symbol, value, color, sub }) => (
                                        <div key={label} style={{
                                            background: C.resultBg,
                                            border: `1px solid ${C.resultBorder}`,
                                            borderRadius: '0.65rem', padding: '0.85rem 1rem',
                                            transition: 'background 0.3s, border-color 0.3s',
                                        }}>
                                            {/* Badge del símbolo matemático correspondiente */}
                                            <div style={{
                                                display: 'inline-block',
                                                background: `${color}18`,
                                                border: `1px solid ${color}40`,
                                                borderRadius: '0.35rem',
                                                padding: '0.15rem 0.5rem',
                                                fontSize: '0.9rem',
                                                fontFamily: 'serif',
                                                fontWeight: 700,
                                                color: color,
                                                marginBottom: '0.45rem',
                                            }}>
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
                                        ? 'Introduce parámetros válidos (λ > 0, μ > 0, ρ < 1)'
                                        : 'Introduce parámetros válidos (λ > 0, μ > 0, K ≥ 1)'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ SECCIÓN: Calculadora de Probabilidades ═══ */}
                    {isValid && resultados && (
                        <div style={cardStyle}>

                            {/* Cabecera + tabs */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.accent, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace' }}>%</span>
                                    Calculadora de Probabilidades
                                </h2>
                                <div style={{ display: 'inline-flex', borderRadius: '0.5rem', overflow: 'hidden', border: `1px solid ${C.border}`, background: C.card }}>
                                    {[
                                        { id: 'espera',   label: 'Espera (t)'    },
                                        { id: 'clientes', label: 'Clientes (n)'  },
                                    ].map(tab => {
                                        const act = probTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setProbTab(tab.id)}
                                                style={{
                                                    padding: '0.5rem 1.1rem', border: 'none',
                                                    background: act ? C.tabActiveBg : 'transparent',
                                                    color: act ? '#ffffff' : C.tabInactiveText,
                                                    cursor: 'pointer', fontSize: '0.8rem',
                                                    fontWeight: act ? 700 : 500,
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >{tab.label}</button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                                {/* Panel de entrada */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {probTab === 'espera' ? (
                                        <>
                                            <div>
                                                <label style={labelStyle}>Tiempo de espera t</label>
                                                <input
                                                    style={inputStyle}
                                                    type="number" step="any" min="0"
                                                    value={tProb}
                                                    onChange={e => setTProb(e.target.value)}
                                                    placeholder="Ej: 1"
                                                />
                                            </div>
                                            <div style={{ background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.78rem', color: C.muted, lineHeight: 1.5 }}>
                                                ⚠ El tiempo t debe ingresarse en las mismas unidades temporales usadas para λ y μ (ej: horas).
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label style={labelStyle}>Número de clientes n</label>
                                                <input
                                                    style={inputStyle}
                                                    type="number" step="1" min="0"
                                                    value={nProb}
                                                    onChange={e => setNProb(e.target.value)}
                                                    placeholder="Ej: 3"
                                                />
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
                                                {
                                                    label: `P(W > ${tProb})`,
                                                    desc:  `Prob. de estar > ${tProb} tiempo en el sistema completo.`,
                                                    formula: tipo === 'sinlimite' ? 'e^(-(μ-λ)t)' : 'Numérico (M/M/1/K)',
                                                    value: probCalc.espera.pW_gt_t,
                                                    color: C.accent,
                                                },
                                                {
                                                    label: `P(WQ > ${tProb})`,
                                                    desc:  `Prob. de esperar > ${tProb} tiempo en la cola.`,
                                                    formula: tipo === 'sinlimite' ? 'ρ · e^(-(μ-λ)t)' : 'Numérico (M/M/1/K)',
                                                    value: probCalc.espera.pWQ_gt_t,
                                                    color: C.accent2,
                                                },
                                                {
                                                    label: 'P(WQ > 0)',
                                                    desc:  'Prob. de tener que esperar al llegar.',
                                                    formula: tipo === 'sinlimite' ? 'ρ = λ/μ' : '(1−P₀−Pₖ) / (1−Pₖ)',
                                                    value: probCalc.espera.pHasToWait,
                                                    color: C.amber,
                                                },
                                            ].map(({ label, desc, formula, value, color }) => (
                                                <div key={label} style={{ background: C.resultBg, border: `1px solid ${C.resultBorder}`, borderRadius: '0.65rem', padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color, fontFamily: 'serif', marginBottom: '0.35rem' }}>{label}</div>
                                                    <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: '0.45rem', lineHeight: 1.4 }}>{desc}</div>
                                                    <div style={{ fontSize: '0.62rem', color: C.muted, marginBottom: '0.65rem', fontFamily: 'monospace', background: `${color}12`, padding: '0.2rem 0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                                                        {formula}
                                                    </div>
                                                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color, fontFamily: 'monospace' }}>
                                                        {(value * 100).toFixed(4)}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : probTab === 'clientes' && probCalc?.clientes ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                            {[
                                                {
                                                    label: `P(N = ${nProb})`,
                                                    desc:  `Prob. exactamente ${nProb} clientes en sistema.`,
                                                    formula: tipo === 'sinlimite' ? '(1 − ρ) · ρⁿ' : 'P₀ · ρⁿ',
                                                    value: probCalc.clientes.pN_eq_n,
                                                    color: C.green,
                                                },
                                                {
                                                    label: `P(N > ${nProb})`,
                                                    desc:  `Prob. más de ${nProb} clientes en sistema.`,
                                                    formula: tipo === 'sinlimite' ? 'ρ^(n+1)' : 'Σ P₀·ρʲ (j=n+1..K)',
                                                    value: probCalc.clientes.pN_gt_n,
                                                    color: C.accent,
                                                },
                                                {
                                                    label: `P(N ≤ ${nProb})`,
                                                    desc:  `Prob. a lo sumo ${nProb} clientes en sistema.`,
                                                    formula: tipo === 'sinlimite' ? '1 − ρ^(n+1)' : '1 − P(N>n)',
                                                    value: probCalc.clientes.pN_leq_n,
                                                    color: C.accent2,
                                                },
                                                {
                                                    label: `P(N ≥ ${nProb})`,
                                                    desc:  `Prob. al menos ${nProb} clientes en sistema.`,
                                                    formula: tipo === 'sinlimite' ? 'ρⁿ' : 'P(N=n) + P(N>n)',
                                                    value: probCalc.clientes.pN_geq_n,
                                                    color: C.amber,
                                                },
                                            ].map(({ label, desc, formula, value, color }) => (
                                                <div key={label} style={{ background: C.resultBg, border: `1px solid ${C.resultBorder}`, borderRadius: '0.65rem', padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color, fontFamily: 'serif', marginBottom: '0.35rem' }}>{label}</div>
                                                    <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: '0.45rem', lineHeight: 1.4 }}>{desc}</div>
                                                    <div style={{ fontSize: '0.62rem', color: C.muted, marginBottom: '0.65rem', fontFamily: 'monospace', background: `${color}12`, padding: '0.2rem 0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                                                        {formula}
                                                    </div>
                                                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color, fontFamily: 'monospace' }}>
                                                        {(value * 100).toFixed(4)}%
                                                    </div>
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
                                <table style={{
                                    width: '100%', borderCollapse: 'collapse',
                                    fontSize: '0.85rem',
                                }}>
                                    <thead>
                                        <tr style={{ background: C.tableHeaderBg }}>
                                            <th style={{ padding: '0.65rem 1rem', textAlign: 'center', color: C.accent, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>n</th>
                                            <th style={{ padding: '0.65rem 1rem', textAlign: 'center', color: C.accent, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>P(n)</th>
                                            <th style={{ padding: '0.65rem 1rem', textAlign: 'center', color: C.accent, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>P acumulada</th>
                                            <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: C.accent, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>Visualización</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dist.map((row, i) => (
                                            <tr key={row.n} style={{ background: i % 2 === 0 ? 'transparent' : C.tableRowAlt, transition: 'background 0.15s' }}>
                                                <td style={{ padding: '0.55rem 1rem', textAlign: 'center', fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}` }}>{row.n}</td>
                                                <td style={{ padding: '0.55rem 1rem', textAlign: 'center', fontFamily: 'monospace', color: C.green, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{fmt(row.pn)}</td>
                                                <td style={{ padding: '0.55rem 1rem', textAlign: 'center', fontFamily: 'monospace', color: C.accent2, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{fmt(row.acum)}</td>
                                                <td style={{ padding: '0.55rem 1rem', borderBottom: `1px solid ${C.border}` }}>
                                                    <div style={{ width: '100%', height: '8px', background: C.tableBg, borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${Math.min(row.pn * 100 / (dist[0]?.pn || 1) * 100, 100)}%`,
                                                            height: '100%',
                                                            background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})`,
                                                            borderRadius: '4px',
                                                            transition: 'width 0.4s ease',
                                                            minWidth: row.pn > 0 ? '2px' : '0',
                                                        }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
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
                                            <linearGradient id="cdfGradColas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={C.accent2} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={C.accent2} stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                                        <XAxis dataKey="n" stroke={C.muted} tick={{ fontSize: 11 }} />
                                        <YAxis stroke={C.muted} tick={{ fontSize: 11 }} domain={[0, 1]} tickFormatter={v => v.toFixed(2)} />
                                        <Tooltip content={<CustomTooltip labelPrefix="n" />} />
                                        <Area type="stepAfter" dataKey="cdf" name="F(n)" stroke={C.accent2} fill="url(#cdfGradColas)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.72rem', paddingBottom: '1rem' }}>
                        Líneas de Espera — Teoría de Colas M/M/1 &amp; M/M/1/K
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </AppLayout>
    );
}
