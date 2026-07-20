import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Settings, BarChart2, Table, Download, BookOpen,
    Play, Shuffle, TrendingUp, FileText, FileDown, Compass,
} from 'lucide-react';
import TourOverlay from '@/Components/TourOverlay';
import CustomTooltip from '@/Components/CustomTooltip';
import useSectionNav from '@/hooks/useSectionNav';
import { buildFormStyles } from '@/theme/formStyles';
import { DARK_BASE, LIGHT_BASE } from '@/theme/palettes';

// ─── Paletas de tema (base compartida + extras propios de este módulo) ─
const DARK_C = {
    ...DARK_BASE,
    pink: '#f472b6',
    tabInactiveText: '#94a3b8',
    codeBlock: 'rgba(15,23,42,0.8)',
    codeBorder: 'rgba(99,102,241,0.2)',
};
const LIGHT_C = {
    ...LIGHT_BASE,
    pink: '#db2777',
    codeBlock: 'rgba(241,245,249,0.9)',
    codeBorder: 'rgba(79,70,229,0.15)',
};

// ─── Tour Guiado — pasos por sección ───────────────────────────────
const TOUR_STEPS_MONTECARLO = [
    {
        targetId: 'sec-config',
        sectionName: 'Configuración',
        Icon: Settings,
        accentColor: '#6366f1',
        what: 'Aquí defines los parámetros para ejecutar la simulación de Monte Carlo.',
        dos: [
            'Selecciona la distribución (Poisson o Exponencial) según tu ejercicio.',
            'Introduce un valor de λ mayor a cero.',
            'Elige cuántas variables deseas simular (columnas de la tabla, de 1 a 10).',
            'Elige cuántas observaciones generar por variable (filas, de 10 a 10,000).',
        ],
        donts: [
            'No dejes campos vacíos ni ingreses valores negativos.',
            'No intentes simular más de 10,000 observaciones para evitar lentitud en el navegador.',
        ],
    },
    {
        targetId: 'sec-resultados',
        sectionName: 'Estadísticos',
        Icon: TrendingUp,
        accentColor: '#fbbf24',
        what: 'Esta sección muestra los resultados muestrales de la simulación comparados contra los valores teóricos de la distribución.',
        dos: [
            'Compara la Media muestral x̄ contra la Media teórica μ para verificar la precisión.',
            'Analiza el "Error %" para observar la cercanía de la convergencia de la simulación.',
            'A mayor número de observaciones N, menor será el error porcentual.',
        ],
        donts: [
            'No te preocupes si con N pequeño el error porcentual es alto; la convergencia requiere muestras grandes.',
        ],
    },
    {
        targetId: 'sec-histograma',
        sectionName: 'Gráficas',
        Icon: BarChart2,
        accentColor: '#10b981',
        what: 'Visualiza la frecuencia empírica de los datos simulados frente a su curva teórica correspondiente.',
        dos: [
            'Elige qué variable graficar usando el selector superior.',
            'Observa cómo el histograma muestral (azul) se ajusta a la curva teórica (verde).',
            'Coloca el puntero del ratón sobre las barras para ver las probabilidades exactas.',
        ],
        donts: [
            'No confundas la altura del histograma con cantidades absolutas; representan densidades de probabilidad y frecuencias relativas.',
        ],
    },
    {
        targetId: 'sec-tabla',
        sectionName: 'Base de Datos',
        Icon: Table,
        accentColor: '#8b5cf6',
        what: 'Aquí se almacena el dataset completo generado por la simulación.',
        dos: [
            'Navega por las páginas de la tabla usando la barra de navegación inferior.',
            'Usa el botón "Exportar CSV" para descargar la base de datos completa y trabajarla en Excel.',
            'Usa el botón "Exportar PDF" para generar un reporte formal para imprimir o entregar.',
        ],
        donts: [
            'No asumas que la tabla muestra todo a la vez; está paginada en grupos de 20 registros por motivos de rendimiento visual.',
        ],
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────
const fmt = (n, d = 4) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(d) : '—';
const fmtShort = (n) => fmt(n, 2);

// ─── Algoritmos de Simulación ─────────────────────────────────────────

/**
 * Genera N observaciones de una distribución Exponencial con tasa lambda.
 * Método: Transformación Inversa.
 * F^{-1}(U) = -ln(1-U) / lambda
 */
function simularExponencial(lambda, n) {
    const datos = new Array(n);
    for (let i = 0; i < n; i++) {
        const U = Math.random();
        datos[i] = -Math.log(1 - U) / lambda;
    }
    return datos;
}

/**
 * Genera N observaciones de una distribución Poisson con tasa lambda.
 * Método: Algoritmo multiplicativo de Knuth.
 */
function simularPoisson(lambda, n) {
    const datos = new Array(n);
    const L = Math.exp(-lambda);
    for (let i = 0; i < n; i++) {
        let k = 0;
        let p = 1.0;
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        datos[i] = k - 1;
    }
    return datos;
}

/** Calcula estadísticos descriptivos de un arreglo. */
function calcularEstadisticos(datos) {
    const n = datos.length;
    if (n === 0) return null;
    const media = datos.reduce((a, b) => a + b, 0) / n;
    const varianza = datos.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1);
    const desv = Math.sqrt(varianza);
    const min = Math.min(...datos);
    const max = Math.max(...datos);
    return { n, media, varianza, desv, min, max };
}

/** Genera datos de histograma agrupando en bins. */
function generarHistograma(datos, numBins, lambda, distribucion) {
    if (!datos || datos.length === 0) return [];
    const min = Math.min(...datos);
    const max = Math.max(...datos);
    if (min === max) return [];

    if (distribucion === 'poisson') {
        // Para Poisson: agrupar por valor entero
        const maxVal = Math.min(max, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
        const freq = {};
        for (let i = 0; i <= maxVal; i++) freq[i] = 0;
        datos.forEach(v => {
            const vi = Math.round(v);
            if (vi >= 0 && vi <= maxVal) freq[vi] = (freq[vi] || 0) + 1;
        });
        const n = datos.length;
        return Object.entries(freq).map(([k, count]) => {
            const kn = parseInt(k);
            // PMF teórica de Poisson
            let pmf = (Math.pow(lambda, kn) * Math.exp(-lambda));
            let fact = 1;
            for (let i = 2; i <= kn; i++) fact *= i;
            pmf /= fact;
            return {
                x: kn,
                label: `${kn}`,
                frec: count / n,
                teorica: pmf,
            };
        });
    } else {
        // Para Exponencial: bins de ancho uniforme
        const bins = Math.max(10, Math.min(numBins, 40));
        const ancho = (max - min) / bins;
        const histData = Array.from({ length: bins }, (_, i) => ({
            x: min + (i + 0.5) * ancho,
            label: fmtShort(min + (i + 0.5) * ancho),
            frec: 0,
            teorica: 0,
        }));
        datos.forEach(v => {
            const idx = Math.min(Math.floor((v - min) / ancho), bins - 1);
            histData[idx].frec++;
        });
        const n = datos.length;
        histData.forEach(bin => {
            bin.frec = bin.frec / n / ancho; // densidad
            bin.teorica = lambda * Math.exp(-lambda * bin.x); // PDF exponencial
        });
        return histData;
    }
}

// ─── Sub-nav ──────────────────────────────────────────────────────────
const SUB_NAV_DEF = [
    { id: 'config',    Icon: Settings,   label: 'Configuración' },
    { id: 'resultados',Icon: TrendingUp, label: 'Estadísticos' },
    { id: 'histograma',Icon: BarChart2,  label: 'Histograma' },
    { id: 'tabla',     Icon: Table,      label: 'Base de Datos' },
];

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
export default function MonteCarlo() {
    const { isDark } = useTheme();
    const C = isDark ? DARK_C : LIGHT_C;
    const pdfRef = useRef(null);

    // ── Estilos dinámicos ─────────────────────────────────────────────
    const { cardStyle, labelStyle, inputStyle } = buildFormStyles(C);

    // ── State ─────────────────────────────────────────────────────────
    const [distribucion, setDistribucion] = useState('poisson');
    const [lambda, setLambda] = useState('3');
    const [numVars, setNumVars] = useState('3');
    const [numObs, setNumObs] = useState('500');
    const { activeSection, subNav } = useSectionNav(SUB_NAV_DEF, 'config');
    const [showTour, setShowTour] = useState(false);
    const [simulacion, setSimulacion] = useState(null); // { datos: [], stats: [] }
    const [paginaTabla, setPaginaTabla] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);
    const [varSeleccionada, setVarSeleccionada] = useState(0);

    const ROWS_PER_PAGE = 20;

    const l = parseFloat(lambda);
    const M = parseInt(numVars, 10);
    const N = parseInt(numObs, 10);

    const isValid = !isNaN(l) && l > 0 && !isNaN(M) && M >= 1 && M <= 10 && !isNaN(N) && N >= 10 && N <= 10000;

    // ── Ejecutar Simulación ───────────────────────────────────────────
    const ejecutarSimulacion = useCallback(() => {
        if (!isValid) return;
        setIsSimulating(true);
        setPaginaTabla(0);
        setVarSeleccionada(0);

        // Pequeño timeout para que el UI actualice antes del cálculo
        setTimeout(() => {
            const simulFn = distribucion === 'poisson' ? simularPoisson : simularExponencial;
            const columnas = Array.from({ length: M }, (_, i) => {
                const datos = simulFn(l, N);
                const stats = calcularEstadisticos(datos);
                const mediaTeórica = distribucion === 'poisson' ? l : 1 / l;
                const varTeórica = distribucion === 'poisson' ? l : 1 / (l * l);
                return {
                    id: i,
                    nombre: `Variable ${i + 1}`,
                    datos,
                    stats,
                    mediaTeórica,
                    varTeórica,
                    errorMedia: Math.abs((stats.media - mediaTeórica) / mediaTeórica) * 100,
                };
            });
            setSimulacion({ columnas, distribucion, lambda: l, M, N });
            setIsSimulating(false);
        }, 50);
    }, [isValid, distribucion, l, M, N]);

    // ── Datos del histograma de la variable seleccionada ──────────────
    const histData = useMemo(() => {
        if (!simulacion) return [];
        const col = simulacion.columnas[varSeleccionada];
        if (!col) return [];
        return generarHistograma(col.datos, 25, simulacion.lambda, simulacion.distribucion);
    }, [simulacion, varSeleccionada]);

    // ── Exportar a CSV ────────────────────────────────────────────────
    const exportarCSV = useCallback(() => {
        if (!simulacion) return;
        const headers = simulacion.columnas.map(c => c.nombre).join(',');
        const rows = Array.from({ length: simulacion.N }, (_, i) =>
            simulacion.columnas.map(c => c.datos[i].toFixed(6)).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monte_carlo_${simulacion.distribucion}_lambda${simulacion.lambda}_N${simulacion.N}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [simulacion]);

    // ── Exportar a PDF ────────────────────────────────────────────────
    const exportarPDF = useCallback(() => {
        if (!simulacion) return;
        const { distribucion: dist, lambda: lam, M: mVars, N: nObs, columnas } = simulacion;
        const mediaTeor = dist === 'poisson' ? lam : 1 / lam;
        const varTeor = dist === 'poisson' ? lam : 1 / (lam * lam);

        let html = `
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; padding: 40px; font-size: 13px; }
  h1 { font-size: 24px; font-weight: 900; color: #3730a3; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 700; color: #4f46e5; margin: 24px 0 10px; border-bottom: 2px solid rgba(79,70,229,0.2); padding-bottom: 6px; }
  h3 { font-size: 13px; font-weight: 700; color: #1e293b; margin: 14px 0 6px; }
  .badge { display: inline-block; background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; border-radius: 8px; padding: 3px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 10px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th { background: rgba(79,70,229,0.1); color: #4f46e5; font-weight: 700; padding: 8px 12px; text-align: left; border-bottom: 2px solid rgba(79,70,229,0.2); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 7px 12px; border-bottom: 1px solid rgba(99,102,241,0.1); }
  tr:nth-child(even) td { background: rgba(99,102,241,0.03); }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
  .stat-card { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; padding: 12px; }
  .stat-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .stat-val { font-size: 18px; font-weight: 800; color: #059669; font-family: monospace; }
  .stat-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .teorica { color: #4f46e5; font-weight: 700; }
  .error-pct { color: #b45309; font-size: 11px; }
  .highlight { background: rgba(99,102,241,0.06); border-left: 3px solid #6366f1; padding: 10px 14px; border-radius: 0 6px 6px 0; margin: 10px 0; font-size: 12px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid rgba(99,102,241,0.15); color: #94a3b8; font-size: 11px; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<div class="badge">SIMULACIÓN Y OPTIMIZACIÓN</div>
<h1>Reporte: Simulación de Monte Carlo</h1>
<div class="subtitle">
  Distribución: <strong>${dist === 'poisson' ? 'Poisson' : 'Exponencial'}</strong> &nbsp;|&nbsp;
  λ = <strong>${lam}</strong> &nbsp;|&nbsp;
  Variables: <strong>${mVars}</strong> &nbsp;|&nbsp;
  Observaciones por variable: <strong>${nObs.toLocaleString()}</strong>
</div>

<h2>Parámetros Teóricos</h2>
<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-label">Media Teórica (μ)</div>
    <div class="stat-val">${mediaTeor.toFixed(6)}</div>
    <div class="stat-sub">${dist === 'poisson' ? 'E[X] = λ' : 'E[X] = 1/λ'}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Varianza Teórica (σ²)</div>
    <div class="stat-val">${varTeor.toFixed(6)}</div>
    <div class="stat-sub">${dist === 'poisson' ? 'Var[X] = λ' : 'Var[X] = 1/λ²'}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">Desv. Estándar Teórica (σ)</div>
    <div class="stat-val">${Math.sqrt(varTeor).toFixed(6)}</div>
    <div class="stat-sub">σ = √Var[X]</div>
  </div>
</div>

<h2>Estadísticos Muestrales por Variable</h2>
<table>
  <thead>
    <tr>
      <th>Variable</th>
      <th>N</th>
      <th>Media (x̄)</th>
      <th>Varianza (S²)</th>
      <th>Desv. Est. (S)</th>
      <th>Mínimo</th>
      <th>Máximo</th>
      <th>Error % Media</th>
    </tr>
  </thead>
  <tbody>
    ${columnas.map(c => `
    <tr>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.stats.n}</td>
      <td>${c.stats.media.toFixed(6)}</td>
      <td>${c.stats.varianza.toFixed(6)}</td>
      <td>${c.stats.desv.toFixed(6)}</td>
      <td>${c.stats.min.toFixed(4)}</td>
      <td>${c.stats.max.toFixed(4)}</td>
      <td class="error-pct">${c.errorMedia.toFixed(4)}%</td>
    </tr>`).join('')}
  </tbody>
</table>

<h2>Algoritmo Utilizado</h2>
${dist === 'exponencial' ? `
<div class="highlight">
  <strong>Método de la Transformación Inversa (Exponencial):</strong><br>
  F⁻¹(U) = −(1/λ) · ln(1 − U)<br>
  Donde U ~ Uniforme(0,1). Se genera un número aleatorio U y se aplica la inversa de la CDF.
</div>
` : `
<div class="highlight">
  <strong>Algoritmo Multiplicativo de Knuth (Poisson):</strong><br>
  Se generan números aleatorios U₁, U₂, ... sucesivamente. Se cuenta cuántos productos<br>
  U₁ · U₂ · ... · Uₖ ≥ e^{−λ}, y se devuelve k − 1 como la observación simulada.
</div>
`}

<h2>Primeras 50 Observaciones</h2>
<table>
  <thead>
    <tr>
      <th>Obs. #</th>
      ${columnas.map(c => `<th>${c.nombre}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${Array.from({ length: Math.min(50, nObs) }, (_, i) => `
    <tr>
      <td>${i + 1}</td>
      ${columnas.map(c => `<td>${c.datos[i].toFixed(4)}</td>`).join('')}
    </tr>`).join('')}
  </tbody>
</table>
${nObs > 50 ? `<p style="color:#64748b;font-size:11px;margin-top:6px;">* Se muestran las primeras 50 de ${nObs.toLocaleString()} observaciones totales. Exporta el CSV para ver el dataset completo.</p>` : ''}

<div class="footer">
  SimOptimización · Simulación de Monte Carlo · Generado el ${new Date().toLocaleString('es-ES')}
</div>
</body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
            win.onload = () => {
                win.print();
                URL.revokeObjectURL(url);
            };
        }
    }, [simulacion]);

    // ── Paginación de tabla ───────────────────────────────────────────
    const totalPaginas = simulacion ? Math.ceil(simulacion.N / ROWS_PER_PAGE) : 0;
    const filasPagina = simulacion
        ? Array.from({ length: Math.min(ROWS_PER_PAGE, simulacion.N - paginaTabla * ROWS_PER_PAGE) }, (_, i) => paginaTabla * ROWS_PER_PAGE + i)
        : [];

    // ─────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────
    return (
        <AppLayout subNav={subNav} activeSubSection={activeSection}>
            <Head title="Simulación de Monte Carlo" />

            {showTour && <TourOverlay steps={TOUR_STEPS_MONTECARLO} onClose={() => setShowTour(false)} />}

            <div style={{ padding: '2rem 1.5rem', background: C.bg, minHeight: '100vh' }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '0.65rem', padding: '0.3rem 1rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>
                            SIMULACIÓN Y OPTIMIZACIÓN
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.3rem', color: C.titleColor }}>
                            Simulación de Monte Carlo
                        </h1>
                        <p style={{ color: C.muted, fontSize: '0.88rem', margin: 0 }}>
                            Generación de bases de datos — Distribuciones Poisson &amp; Exponencial
                        </p>
                    </div>
                    {/* Botón Tour Guiado */}
                    <button
                        id="btn-tour-montecarlo"
                        onClick={() => setShowTour(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.5)', borderRadius: '0.75rem', padding: '0.6rem 1.1rem', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s ease', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', flexShrink: 0, marginTop: '0.25rem' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35))'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.8)'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.2)'; }}
                    >
                        <Compass size={15} /> Tour Guiado
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ═══ SECCIÓN 1: Config ═══ */}
                    <div id="sec-config" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>

                        {/* Panel izquierdo — Parámetros */}
                        <div style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.accent, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Settings size={16} /> Parámetros de Simulación
                            </h2>

                            {/* Selector distribución */}
                            <div style={{ marginBottom: '1rem' }}>
                                <span style={labelStyle}>Distribución</span>
                                <div style={{ display: 'flex', borderRadius: '0.5rem', overflow: 'hidden', border: `1px solid ${C.border}`, background: C.inputBg }}>
                                    {[
                                        { id: 'poisson', label: 'Poisson', sub: 'Discreta' },
                                        { id: 'exponencial', label: 'Exponencial', sub: 'Continua' },
                                    ].map(tab => {
                                        const act = distribucion === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setDistribucion(tab.id)}
                                                style={{
                                                    flex: 1, padding: '0.65rem 0.5rem', border: 'none',
                                                    background: act ? C.tabActiveBg : 'transparent',
                                                    color: act ? '#fff' : C.tabInactiveText,
                                                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: act ? 700 : 500,
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <div>{tab.label}</div>
                                                <div style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: 400 }}>{tab.sub}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Lambda */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>
                                    λ — {distribucion === 'poisson' ? 'Media (eventos/intervalo)' : 'Tasa (1/tiempo medio)'}
                                </label>
                                <input
                                    style={inputStyle} type="number" step="any" min="0.001"
                                    value={lambda} onChange={e => setLambda(e.target.value)}
                                    placeholder="Ej: 3"
                                />
                                {distribucion === 'exponencial' && !isNaN(l) && l > 0 && (
                                    <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.35rem' }}>
                                        Tiempo medio = 1/λ = {(1 / l).toFixed(4)} unidades
                                    </div>
                                )}
                                {(isNaN(l) || l <= 0) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>λ debe ser mayor que 0</span>}
                            </div>

                            {/* Número de variables */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>Número de variables a simular (M)</label>
                                <input
                                    style={inputStyle} type="number" step="1" min="1" max="10"
                                    value={numVars} onChange={e => setNumVars(e.target.value)}
                                    placeholder="Ej: 3"
                                />
                                <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.35rem' }}>
                                    Rango permitido: 1 a 10 variables (columnas del dataset)
                                </div>
                                {(!isNaN(M) && (M < 1 || M > 10)) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>M debe estar entre 1 y 10</span>}
                            </div>

                            {/* Número de observaciones */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Observaciones por variable (N)</label>
                                <input
                                    style={inputStyle} type="number" step="1" min="10" max="10000"
                                    value={numObs} onChange={e => setNumObs(e.target.value)}
                                    placeholder="Ej: 500"
                                />
                                <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.35rem' }}>
                                    Rango permitido: 10 a 10,000 filas por variable
                                </div>
                                {(!isNaN(N) && (N < 10 || N > 10000)) && <span style={{ color: C.danger, fontSize: '0.72rem' }}>N debe estar entre 10 y 10,000</span>}
                            </div>

                            {/* Info Box */}
                            <div style={{ background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.78rem', color: C.muted, lineHeight: 1.6, marginBottom: '1.25rem' }}>
                                {distribucion === 'poisson'
                                    ? <><b style={{ color: C.accent }}>Poisson:</b> Modela el número de eventos en un intervalo fijo. Parámetro λ = media = varianza.</>
                                    : <><b style={{ color: C.accent2 }}>Exponencial:</b> Modela el tiempo entre eventos. Parámetro λ = tasa. Media = 1/λ, Var = 1/λ².</>
                                }
                            </div>

                            {/* Botón simular */}
                            <button
                                onClick={ejecutarSimulacion}
                                disabled={!isValid || isSimulating}
                                style={{
                                    width: '100%', padding: '0.85rem',
                                    background: isValid ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.2)',
                                    border: 'none', borderRadius: '0.65rem',
                                    color: isValid ? '#ffffff' : C.muted,
                                    fontSize: '0.95rem', fontWeight: 700,
                                    cursor: isValid && !isSimulating ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                    transition: 'all 0.2s',
                                    boxShadow: isValid ? '0 4px 20px rgba(99,102,241,0.35)' : 'none',
                                }}
                                onMouseEnter={e => { if (isValid && !isSimulating) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                {isSimulating ? (
                                    <><Shuffle size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Simulando...</>
                                ) : (
                                    <><Play size={18} /> Ejecutar Simulación</>
                                )}
                            </button>
                        </div>

                        {/* Panel derecho — Resumen de configuración / estado */}
                        <div style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.green, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} /> Estado de la Simulación
                            </h2>

                            {simulacion ? (
                                <>
                                    {/* Resumen rápido */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        {[
                                            { label: 'Distribución', value: simulacion.distribucion === 'poisson' ? 'Poisson' : 'Exponencial', color: C.accent },
                                            { label: 'λ utilizada', value: fmt(simulacion.lambda), color: C.accent2 },
                                            { label: 'Variables (M)', value: simulacion.M, color: C.amber },
                                            { label: 'Observaciones (N)', value: simulacion.N.toLocaleString(), color: C.green },
                                        ].map(item => (
                                            <div key={item.label} style={{ background: C.resultBg, border: `1px solid ${C.resultBorder}`, borderRadius: '0.65rem', padding: '0.85rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.35rem' }}>{item.label}</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Botones de exportación */}
                                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        <button
                                            onClick={exportarCSV}
                                            style={{ flex: 1, padding: '0.65rem', background: 'rgba(16,185,129,0.1)', border: `1px solid rgba(16,185,129,0.3)`, borderRadius: '0.65rem', color: C.green, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
                                        >
                                            <Download size={15} /> Exportar CSV
                                        </button>
                                        <button
                                            onClick={exportarPDF}
                                            style={{ flex: 1, padding: '0.65rem', background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: '0.65rem', color: C.danger, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                        >
                                            <FileDown size={15} /> Exportar PDF
                                        </button>
                                    </div>

                                    {/* Mensaje de éxito */}
                                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.75rem', padding: '1rem', color: C.green, fontSize: '0.85rem', textAlign: 'center' }}>
                                        ✅ Simulación completada — {(simulacion.M * simulacion.N).toLocaleString()} datos generados en total.
                                        <br /><span style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.25rem', display: 'block' }}>Navega por las secciones del menú lateral para ver estadísticos, histograma y la base de datos.</span>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', gap: '1rem', opacity: 0.6 }}>
                                    <Shuffle size={48} style={{ color: C.muted }} />
                                    <p style={{ color: C.muted, fontSize: '0.9rem', textAlign: 'center', maxWidth: '280px', lineHeight: 1.6 }}>
                                        Configura los parámetros en el panel izquierdo y presiona <strong>"Ejecutar Simulación"</strong> para comenzar.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ SECCIÓN 2: Estadísticos por Variable ═══ */}
                    {simulacion && (
                        <div id="sec-resultados" style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.amber, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} /> Estadísticos Muestrales vs. Teóricos
                            </h2>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                                    <thead>
                                        <tr style={{ background: C.tableHeaderBg }}>
                                            {['Variable', 'N', 'Media x̄', 'Media μ (teórica)', 'Error %', 'Varianza S²', 'Varianza σ² (teórica)', 'Desv. S', 'Mínimo', 'Máximo'].map(h => (
                                                <th key={h} style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: C.accent, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {simulacion.columnas.map((col, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.tableRowAlt }}>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontWeight: 700, color: C.accent, borderBottom: `1px solid ${C.border}` }}>{col.nombre}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', color: C.text, borderBottom: `1px solid ${C.border}` }}>{col.stats.n.toLocaleString()}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.green, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{fmt(col.stats.media)}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.accent, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{fmt(col.mediaTeórica)}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: col.errorMedia < 5 ? C.green : C.danger, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{fmt(col.errorMedia, 3)}%</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.amber, borderBottom: `1px solid ${C.border}` }}>{fmt(col.stats.varianza)}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.accent2, borderBottom: `1px solid ${C.border}` }}>{fmt(col.varTeórica)}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.text, borderBottom: `1px solid ${C.border}` }}>{fmt(col.stats.desv)}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.muted, borderBottom: `1px solid ${C.border}` }}>{fmt(col.stats.min)}</td>
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.muted, borderBottom: `1px solid ${C.border}` }}>{fmt(col.stats.max)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: '1rem', background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.78rem', color: C.muted, lineHeight: 1.6 }}>
                                ℹ️ <strong>Convergencia:</strong> A mayor N, la media muestral (x̄) converge a la media teórica (μ) por la Ley de los Grandes Números. El "Error %" mide qué tan cerca está la simulación del valor teórico. Un error &lt;5% indica buena convergencia.
                            </div>
                        </div>
                    )}

                    {/* ═══ SECCIÓN 3: Histograma ═══ */}
                    {simulacion && histData.length > 0 && (
                        <div id="sec-histograma" style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.accent, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BarChart2 size={16} /> Histograma Empírico vs. Distribución Teórica
                                </h2>
                                {/* Selector de variable */}
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {simulacion.columnas.map((col, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setVarSeleccionada(i)}
                                            style={{
                                                padding: '0.35rem 0.75rem', border: 'none', borderRadius: '0.4rem',
                                                background: varSeleccionada === i ? C.tabActiveBg : C.inputBg,
                                                color: varSeleccionada === i ? '#fff' : C.muted,
                                                fontSize: '0.78rem', fontWeight: varSeleccionada === i ? 700 : 400,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                outline: `1px solid ${varSeleccionada === i ? 'transparent' : C.border}`,
                                            }}
                                        >
                                            {col.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={histData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                                    <XAxis dataKey="label" stroke={C.muted} tick={{ fontSize: 11 }} />
                                    <YAxis stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(3)} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: '0.8rem', color: C.muted }} />
                                    <Bar dataKey="frec" name={simulacion.distribucion === 'poisson' ? 'Frec. Relativa P(n)' : 'Densidad Emp.'} fill={C.accent} radius={[3, 3, 0, 0]} fillOpacity={0.75} />
                                    <Bar dataKey="teorica" name={simulacion.distribucion === 'poisson' ? 'PMF Teórica P(n)' : 'PDF Teórica f(x)'} fill={C.green} radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                                </BarChart>
                            </ResponsiveContainer>

                            <div style={{ marginTop: '0.75rem', background: C.infoBoxBg, border: `1px solid ${C.infoBoxBorder}`, borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.78rem', color: C.muted, lineHeight: 1.6 }}>
                                📊 La columna <span style={{ color: C.accent, fontWeight: 600 }}>azul</span> representa la frecuencia empírica de los datos simulados. La columna <span style={{ color: C.green, fontWeight: 600 }}>verde</span> representa el valor teórico exacto. A mayor N, mejor coinciden (Teorema Central del Límite).
                            </div>
                        </div>
                    )}

                    {/* ═══ SECCIÓN 4: Tabla / Base de Datos ═══ */}
                    {simulacion && (
                        <div id="sec-tabla" style={cardStyle}>
                            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: C.accent2, borderBottom: `1px solid ${C.border}`, paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Table size={16} /> Base de Datos Simulada
                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 400, color: C.muted }}>
                                    {simulacion.N.toLocaleString()} obs. × {simulacion.M} var. — Página {paginaTabla + 1}/{totalPaginas}
                                </span>
                            </h2>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                    <thead>
                                        <tr style={{ background: C.tableHeaderBg }}>
                                            <th style={{ padding: '0.6rem 0.85rem', color: C.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>#</th>
                                            {simulacion.columnas.map(col => (
                                                <th key={col.id} style={{ padding: '0.6rem 0.85rem', color: C.accent, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>
                                                    {col.nombre}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filasPagina.map((idx, i) => (
                                            <tr key={idx} style={{ background: i % 2 === 0 ? 'transparent' : C.tableRowAlt }}>
                                                <td style={{ padding: '0.5rem 0.85rem', textAlign: 'center', color: C.muted, fontSize: '0.75rem', borderBottom: `1px solid ${C.border}` }}>{idx + 1}</td>
                                                {simulacion.columnas.map(col => (
                                                    <td key={col.id} style={{ padding: '0.5rem 0.85rem', textAlign: 'center', fontFamily: 'monospace', color: C.text, borderBottom: `1px solid ${C.border}`, fontWeight: 500 }}>
                                                        {simulacion.distribucion === 'poisson'
                                                            ? col.datos[idx]
                                                            : col.datos[idx].toFixed(6)
                                                        }
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setPaginaTabla(0)}
                                    disabled={paginaTabla === 0}
                                    style={{ padding: '0.4rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: '0.4rem', background: 'transparent', color: paginaTabla === 0 ? C.muted : C.accent, cursor: paginaTabla === 0 ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                >« Primera</button>
                                <button
                                    onClick={() => setPaginaTabla(p => Math.max(0, p - 1))}
                                    disabled={paginaTabla === 0}
                                    style={{ padding: '0.4rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: '0.4rem', background: 'transparent', color: paginaTabla === 0 ? C.muted : C.accent, cursor: paginaTabla === 0 ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                >‹ Anterior</button>

                                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                    const p = Math.max(0, Math.min(paginaTabla - 2, totalPaginas - 5)) + i;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPaginaTabla(p)}
                                            style={{ padding: '0.4rem 0.7rem', border: `1px solid ${p === paginaTabla ? C.accent : C.border}`, borderRadius: '0.4rem', background: p === paginaTabla ? C.tabActiveBg : 'transparent', color: p === paginaTabla ? '#fff' : C.muted, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                        >{p + 1}</button>
                                    );
                                })}

                                <button
                                    onClick={() => setPaginaTabla(p => Math.min(totalPaginas - 1, p + 1))}
                                    disabled={paginaTabla === totalPaginas - 1}
                                    style={{ padding: '0.4rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: '0.4rem', background: 'transparent', color: paginaTabla === totalPaginas - 1 ? C.muted : C.accent, cursor: paginaTabla === totalPaginas - 1 ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                >Siguiente ›</button>
                                <button
                                    onClick={() => setPaginaTabla(totalPaginas - 1)}
                                    disabled={paginaTabla === totalPaginas - 1}
                                    style={{ padding: '0.4rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: '0.4rem', background: 'transparent', color: paginaTabla === totalPaginas - 1 ? C.muted : C.accent, cursor: paginaTabla === totalPaginas - 1 ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                >Última »</button>
                            </div>
                        </div>
                    )}



                    {/* Footer */}
                    <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.72rem', paddingBottom: '1rem' }}>
                        Simulación de Monte Carlo — Distribuciones Poisson &amp; Exponencial
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </AppLayout>
    );
}
