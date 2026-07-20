import React, { useState, useMemo, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { jStat } from 'jstat';
import {
    BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Dices, Ruler, BarChart2, TrendingUp, Activity, Compass, X } from 'lucide-react';
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
    titleGradient: 'linear-gradient(135deg,#e2e8f0,#a5b4fc)',
    tabInactiveBg: 'rgba(30,41,59,0.8)',
    tabInactiveBorder: 'rgba(99,102,241,0.18)',
    tabInactiveText: '#64748b',
};
const LIGHT_C = {
    ...LIGHT_BASE,
    resultContinuaBg: 'rgba(79,70,229,0.07)',
    resultContinuaBorder: 'rgba(79,70,229,0.30)',
    disabledBg: 'rgba(241,245,249,0.8)',
    disabledBorder: 'rgba(148,163,184,0.3)',
    labelText: '#1e293b',
    infoBoxText: '#1e293b',
    titleGradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    tabInactiveBg: 'rgba(241,245,249,0.8)',
    tabInactiveBorder: 'rgba(99,102,241,0.18)',
};

// ─── Helpers ─────────────────────────────────────────────────────────
const fmt = (n, d = 6) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(d) : '—';

// ─── 9 casos ─────────────────────────────────────────────────────────
// skipIfContinua: en distribuciones continuas P(x>a)=P(x≥a), P(x<a)=P(x≤a),
// y todos los casos de intervalo son iguales (P puntual=0), por lo que
// solo se muestra P(a ≤ x ≤ b) como representante del intervalo.
const getCasos = (xi, xj) => [
    { key: 'p_mayor_xi', label: `P(x > ${xi})`, interval: false, skipIfContinua: true },
    { key: 'p_menor_xi', label: `P(x < ${xi})`, interval: false, skipIfContinua: true },
    { key: 'p_igual_xi', label: `P(x = ${xi})`, interval: false, skipIfContinua: false },
    { key: 'p_mayor_igual_xi', label: `P(x ≥ ${xi})`, interval: false, skipIfContinua: false },
    { key: 'p_menor_igual_xi', label: `P(x ≤ ${xi})`, interval: false, skipIfContinua: false },
    { key: 'p_entre_strict', label: `P(${xi} < x < ${xj})`, interval: true, skipIfContinua: true },
    { key: 'p_entre_inc_inc', label: `P(${xi} ≤ x ≤ ${xj})`, interval: true, skipIfContinua: false },
    { key: 'p_entre_inc_exc', label: `P(${xi} ≤ x < ${xj})`, interval: true, skipIfContinua: true },
    { key: 'p_entre_exc_inc', label: `P(${xi} < x ≤ ${xj})`, interval: true, skipIfContinua: true },
];

// ─── Sub-nav del módulo ───────────────────────────────────────────────
const SUB_NAV_DEF = [
    { id: 'config', Icon: Settings, label: 'Configuración' },
    { id: 'prob', Icon: Dices, label: 'Probabilidades' },
    { id: 'stats', Icon: Ruler, label: 'Estadísticos' },
    { id: 'graficas', Icon: BarChart2, label: 'Gráficas' },
];

// ─── Tour Guiado — datos por sección ────────────────────────────────
const TOUR_STEPS_CALC = [
    {
        targetId: 'sec-config',
        sectionName: 'Configuración',
        Icon: Settings,
        accentColor: '#6366f1',
        what: 'Aquí ingresas los datos de entrada: distribución, λ y los valores x para los cálculos.',
        dos: [
            'Selecciona la distribución (Poisson o Exponencial) según tu problema.',
            'Ingresa λ mayor que cero.',
            'Define xᵢ y xⱼ (xⱼ > xᵢ) para calcular probabilidades de intervalo.',
        ],
        donts: [
            'No dejes λ en cero ni negativo.',
            'No pongas xⱼ ≤ xᵢ — los intervalos mostrarán N/A.',
            'No ingreses valores negativos ni texto en los campos.',
        ],
    },
    {
        targetId: 'sec-prob',
        sectionName: 'Probabilidades',
        Icon: Dices,
        accentColor: '#10b981',
        what: 'Muestra los resultados de probabilidad para cada caso: mayor, menor, igual e intervalos.',
        dos: [
            'Lee cada tarjeta para ver el valor de cada caso de probabilidad.',
            'Las tarjetas grises (N/A) indican que xⱼ no está definido aún.',
            'En Exponencial, P(x = xᵢ) siempre es 0 — es correcto matemáticamente.',
        ],
        donts: [
            'No esperes P(X = x) ≠ 0 en distribución Exponencial.',
            'No ignores los N/A — significa que debes definir xⱼ en Configuración.',
        ],
    },
    {
        targetId: 'sec-stats',
        sectionName: 'Estadísticos',
        Icon: Ruler,
        accentColor: '#f59e0b',
        what: 'Muestra los indicadores estadísticos de la distribución: media, varianza, desviación estándar y más.',
        dos: [
            'Consulta la Media (μ) y la Varianza (σ²) para entender la distribución.',
            'Usa la Desviación Estándar para medir la dispersión de los datos.',
        ],
        donts: [
            'No confundas la Varianza (σ²) con la Desviación Estándar (σ).',
            'No uses la Media como si fuera una probabilidad — son conceptos distintos.',
        ],
    },
    {
        targetId: 'sec-graficas',
        sectionName: 'Gráficas',
        Icon: BarChart2,
        accentColor: '#8b5cf6',
        what: 'Visualiza la distribución de probabilidad (PMF/PDF) y la probabilidad acumulada (CDF) de forma interactiva.',
        dos: [
            'Usa la PMF/PDF para ver cómo se distribuye la probabilidad sobre los valores.',
            'Usa la CDF para leer la probabilidad acumulada hasta cualquier punto.',
            'Pasa el cursor sobre las barras/área para ver los valores exactos.',
        ],
        donts: [
            'No leas un punto de la PDF como probabilidad — necesitas un área (intervalo).',
            'No confundas PMF (Poisson, discreta) con PDF (Exponencial, continua).',
        ],
    },
];

export default function Calculadora() {
    const { isDark } = useTheme();
    const C = isDark ? DARK_C : LIGHT_C;

    // Estilos dinámicos según el tema
    const { cardStyle, labelStyle, inputStyle, selectStyle } = buildFormStyles(C);

    const [distribucion, setDistribucion] = useState('poisson');
    const [lambda, setLambda] = useState('3');
    const [xi, setXi] = useState('2');
    const [xj, setXj] = useState('5');
    const { activeSection, subNav } = useSectionNav(SUB_NAV_DEF, 'config');
    const [showTour, setShowTour] = useState(false);
    const [dismissedError, setDismissedError] = useState(false);


    const l = parseFloat(lambda);
    const x1 = parseFloat(xi);
    const x2 = parseFloat(xj);
    const valid = !isNaN(l) && l > 0 && !isNaN(x1) && x1 >= 0;
    const validInterval = valid && !isNaN(x2) && x2 > x1;
    const intervalError = !isNaN(x1) && !isNaN(x2) && x2 <= x1;

    useEffect(() => {
        if (!intervalError) {
            setDismissedError(false);
        }
    }, [intervalError]);

    // ── Probabilidades ───────────────────────────────────────────────
    const resultados = useMemo(() => {
        if (!valid) return null;
        if (distribucion === 'poisson') {
            const xi_ = Math.round(x1);
            // CDF(k) = P(X ≤ k),  CDF(k-1) = P(X ≤ k-1) = P(X < k)
            const cdf_xi = jStat.poisson.cdf(xi_, l);            // P(X ≤ xᵢ)
            const cdf_xi1 = xi_ > 0 ? jStat.poisson.cdf(xi_ - 1, l) : 0; // P(X ≤ xᵢ-1) = P(X < xᵢ)
            const pmf_xi = jStat.poisson.pdf(xi_, l);            // P(X = xᵢ)

            let p_entre_strict = 0, p_entre_inc_inc = 0, p_entre_inc_exc = 0, p_entre_exc_inc = 0;
            if (validInterval) {
                const xj_ = Math.round(x2);
                const cdf_xj = jStat.poisson.cdf(xj_, l);           // P(X ≤ xⱼ)
                const cdf_xj1 = xj_ > 0 ? jStat.poisson.cdf(xj_ - 1, l) : 0; // P(X < xⱼ)
                // P(xᵢ < x < xⱼ)  = P(X ≤ xⱼ-1) - P(X ≤ xᵢ)
                p_entre_strict = Math.max(0, cdf_xj1 - cdf_xi);
                // P(xᵢ ≤ x ≤ xⱼ)  = P(X ≤ xⱼ)   - P(X ≤ xᵢ-1)
                p_entre_inc_inc = Math.max(0, cdf_xj - cdf_xi1);
                // P(xᵢ ≤ x < xⱼ)  = P(X ≤ xⱼ-1) - P(X ≤ xᵢ-1)
                p_entre_inc_exc = Math.max(0, cdf_xj1 - cdf_xi1);
                // P(xᵢ < x ≤ xⱼ)  = P(X ≤ xⱼ)   - P(X ≤ xᵢ)
                p_entre_exc_inc = Math.max(0, cdf_xj - cdf_xi);
            }
            return {
                // Casos simples
                p_mayor_xi: 1 - cdf_xi,   // P(X > xᵢ)  = 1 - P(X ≤ xᵢ)
                p_menor_xi: cdf_xi1,       // P(X < xᵢ)  = P(X ≤ xᵢ-1)
                p_igual_xi: pmf_xi,        // P(X = xᵢ)  = PMF(xᵢ)
                p_mayor_igual_xi: 1 - cdf_xi1,  // P(X ≥ xᵢ)  = 1 - P(X ≤ xᵢ-1)
                p_menor_igual_xi: cdf_xi,        // P(X ≤ xᵢ)  = CDF(xᵢ)
                // Casos intervalo
                p_entre_strict, p_entre_inc_inc, p_entre_inc_exc, p_entre_exc_inc,
            };
        } else {
            // Exponencial continua: P(X = x) = 0 siempre
            const cdf_xi = jStat.exponential.cdf(x1, l);  // P(X ≤ xᵢ)
            let p_entre_strict = 0, p_entre_inc_inc = 0, p_entre_inc_exc = 0, p_entre_exc_inc = 0;
            if (validInterval) {
                const cdf_xj = jStat.exponential.cdf(x2, l);
                const diff = cdf_xj - cdf_xi;
                // Para continua todos los casos de intervalo son iguales (P puntual = 0)
                p_entre_strict = p_entre_inc_inc = p_entre_inc_exc = p_entre_exc_inc = Math.max(0, diff);
            }
            return {
                p_mayor_xi: 1 - cdf_xi,  // P(X > xᵢ)  = 1 - CDF(xᵢ)
                p_menor_xi: cdf_xi,       // P(X < xᵢ)  = CDF(xᵢ)  [igual a ≤ en continua]
                p_igual_xi: 0,            // P(X = xᵢ)  = 0 (distribución continua)
                p_mayor_igual_xi: 1 - cdf_xi,  // P(X ≥ xᵢ)  = P(X > xᵢ) en continua
                p_menor_igual_xi: cdf_xi,       // P(X ≤ xᵢ)  = CDF(xᵢ)
                p_entre_strict, p_entre_inc_inc, p_entre_inc_exc, p_entre_exc_inc,
            };
        }
    }, [distribucion, l, x1, x2, valid, validInterval]);

    // ── Estadísticos ─────────────────────────────────────────────────
    const estadisticos = useMemo(() => {
        if (!valid) return null;
        if (distribucion === 'poisson') {
            const media = l, varianza = l, desv = Math.sqrt(l);
            return { media, varianza, desv, asimetria: 1 / desv, curtosis: 1 / l, cv: (desv / media) * 100 };
        } else {
            const media = 1 / l, desv = 1 / l;
            return { media, varianza: 1 / (l * l), desv, asimetria: 2, curtosis: 6, cv: 100 };
        }
    }, [distribucion, l, valid]);

    // ── Datos gráficas ───────────────────────────────────────────────
    const datosGrafica = useMemo(() => {
        if (!valid) return [];
        if (distribucion === 'poisson') {
            const maxX = Math.max(20, Math.ceil(l + 4 * Math.sqrt(l)));
            return Array.from({ length: maxX + 1 }, (_, x) => ({
                x, pmf: jStat.poisson.pdf(x, l), cdf: jStat.poisson.cdf(x, l),
            }));
        } else {
            const maxX = Math.ceil((1 / l) * 5);
            return Array.from({ length: 81 }, (_, i) => {
                const x = (i / 80) * maxX;
                return { x: parseFloat(x.toFixed(3)), pdf: jStat.exponential.pdf(x, l), cdf: jStat.exponential.cdf(x, l) };
            });
        }
    }, [distribucion, l, valid]);

    // ── Render ────────────────────────────────────────────────────────
    return (
        <AppLayout subNav={subNav} activeSubSection={activeSection}>
            <Head title="Calculadora de Distribuciones" />

            {showTour && <TourOverlay steps={TOUR_STEPS_CALC} onClose={() => setShowTour(false)} />}

            {/* ── Toast de advertencia premium en el centro ── */}
            {intervalError && !dismissedError && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2000,
                    pointerEvents: 'none',
                    animation: 'alertEntrance 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(24, 20, 15, 0.95), rgba(15, 10, 5, 0.98))',
                        border: '2px solid #f59e0b',
                        borderRadius: '1.25rem',
                        padding: '2.5rem',
                        boxShadow: '0 0 50px rgba(245, 158, 11, 0.3), 0 30px 80px rgba(0, 0, 0, 0.8)',
                        textAlign: 'center',
                        maxWidth: '400px',
                        width: '90vw',
                        backdropFilter: 'blur(8px)',
                        position: 'relative',
                        pointerEvents: 'auto',
                    }}>
                        {/* Botón Cerrar */}
                        <button
                            onClick={() => setDismissedError(true)}
                            style={{
                                position: 'absolute',
                                top: '0.75rem',
                                right: '0.75rem',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '0.5rem',
                                padding: '0.45rem',
                                color: '#fbbf24',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
                                e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                                e.currentTarget.style.color = '#fbbf24';
                            }}
                        >
                            <X size={14} />
                        </button>

                        <div style={{
                            fontSize: '3.5rem',
                            marginBottom: '1rem',
                            animation: 'bounceSlow 2s ease-in-out infinite alternate',
                        }}>⚠️</div>
                        <h3 style={{
                            margin: '0 0 0.5rem',
                            color: '#fbbf24',
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                        }}>
                            Intervalo Inválido
                        </h3>
                        <p style={{
                            margin: '0 0 1rem',
                            color: '#e2e8f0',
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                        }}>
                            El valor superior <strong style={{ color: '#fbbf24' }}>xⱼ</strong> debe ser estrictamente mayor que el valor inferior <strong style={{ color: '#fbbf24' }}>xᵢ</strong>.
                        </p>
                        <div style={{
                            display: 'inline-block',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.75rem',
                            color: '#f59e0b',
                            fontWeight: 600,
                        }}>
                            Cálculo de intervalo deshabilitado (N/A)
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
                {/* Header */}
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '0.65rem', padding: '0.3rem 1rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>
                            SIMULACIÓN Y OPTIMIZACIÓN
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.3rem', color: C.titleColor }}>
                            Calculadora de Distribuciones
                        </h1>
                        <p style={{ color: C.muted, fontSize: '0.88rem', margin: 0 }}>Poisson (Discreta) &amp; Exponencial (Continua)</p>
                    </div>
                    {/* Botón Tour Guiado */}
                    <button
                        id="btn-tour-guiado"
                        onClick={() => setShowTour(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.5)', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s ease', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', flexShrink: 0, marginTop: '0.25rem' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35))'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.8)'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.2)'; }}
                    >
                        <Compass size={15} /> Tour Guiado
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ── SECCIÓN 1: Config + Resultados ── */}
                    <div id="sec-config" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* Tab switcher distribución */}
                        <div style={{
                            display: 'inline-flex', borderRadius: '0.75rem', overflow: 'hidden',
                            border: `1px solid ${C.border}`,
                            background: C.card,
                            backdropFilter: 'blur(12px)',
                            alignSelf: 'flex-start',
                        }}>
                            {[
                                { id: 'poisson',     label: 'Poisson',     sub: 'Discreta',  Icon: Dices    },
                                { id: 'exponencial', label: 'Exponencial', sub: 'Continua',  Icon: Activity },
                            ].map(tab => {
                                const active = distribucion === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setDistribucion(tab.id)}
                                        style={{
                                            padding: '0.85rem 1.75rem',
                                            border: 'none',
                                            background: active ? C.tabActiveBg : 'transparent',
                                            color: active ? '#ffffff' : C.tabInactiveText,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                                            fontSize: '0.85rem', fontWeight: active ? 700 : 500,
                                            transition: 'all 0.25s ease',
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
                                        <tab.Icon size={16} />
                                        <div style={{ textAlign: 'left' }}>
                                            <div>{tab.label}</div>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 400 }}>{tab.sub}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Grid: Config + Resultados */}
                        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>

                        {/* Configuración */}
                        <div style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.accent, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Settings size={16} /> Configuración
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>{distribucion === 'poisson' ? 'Media (λ) — eventos/intervalo' : 'Tasa (λ) — 1/media'}</label>
                                    <input style={inputStyle} type="number" step="any" min="0.001" value={lambda} onChange={e => setLambda(e.target.value)} />
                                    {(isNaN(l) || l <= 0) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>λ debe ser mayor que 0</span>}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={labelStyle}>Valor xᵢ</label>
                                        <input style={inputStyle} type="number" step={distribucion === 'poisson' ? '1' : 'any'} min="0" value={xi} onChange={e => setXi(e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Valor xⱼ (sup.)</label>
                                        <input style={{ ...inputStyle, borderColor: (!isNaN(x2) && x2 <= x1) ? C.danger : C.border }} type="number" step={distribucion === 'poisson' ? '1' : 'any'} min="0" value={xj} onChange={e => setXj(e.target.value)} />
                                    </div>
                                </div>
                                {!isNaN(x2) && x2 <= x1 && <span style={{ color: C.amber, fontSize: '0.72rem' }}>⚠ xⱼ debe ser mayor que xᵢ</span>}
                                <div style={{ background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.85rem', color: C.infoBoxText }}>
                                    {distribucion === 'poisson'
                                        ? <><b style={{ color: C.accent }}>Poisson:</b> discreta, eventos en intervalo fijo. xᵢ se redondea al entero más cercano.</>
                                        : <><b style={{ color: C.accent2 }}>Exponencial:</b> continua, tiempo entre eventos. P(X=x)=0, por lo que {'<'} y ≤ son equivalentes.</>
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Resultados 8 casos */}
                        <div id="sec-prob" style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.green, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Dices size={16} /> Resultados de Probabilidad
                            </h2>
                            {resultados ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {getCasos(xi, xj)
                                        .filter(({ skipIfContinua }) => !(distribucion === 'exponencial' && skipIfContinua))
                                        .map(({ key, label, interval }) => {
                                            const val = resultados[key];
                                            const disabled = interval && !validInterval;
                                            // P(X=xᵢ) en distribución continua: mostrar 0 con nota especial
                                            const isIgualContinua = key === 'p_igual_xi' && distribucion !== 'poisson';
                                            return (
                                                <div key={key} style={{
                                                    background: disabled
                                                        ? C.disabledBg
                                                        : isIgualContinua
                                                            ? C.resultContinuaBg
                                                            : C.resultBg,
                                                    border: `1px solid ${disabled
                                                        ? C.disabledBorder
                                                        : isIgualContinua
                                                            ? C.resultContinuaBorder
                                                            : C.resultBorder
                                                        }`,
                                                    borderRadius: '0.6rem', padding: '0.75rem 1rem',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    opacity: disabled ? 0.45 : 1,
                                                    transition: 'background 0.3s, border-color 0.3s',
                                                }}>
                                                    <span style={{ fontSize: '0.88rem', color: disabled ? C.muted : C.labelText, fontFamily: 'monospace' }}>{label}</span>
                                                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                                                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: disabled ? C.muted : isIgualContinua ? C.accent : C.green, display: 'block' }}>
                                                            {disabled ? 'N/A' : fmt(val)}
                                                        </span>
                                                        {isIgualContinua && !disabled && (
                                                            <span style={{ fontSize: '0.6rem', color: C.muted }}>continua: P puntual=0</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', color: C.danger }}>
                                    Introduce parámetros válidos (λ &gt; 0, xᵢ ≥ 0)
                                </div>
                            )}
                        </div>
                        </div>
                    </div>

                    {/* ── SECCIÓN 2: Estadísticos ── */}
                    {estadisticos && (
                        <div id="sec-stats" style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.amber, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Ruler size={16} /> Estadísticos Descriptivos
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
                                {[
                                    { label: 'Media (μ)', value: fmt(estadisticos.media, 4), sub: 'E[X]' },
                                    { label: 'Varianza (σ²)', value: fmt(estadisticos.varianza, 4), sub: 'Var[X]' },
                                    { label: 'Desv. Estándar (σ)', value: fmt(estadisticos.desv, 4), sub: '√Var[X]' },
                                    { label: 'Asimetría', value: fmt(estadisticos.asimetria, 4), sub: 'Skewness' },
                                    { label: 'Curtosis', value: fmt(estadisticos.curtosis, 4), sub: 'Exceso' },
                                    { label: 'Coef. Variación', value: fmt(estadisticos.cv, 2) + '%', sub: 'σ/μ × 100' },
                                ].map(({ label, value, sub }) => (
                                    <div key={label} style={{ background: C.statBg, border: `1px solid ${C.statBorder}`, borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', transition: 'background 0.3s' }}>
                                        <div style={{ fontSize: '0.68rem', color: C.muted, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.amber }}>{value}</div>
                                        <div style={{ fontSize: '0.62rem', color: C.muted, marginTop: '0.2rem' }}>{sub}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── SECCIÓN 3: Gráficas ── */}
                    {datosGrafica.length > 0 && (
                        <div id="sec-graficas" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                            {/* PMF / PDF */}
                            <div style={cardStyle}>
                                <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: C.accent, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart2 size={16} />{distribucion === 'poisson' ? 'Función de Masa de Probabilidad (PMF)' : 'Función de Densidad de Probabilidad (PDF)'}</span>
                                </h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    {distribucion === 'poisson' ? (
                                        <BarChart data={datosGrafica} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                                            <XAxis dataKey="x" stroke={C.muted} tick={{ fontSize: 11 }} />
                                            <YAxis stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(3)} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <ReferenceLine x={Math.round(x1)} stroke={C.green} strokeDasharray="4 2" label={{ value: 'xᵢ', fill: C.green, fontSize: 11 }} />
                                            {validInterval && <ReferenceLine x={Math.round(x2)} stroke={C.amber} strokeDasharray="4 2" label={{ value: 'xⱼ', fill: C.amber, fontSize: 11 }} />}
                                            <Bar dataKey="pmf" name="P(X=x)" fill={C.accent} radius={[3, 3, 0, 0]} />
                                        </BarChart>
                                    ) : (
                                        <AreaChart data={datosGrafica} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="pdfGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={C.accent2} stopOpacity={0.5} />
                                                    <stop offset="95%" stopColor={C.accent2} stopOpacity={0.05} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                                            <XAxis dataKey="x" stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => Number(v).toFixed(1)} />
                                            <YAxis stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(3)} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <ReferenceLine x={x1} stroke={C.green} strokeDasharray="4 2" />
                                            {validInterval && <ReferenceLine x={x2} stroke={C.amber} strokeDasharray="4 2" />}
                                            <Area type="monotone" dataKey="pdf" name="f(x)" stroke={C.accent2} fill="url(#pdfGrad)" strokeWidth={2} dot={false} />
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
                            </div>

                            {/* CDF */}
                            <div style={cardStyle}>
                                <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: C.accent2, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={16} /> Función de Distribución Acumulada (CDF)</span>
                                </h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={datosGrafica} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="cdfGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={C.accent} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={C.accent} stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                                        <XAxis dataKey="x" stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => distribucion === 'exponencial' ? Number(v).toFixed(1) : v} />
                                        <YAxis stroke={C.muted} tick={{ fontSize: 11 }} domain={[0, 1]} tickFormatter={v => v.toFixed(2)} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <ReferenceLine x={distribucion === 'poisson' ? Math.round(x1) : x1} stroke={C.green} strokeDasharray="4 2" label={{ value: 'xᵢ', fill: C.green, fontSize: 11 }} />
                                        {validInterval && <ReferenceLine x={distribucion === 'poisson' ? Math.round(x2) : x2} stroke={C.amber} strokeDasharray="4 2" label={{ value: 'xⱼ', fill: C.amber, fontSize: 11 }} />}
                                        <Area type={distribucion === 'poisson' ? 'stepAfter' : 'monotone'} dataKey="cdf" name="F(x)" stroke={C.accent} fill="url(#cdfGrad)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.72rem', paddingBottom: '1rem' }}>
                        Calculadora de Distribuciones — Poisson &amp; Exponencial
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}