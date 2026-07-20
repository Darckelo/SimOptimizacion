import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Play, Square, Settings, Scissors, Clock,
    AlertTriangle, Printer, Eye,
} from 'lucide-react';

// ─── Paletas de tema ─────────────────────────────────────────────────
const DARK_C = {
    bg:           '#0f172a',
    card:         'rgba(30,41,59,0.90)',
    border:       'rgba(99,102,241,0.25)',
    accent:       '#6366f1',
    accent2:      '#8b5cf6',
    green:        '#10b981',
    amber:        '#f59e0b',
    red:          '#ef4444',
    text:         '#e2e8f0',
    muted:        '#64748b',
    inputBg:      'rgba(15,23,42,0.7)',
    titleColor:   '#e2e8f0',
    shopBg:       '#1e293b',
    shopWall:     '#334155',
    shopFloor:    '#0f172a',
    waiting:      'rgba(99,102,241,0.15)',
    waitingBorder:'rgba(99,102,241,0.4)',
    bar:          'rgba(245,158,11,0.12)',
    barBorder:    'rgba(245,158,11,0.35)',
    statBg:       'rgba(99,102,241,0.08)',
    statBorder:   'rgba(99,102,241,0.25)',
    badgeBg:      'rgba(16,185,129,0.12)',
    badgeBorder:  'rgba(16,185,129,0.3)',
    reportBg:     'rgba(15,23,42,0.98)',
};
const LIGHT_C = {
    bg:           '#f0f4ff',
    card:         '#ffffff',
    border:       'rgba(99,102,241,0.20)',
    accent:       '#4f46e5',
    accent2:      '#7c3aed',
    green:        '#059669',
    amber:        '#b45309',
    red:          '#dc2626',
    text:         '#1e293b',
    muted:        '#64748b',
    inputBg:      '#f8fafc',
    titleColor:   '#3730a3',
    shopBg:       '#e2e8f0',
    shopWall:     '#cbd5e1',
    shopFloor:    '#f1f5f9',
    waiting:      'rgba(99,102,241,0.08)',
    waitingBorder:'rgba(99,102,241,0.30)',
    bar:          'rgba(245,158,11,0.08)',
    barBorder:    'rgba(245,158,11,0.30)',
    statBg:       'rgba(99,102,241,0.06)',
    statBorder:   'rgba(99,102,241,0.20)',
    badgeBg:      'rgba(5,150,105,0.08)',
    badgeBorder:  'rgba(5,150,105,0.25)',
    reportBg:     '#ffffff',
};

// ─── Helpers matemáticos ─────────────────────────────────────────────
const randExp = (rate) => -Math.log(1 - Math.random()) / rate;
const fmt2 = (n) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(4) : '—';
const fmt0 = (n) => (typeof n === 'number' && isFinite(n)) ? Math.round(n) : '—';

// Probabilidades estado estable M/M/s y M/M/s/K
function calcProbabilities({ lambda, mu, s, limited, K }) {
    const rho = lambda / (s * mu);
    const a   = lambda / mu;
    // Términos Poisson parciales: a^n / n!
    const terms = [1];
    for (let n = 1; n <= s; n++) terms.push(terms[n - 1] * a / n);
    const asSfact = terms[s]; // a^s / s!

    let P0;
    if (!limited) {
        // M/M/s  (rho < 1 necesario)
        if (rho >= 1) return null;
        const sumLow  = terms.slice(0, s).reduce((acc, v) => acc + v, 0);
        const denom   = sumLow + asSfact / (1 - rho);
        P0 = 1 / denom;
    } else {
        // M/M/s/K
        const sumLow  = terms.reduce((acc, v) => acc + v, 0);
        const sumHigh = Math.abs(rho - 1) < 1e-10
            ? asSfact * (K - s)
            : asSfact * rho * (1 - Math.pow(rho, K - s)) / (1 - rho);
        P0 = 1 / (sumLow + sumHigh);
    }

    const pS   = asSfact * P0;
    const cap  = limited ? K : s + 60;
    const probs = [];
    let term = 1;
    for (let n = 0; n <= cap; n++) {
        if (n > 0) term = term * a / n;
        const pn = n <= s ? term * P0 : pS * Math.pow(rho, n - s);
        probs.push({ n, pn: Math.max(0, pn) });
        if (limited && n === K) break;
        if (!limited && pn < 1e-4 && n > s) break;
    }
    return { P0, rho, a, asSfact, pS, probs, rhoRaw: rho };
}

// Métricas analíticas completas
function calcMetrics({ lambda, mu, s, limited, K }) {
    const a   = lambda / mu;
    const rho = lambda / (s * mu);
    const base = calcProbabilities({ lambda, mu, s, limited, K });
    if (!base) return null;
    const { P0, pS, probs, rhoRaw } = base;

    let Ls = 0, Lq = 0, lambdaEff = lambda, lambdaLost = 0, Pk = 0;

    if (!limited) {
        if (rho >= 1) return null;
        const erlangC = (pS / (1 - rho));
        Lq = erlangC * rho / (1 - rho);
        Ls = Lq + a;
    } else {
        Pk = pS * Math.pow(rho, K - s);
        lambdaEff  = lambda * (1 - Pk);
        lambdaLost = lambda * Pk;
        probs.forEach(({ n, pn }) => {
            Ls += n * pn;
            if (n > s) Lq += (n - s) * pn;
        });
    }

    const Wq = lambdaEff > 0 ? Lq / lambdaEff : 0;
    const Ws = lambdaEff > 0 ? Ls / lambdaEff : 0;
    const avgActive   = a * (1 - (limited ? Pk : 0));
    const avgInactive = s - avgActive;

    return { rho: rhoRaw, a, Ls, Lq, Ws, Wq, P0, lambdaEff, lambdaLost,
        avgActive, avgInactive: Math.max(0, avgInactive), probs };
}

// ─── Colores de cliente en la escena ────────────────────────────────
const CLIENT_COLORS = [
    '#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b',
    '#10b981','#3b82f6','#ef4444','#f97316','#84cc16',
];

// ═══════════════════════════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════════════════════════
export default function SimulacionBarberia() {
    const { isDark } = useTheme();
    const C = isDark ? DARK_C : LIGHT_C;

    // ── Configuración ───────────────────────────────────────────────
    const [numChairs, setNumChairs]   = useState(3);
    const [lambda,    setLambda]      = useState(2);
    const [mu,        setMu]          = useState(1);
    const [limited,   setLimited]     = useState(false);
    const [queueCap,  setQueueCap]    = useState(5);

    // ── Estado de la simulación ────────────────────────────────────
    const [running,   setRunning]     = useState(false);
    const [showReport,setShowReport]  = useState(false);
    const [scene,     setScene]       = useState(null);   // estado visual
    const [report,    setReport]      = useState(null);   // métricas al parar

    // ── Refs (datos internos sin re-render) ────────────────────────
    const intervalRef  = useRef(null);
    const nextIdRef    = useRef(1);
    const clockRef     = useRef(0);       // minutos simulados
    const nextArrRef   = useRef(0);       // próximo arribo (minutos)
    const chairsRef    = useRef([]);      // Array de sillas
    const queueRef     = useRef([]);      // Cola de espera
    const histRef      = useRef({
        totalClients: 0, lostClients: 0,
        totalWait: 0, totalService: 0,
        waitCount: 0,  serviceCount: 0,
        serverBusy: 0, // acumulado silla-minutos activos
        arrivals: [],  // historial tiempos inter-arribo
        services: [],  // historial tiempos servicio
    });

    // Limpiar intervalo al desmontar
    useEffect(() => () => clearInterval(intervalRef.current), []);

    // ── Snap del estado visual para React ─────────────────────────
    const snapScene = useCallback(() => {
        setScene({
            chairs:  chairsRef.current.map(c => ({ ...c })),
            queue:   queueRef.current.map(q => ({ ...q })),
            clock:   clockRef.current,
            lost:    histRef.current.lostClients,
            total:   histRef.current.totalClients,
        });
    }, []);

    // ── Un tick = 1 minuto simulado ────────────────────────────────
    const tick = useCallback(() => {
        clockRef.current += 1;
        const hist = histRef.current;
        const chairs = chairsRef.current;
        const queue  = queueRef.current;

        // 1. Avanzar servicio en cada silla activa
        chairs.forEach(ch => {
            if (ch.busy) {
                ch.timeLeft -= 1;
                hist.serverBusy += 1;
                if (ch.timeLeft <= 0) {
                    // Cliente sale
                    ch.busy     = false;
                    ch.clientId = null;
                    ch.color    = null;
                    ch.timeLeft = 0;
                }
            }
        });

        // 2. Mover de la cola a sillas liberadas
        chairs.forEach(ch => {
            if (!ch.busy && queue.length > 0) {
                const client = queue.shift();
                const waited = clockRef.current - client.arrivalTime;
                hist.totalWait += waited;
                hist.waitCount  += 1;
                const svcTime = Math.max(1, Math.round(randExp(mu)));
                ch.busy     = true;
                ch.clientId = client.id;
                ch.color    = client.color;
                ch.timeLeft = svcTime;
                hist.totalService += svcTime;
                hist.serviceCount += 1;
                hist.services.push(svcTime);
            }
        });

        // 3. Generar llegadas hasta el reloj actual
        while (nextArrRef.current <= clockRef.current) {
            hist.totalClients += 1;
            const freeSeat = chairs.find(c => !c.busy);
            const clientId = nextIdRef.current++;
            const color    = CLIENT_COLORS[clientId % CLIENT_COLORS.length];
            const interArr = Math.max(1, Math.round(randExp(lambda)));
            hist.arrivals.push(interArr);

            if (freeSeat) {
                // Va directo a silla
                const svcTime = Math.max(1, Math.round(randExp(mu)));
                freeSeat.busy     = true;
                freeSeat.clientId = clientId;
                freeSeat.color    = color;
                freeSeat.timeLeft = svcTime;
                hist.totalService += svcTime;
                hist.serviceCount += 1;
                hist.services.push(svcTime);
            } else {
                // Verificar si puede entrar a la cola
                const cap = limited ? queueCap : Infinity;
                if (queue.length < cap) {
                    queue.push({ id: clientId, color, arrivalTime: clockRef.current });
                } else {
                    hist.lostClients += 1;
                }
            }
            nextArrRef.current += interArr;
        }

        snapScene();
    }, [lambda, mu, limited, queueCap, snapScene]);

    // ── Iniciar simulación ─────────────────────────────────────────
    const startSim = useCallback(() => {
        // Reset
        clearInterval(intervalRef.current);
        clockRef.current  = 0;
        nextIdRef.current = 1;
        nextArrRef.current = Math.max(1, Math.round(randExp(lambda)));
        chairsRef.current  = Array.from({ length: numChairs }, (_, i) => ({
            id: i, busy: false, clientId: null, color: null, timeLeft: 0,
        }));
        queueRef.current = [];
        histRef.current  = {
            totalClients: 0, lostClients: 0,
            totalWait: 0, totalService: 0,
            waitCount: 0,  serviceCount: 0,
            serverBusy: 0,
            arrivals: [], services: [],
        };
        setShowReport(false);
        setReport(null);
        setRunning(true);
        snapScene();
        intervalRef.current = setInterval(tick, 1000); // 1s real = 1min simulado
    }, [lambda, mu, numChairs, tick, snapScene]);

    // ── Detener y generar reporte ──────────────────────────────────
    const stopSim = useCallback(() => {
        clearInterval(intervalRef.current);
        setRunning(false);

        const hist   = histRef.current;
        const clock  = clockRef.current;
        const s      = numChairs;
        const K      = limited ? (numChairs + queueCap) : null;

        // Métricas empíricas
        const rhoEmp  = clock > 0 ? (hist.serverBusy / (s * clock)) : 0;
        const Wq_emp  = hist.waitCount  > 0 ? hist.totalWait    / hist.waitCount    : 0;
        const Ws_emp  = hist.serviceCount > 0 ? (hist.totalWait + hist.totalService) / hist.serviceCount : 0;
        const Lq_emp  = Wq_emp * lambda;
        const Ls_emp  = Ws_emp * lambda;
        const lambdaEff_emp  = clock > 0 ? (hist.totalClients - hist.lostClients) / clock : 0;
        const lambdaLost_emp = clock > 0 ? hist.lostClients / clock : 0;
        const avgActive_emp   = rhoEmp * s;
        const avgInactive_emp = s - avgActive_emp;

        // Probabilidades analíticas
        const analytic = calcMetrics({ lambda, mu, s, limited, K: K ?? (s + 60) });

        setReport({
            clock,
            empirical: {
                rho: rhoEmp, Wq: Wq_emp, Ws: Ws_emp,
                Lq: Lq_emp, Ls: Ls_emp,
                lambdaEff: lambdaEff_emp, lambdaLost: lambdaLost_emp,
                avgActive: avgActive_emp, avgInactive: avgInactive_emp,
                totalClients: hist.totalClients, lostClients: hist.lostClients,
                arrivals: hist.arrivals.slice(0, 30), // máx 30 para tabla
                services: hist.services.slice(0, 30),
            },
            analytic,
            params: { lambda, mu, s, limited, K, queueCap },
        });
        setShowReport(true);
    }, [lambda, mu, numChairs, limited, queueCap]);

    // ─── Estilos compartidos ─────────────────────────────────────
    const cardStyle = {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '1rem',
        padding: '1.25rem',
        backdropFilter: 'blur(12px)',
    };
    const labelStyle = {
        fontSize: '0.7rem', fontWeight: 600, color: C.muted,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        display: 'block', marginBottom: '0.35rem',
    };
    const inputStyle = {
        width: '100%', background: C.inputBg,
        border: `1px solid ${C.border}`,
        borderRadius: '0.5rem', padding: '0.45rem 0.7rem',
        color: C.text, fontSize: '0.9rem', outline: 'none',
        boxSizing: 'border-box',
    };
    const btnBase = {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.7rem 1.4rem', borderRadius: '0.75rem',
        fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
        border: 'none', transition: 'all 0.2s',
    };

    // ─── VISTA SVG DE LA BARBERÍA ─────────────────────────────────
    const renderShop = () => {
        if (!scene) return null;
        const chairs = scene.chairs;
        const queue  = scene.queue;
        const cols   = Math.min(numChairs, 5);
        const rows   = Math.ceil(numChairs / cols);

        // Dimensiones del SVG
        const svgW = 700, svgH = 420;
        // Zonas
        const chairArea = { x: 20, y: 20, w: 440, h: rows * 90 + 30 };
        const waitArea  = { x: 20, y: chairArea.y + chairArea.h + 12, w: 440, h: 80 };
        const barArea   = { x: 480, y: 20, w: 200, h: 130 };
        const cashArea  = { x: 480, y: 170, w: 200, h: 80 };
        const exitArea  = { x: 480, y: 270, w: 200, h: 60 };

        // Posiciones de sillas
        const chairPos = chairs.map((_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return {
                x: chairArea.x + 25 + col * (chairArea.w / cols),
                y: chairArea.y + 30 + row * 82,
            };
        });

        // Posiciones en cola (fila horizontal)
        const queuePos = queue.slice(0, 10).map((_, i) => ({
            x: waitArea.x + 28 + i * 40,
            y: waitArea.y + waitArea.h / 2,
        }));

        return (
            <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`}
                style={{ display: 'block', borderRadius: '0.75rem', background: C.shopBg }}>

                {/* ── Fondo piso ── */}
                <defs>
                    <pattern id="floor" patternUnits="userSpaceOnUse" width="20" height="20">
                        <rect width="20" height="20" fill={isDark ? '#1a2740' : '#dde6f5'} />
                        <rect width="10" height="10" fill={isDark ? '#192036' : '#d4dcee'} />
                        <rect x="10" y="10" width="10" height="10" fill={isDark ? '#192036' : '#d4dcee'} />
                    </pattern>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <rect x="0" y="0" width={svgW} height={svgH} fill="url(#floor)" />

                {/* ── Zona de Sillas de barbería ── */}
                <rect x={chairArea.x} y={chairArea.y} width={chairArea.w} height={chairArea.h}
                    rx="8" fill={isDark ? 'rgba(30,41,59,0.7)' : 'rgba(226,232,240,0.7)'}
                    stroke={isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)'} strokeWidth="1.5" />
                <text x={chairArea.x + chairArea.w / 2} y={chairArea.y + 14}
                    fill={C.accent} fontSize="9" fontWeight="700"
                    textAnchor="middle" fontFamily="monospace" letterSpacing="1">
                    ÁREA DE SILLAS DE BARBERÍA
                </text>

                {/* Sillas individuales */}
                {chairs.map((ch, i) => {
                    const { x, y } = chairPos[i];
                    const isOcc    = ch.busy;
                    const ledColor = isOcc ? '#ef4444' : '#10b981';
                    return (
                        <g key={ch.id} transform={`translate(${x}, ${y})`}>
                            {/* Silla (vista top) */}
                            <rect x="-22" y="-18" width="44" height="44" rx="6"
                                fill={isDark ? '#0f172a' : '#f8fafc'}
                                stroke={isDark ? '#334155' : '#cbd5e1'}
                                strokeWidth="1.5" />
                            {/* Espaldar */}
                            <rect x="-16" y="-20" width="32" height="8" rx="3"
                                fill={isDark ? '#1e293b' : '#e2e8f0'}
                                stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1" />
                            {/* Asiento */}
                            <rect x="-14" y="-10" width="28" height="22" rx="4"
                                fill={isOcc ? 'rgba(99,102,241,0.25)' : (isDark ? '#1e293b' : '#e2e8f0')}
                                stroke={isOcc ? C.accent : (isDark ? '#334155' : '#cbd5e1')} strokeWidth="1" />
                            {/* LED estado */}
                            <circle cx="18" cy="-14" r="4" fill={ledColor} filter="url(#glow)" />
                            <circle cx="18" cy="-14" r="2" fill={ledColor} opacity="0.6" />
                            {/* Número de silla */}
                            <text x="0" y="1" fill={C.muted} fontSize="8" textAnchor="middle"
                                fontFamily="monospace" fontWeight="600">#{i + 1}</text>
                            {/* Avatar cliente */}
                            {isOcc && (
                                <>
                                    <circle cx="0" cy="3" r="10" fill={ch.color} opacity="0.9" />
                                    <circle cx="0" cy="-1" r="4" fill="rgba(255,255,255,0.75)" />
                                    <rect x="-5" y="4" width="10" height="8" rx="3" fill="rgba(255,255,255,0.55)" />
                                    {/* Barra de progreso servicio */}
                                    <rect x="-15" y="28" width="30" height="3" rx="2"
                                        fill={isDark ? '#1e293b' : '#e2e8f0'} />
                                    <rect x="-15" y="28"
                                        width={Math.max(0, 30 * (1 - ch.timeLeft / 10))}
                                        height="3" rx="2" fill={ch.color} />
                                </>
                            )}
                            {!isOcc && (
                                <text x="0" y="9" fill={C.muted} fontSize="8"
                                    textAnchor="middle" fontFamily="monospace">LIBRE</text>
                            )}
                        </g>
                    );
                })}

                {/* ── Área de espera ── */}
                <rect x={waitArea.x} y={waitArea.y} width={waitArea.w} height={waitArea.h}
                    rx="8" fill={isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)'}
                    stroke={isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)'}
                    strokeWidth="1.5" strokeDasharray="6 3" />
                <text x={waitArea.x + 8} y={waitArea.y + 14}
                    fill={C.accent} fontSize="9" fontWeight="700"
                    fontFamily="monospace" letterSpacing="1">
                    {`ÁREA DE ESPERA (${queue.length}${limited ? `/${queueCap}` : ''})`}
                </text>
                {/* Sofá SVG */}
                <g transform={`translate(${waitArea.x + waitArea.w - 35}, ${waitArea.y + 42})`}>
                    <rect x="-22" y="-10" width="44" height="20" rx="4" fill={isDark ? '#334155' : '#94a3b8'} />
                    <rect x="-22" y="-20" width="44" height="12" rx="3" fill={isDark ? '#475569' : '#cbd5e1'} />
                    <rect x="-27" y="-18" width="8" height="28" rx="3" fill={isDark ? '#475569' : '#cbd5e1'} />
                    <rect x="19" y="-18" width="8" height="28" rx="3" fill={isDark ? '#475569' : '#cbd5e1'} />
                </g>
                {/* Clientes en cola */}
                {queuePos.map((pos, i) => (
                    <g key={queue[i].id} transform={`translate(${pos.x}, ${pos.y})`}>
                        <circle r="13" fill={queue[i].color} opacity="0.85" />
                        <circle cy="-3" r="4" fill="rgba(255,255,255,0.75)" />
                        <rect x="-5" y="3" width="10" height="8" rx="3" fill="rgba(255,255,255,0.55)" />
                        <text y="-17" fill="rgba(255,255,255,0.95)" fontSize="7"
                            textAnchor="middle" fontFamily="monospace" fontWeight="700">#{i + 1}</text>
                    </g>
                ))}
                {queue.length > 10 && (
                    <text x={queuePos[9]?.x + 22 ?? waitArea.x + 50}
                        y={waitArea.y + waitArea.h / 2 + 4}
                        fill={C.amber} fontSize="10" fontWeight="700">
                        +{queue.length - 10}
                    </text>
                )}

                {/* ── Barra de barbería ── */}
                <rect x={barArea.x} y={barArea.y} width={barArea.w} height={barArea.h}
                    rx="8" fill={isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.07)'}
                    stroke={isDark ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.3)'}
                    strokeWidth="1.5" />
                <text x={barArea.x + barArea.w / 2} y={barArea.y + 14}
                    fill={C.amber} fontSize="9" fontWeight="700"
                    textAnchor="middle" fontFamily="monospace">BARRA</text>
                {/* Barber pole SVG */}
                <g transform={`translate(${barArea.x + barArea.w / 2}, ${barArea.y + 68})`}>
                    <rect x="-9" y="-32" width="18" height="60" rx="9" fill="white" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1.5" />
                    <clipPath id="poleClip"><rect x="-9" y="-32" width="18" height="60" rx="9" /></clipPath>
                    <g clipPath="url(#poleClip)">
                        {[0,12,24,36,48].map(o => (
                            <rect key={o} x="-9" y={-32 + o} width="18" height="10"
                                fill={o % 24 === 0 ? '#ef4444' : '#3b82f6'} opacity="0.75" />
                        ))}
                    </g>
                    <circle cy="-36" r="6" fill={C.amber} opacity="0.9" />
                </g>
                <text x={barArea.x + barArea.w / 2} y={barArea.y + barArea.h - 8}
                    fill={C.muted} fontSize="7" textAnchor="middle" fontFamily="monospace">Barber Shop</text>

                {/* ── Área de servicios / Caja ── */}
                <rect x={cashArea.x} y={cashArea.y} width={cashArea.w} height={cashArea.h}
                    rx="8" fill={isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.07)'}
                    stroke={isDark ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.3)'}
                    strokeWidth="1.5" />
                <text x={cashArea.x + cashArea.w / 2} y={cashArea.y + 14}
                    fill={C.green} fontSize="9" fontWeight="700"
                    textAnchor="middle" fontFamily="monospace">SERVICIOS</text>
                {/* Document icon SVG */}
                <g transform={`translate(${cashArea.x + cashArea.w / 2}, ${cashArea.y + 46})`}>
                    <rect x="-13" y="-18" width="26" height="34" rx="3" fill={isDark ? '#1e293b' : '#f8fafc'} stroke={C.green} strokeWidth="1.5" />
                    <line x1="-8" y1="-9" x2="8" y2="-9" stroke={C.green} strokeWidth="1.5" strokeOpacity="0.8" />
                    <line x1="-8" y1="-2" x2="8" y2="-2" stroke={C.green} strokeWidth="1.5" strokeOpacity="0.8" />
                    <line x1="-8" y1="5" x2="3" y2="5" stroke={C.green} strokeWidth="1.5" strokeOpacity="0.8" />
                </g>

                {/* ── Letrero salida ── */}
                <rect x={exitArea.x} y={exitArea.y} width={exitArea.w} height={exitArea.h}
                    rx="8" fill={isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.07)'}
                    stroke={isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}
                    strokeWidth="1.5" />
                {/* Door icon SVG */}
                <g transform={`translate(${exitArea.x + exitArea.w / 2 - 30}, ${exitArea.y + 8})`}>
                    <rect x="0" y="0" width="22" height="40" rx="2" fill={isDark ? '#1e293b' : '#f8fafc'} stroke={C.red} strokeWidth="1.5" />
                    <circle cx="17" cy="22" r="2.5" fill={C.red} />
                </g>
                <text x={exitArea.x + exitArea.w / 2 + 8} y={exitArea.y + exitArea.h / 2 + 4}
                    fill={C.red} fontSize="10" fontWeight="700"
                    textAnchor="middle" fontFamily="monospace">SALIDA</text>

                {/* ── Reloj y stats live ── */}
                <rect x="20" y={svgH - 38} width="200" height="28" rx="6"
                    fill={isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}
                    stroke={isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)'}
                    strokeWidth="1" />
                <text x="30" y={svgH - 19} fill={C.accent} fontSize="10" fontFamily="monospace" fontWeight="700">
                    {`T: ${Math.floor(scene.clock / 60)}h ${scene.clock % 60}m`}
                </text>
                <text x="120" y={svgH - 19} fill={C.green} fontSize="9" fontFamily="monospace">
                    {`OK:${scene.total - scene.lost}  KO:${scene.lost}`}
                </text>
            </svg>
        );
    };

    // ─── REPORTE FINAL ─────────────────────────────────────────────
    const renderReport = () => {
        if (!report) return null;
        const { empirical: e, analytic: an, params, clock } = report;

        const StatRow = ({ label, emp, anal, unit = '' }) => (
            <tr>
                <td style={{ padding: '0.5rem 0.75rem', color: C.text, fontSize: '0.82rem', borderBottom: `1px solid ${C.border}` }}>{label}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: C.green, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem', textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>
                    {typeof emp === 'number' ? (emp < 1 ? emp.toFixed(4) : emp.toFixed(2)) : emp}{unit}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', color: C.accent, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem', textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>
                    {anal !== undefined ? (typeof anal === 'number' ? (anal < 1 ? anal.toFixed(4) : anal.toFixed(2)) : anal) : '—'}{unit}
                </td>
            </tr>
        );

        const thStyle = {
            padding: '0.5rem 0.75rem',
            background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
            color: C.accent, fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
        };

        return (
            <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
                {/* Header reporte */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                            REPORTE DE SIMULACIÓN
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: C.titleColor }}>
                            Barbería — {params.s} silla{params.s !== 1 ? 's' : ''}, λ={params.lambda}/min, μ={params.mu}/min
                        </h2>
                        <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '0.2rem' }}>
                            Tiempo simulado: {Math.floor(clock / 60)}h {clock % 60}min · {e.totalClients} clientes totales
                        </div>
                    </div>
                    <button onClick={() => window.print()} style={{ ...btnBase, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
                        <Printer size={16} /> Imprimir / PDF
                    </button>
                </div>

                {/* Tabla de métricas */}
                <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Métrica</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Empírico (Sim.)</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Analítico (M/M/s{params.limited ? '/K' : ''})</th>
                            </tr>
                        </thead>
                        <tbody>
                            <StatRow label="Factor de utilización (ρ)" emp={e.rho} anal={an?.rho} unit="" />
                            <StatRow label="Tpo. promedio en cola Wq (min)" emp={e.Wq} anal={an?.Wq} />
                            <StatRow label="Tpo. promedio en sistema Ws (min)" emp={e.Ws} anal={an?.Ws} />
                            <StatRow label="Clientes promedio en cola Lq" emp={e.Lq} anal={an?.Lq} />
                            <StatRow label="Clientes promedio en sistema Ls" emp={e.Ls} anal={an?.Ls} />
                            <StatRow label="λ efectiva (clientes/min)" emp={e.lambdaEff} anal={an?.lambdaEff} />
                            <StatRow label="λ perdida (rechazados/min)" emp={e.lambdaLost} anal={an?.lambdaLost ?? 0} />
                            <StatRow label="Servidores activos promedio" emp={e.avgActive} anal={an?.avgActive} />
                            <StatRow label="Servidores inactivos promedio" emp={e.avgInactive} anal={an?.avgInactive} />
                            <StatRow label="Clientes atendidos" emp={e.totalClients - e.lostClients} anal={undefined} />
                            <StatRow label="Clientes rechazados (cola llena)" emp={e.lostClients} anal={undefined} />
                        </tbody>
                    </table>
                </div>

                {/* Tabla P(n) analítica */}
                {an?.probs && (
                    <div style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: C.accent }}>
                            Distribución de Probabilidades P(n) — Estado Estable
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                <thead>
                                    <tr>
                                        {an.probs.map(({ n }) => (
                                            <th key={n} style={{ ...thStyle, padding: '0.4rem 0.6rem' }}>n={n}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        {an.probs.map(({ n, pn }) => (
                                            <td key={n} style={{
                                                padding: '0.4rem 0.6rem', fontFamily: 'monospace',
                                                textAlign: 'center', fontWeight: n === 0 ? 700 : 400,
                                                color: n === 0 ? C.green : C.text,
                                                borderBottom: `1px solid ${C.border}`,
                                            }}>
                                                {pn.toFixed(4)}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.35rem' }}>
                            Precisión: 1×10⁻⁴ · P₀ = {an.P0?.toFixed(4)}
                        </div>
                    </div>
                )}

                {/* Historial tiempos inter-arribo y servicio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', fontWeight: 700, color: C.amber }}>
                            Tiempos Inter-Arribo (min) — muestra {e.arrivals.length}
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {e.arrivals.map((t, i) => (
                                <span key={i} style={{
                                    background: C.statBg, border: `1px solid ${C.statBorder}`,
                                    borderRadius: '0.35rem', padding: '0.2rem 0.45rem',
                                    fontSize: '0.72rem', fontFamily: 'monospace', color: C.amber,
                                }}>{t}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', fontWeight: 700, color: C.green }}>
                            Tiempos de Servicio (min) — muestra {e.services.length}
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {e.services.map((t, i) => (
                                <span key={i} style={{
                                    background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(5,150,105,0.07)',
                                    border: `1px solid ${C.badgeBorder}`,
                                    borderRadius: '0.35rem', padding: '0.2rem 0.45rem',
                                    fontSize: '0.72rem', fontFamily: 'monospace', color: C.green,
                                }}>{t}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ─── PANEL DE CONFIGURACIÓN ────────────────────────────────────
    const canStart = lambda > 0 && mu > 0 && numChairs >= 1 && numChairs <= 20
        && (!limited || queueCap >= 1)
        && (limited || lambda < numChairs * mu); // estabilidad M/M/s

    // ─── RENDER ────────────────────────────────────────────────────
    return (
        <AppLayout>
            <Head title="Simulación Barbería — SimOptimización" />

            {/* Estilos de impresión */}
            <style>{`
                @media print {
                    aside, [data-no-print] { display: none !important; }
                    body { background: white !important; }
                }
                @keyframes pulse-led {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes client-enter {
                    from { opacity: 0; transform: scale(0.5); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div style={{ padding: '2rem 1.5rem', background: C.bg, minHeight: '100vh' }}>

                {/* Header */}
                <div style={{ marginBottom: '1.75rem' }} data-no-print>
                    <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '0.65rem', padding: '0.3rem 1rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff', marginBottom: '0.65rem' }}>
                        SIMULACIÓN Y OPTIMIZACIÓN · MÓDULO 5
                    </div>
                    <h1 style={{ fontSize: '1.9rem', fontWeight: 900, margin: '0 0 0.3rem', color: C.titleColor, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Scissors size={28} style={{ color: C.accent }} />
                        Simulación de Barbería
                    </h1>
                    <p style={{ color: C.muted, fontSize: '0.88rem', margin: 0 }}>
                        Vista de Dron · Motor M/M/s/K · 1 segundo real = 1 minuto simulado
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.25rem', alignItems: 'start' }} data-no-print>

                    {/* ── Panel izquierdo: Configuración + controles ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={cardStyle}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: C.accent, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Settings size={16} /> Parámetros
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {/* Sillas */}
                                <div>
                                    <label style={labelStyle}>Sillas de barbero (servidores s)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="range" min="1" max="20" value={numChairs}
                                            onChange={e => setNumChairs(+e.target.value)}
                                            disabled={running}
                                            style={{ flex: 1, accentColor: C.accent }} />
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.accent, minWidth: '2ch' }}>{numChairs}</span>
                                    </div>
                                </div>
                                {/* λ */}
                                <div>
                                    <label style={labelStyle}>Tasa de llegada λ (clientes/min)</label>
                                    <input type="number" step="0.1" min="0.1" value={lambda}
                                        onChange={e => setLambda(Math.max(0.1, +e.target.value))}
                                        disabled={running} style={inputStyle} />
                                </div>
                                {/* μ */}
                                <div>
                                    <label style={labelStyle}>Tasa de servicio μ (clientes/min)</label>
                                    <input type="number" step="0.1" min="0.1" value={mu}
                                        onChange={e => setMu(Math.max(0.1, +e.target.value))}
                                        disabled={running} style={inputStyle} />
                                </div>
                                {/* ρ preview */}
                                <div style={{ background: C.statBg, border: `1px solid ${C.statBorder}`, borderRadius: '0.5rem', padding: '0.6rem 0.75rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: '0.2rem' }}>Factor de utilización analítico ρ</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: lambda / (numChairs * mu) >= 1 ? C.red : C.green }}>
                                        ρ = {(lambda / (numChairs * mu)).toFixed(4)}
                                        {lambda / (numChairs * mu) >= 1 && <span style={{ fontSize: '0.7rem', color: C.red, marginLeft: '0.5rem' }}>⚠ inestable</span>}
                                    </div>
                                </div>
                                {/* Límite de cola */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <input type="checkbox" id="limited-toggle" checked={limited}
                                            onChange={e => setLimited(e.target.checked)} disabled={running}
                                            style={{ accentColor: C.accent, width: '14px', height: '14px' }} />
                                        <label htmlFor="limited-toggle" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
                                            Cola con límite (M/M/s/K)
                                        </label>
                                    </div>
                                    {limited && (
                                        <div>
                                            <label style={labelStyle}>Capacidad de cola (puestos de espera)</label>
                                            <input type="number" min="1" max="50" value={queueCap}
                                                onChange={e => setQueueCap(Math.max(1, +e.target.value))}
                                                disabled={running} style={inputStyle} />
                                            <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: '0.2rem' }}>
                                                Capacidad total K = {numChairs} + {queueCap} = {numChairs + queueCap}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Botones de control */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {!running ? (
                                <button onClick={startSim} disabled={!canStart}
                                    style={{ ...btnBase, background: canStart ? 'linear-gradient(135deg,#10b981,#059669)' : C.card, color: canStart ? '#fff' : C.muted, border: `1px solid ${canStart ? 'transparent' : C.border}`, justifyContent: 'center', opacity: canStart ? 1 : 0.6, boxShadow: canStart ? '0 4px 14px rgba(16,185,129,0.4)' : 'none' }}>
                                    <Play size={18} /> Iniciar Simulación
                                </button>
                            ) : (
                                <button onClick={stopSim}
                                    style={{ ...btnBase, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', justifyContent: 'center', boxShadow: '0 4px 14px rgba(239,68,68,0.4)', animation: 'pulse-led 1.5s ease-in-out infinite' }}>
                                    <Square size={16} /> Detener y ver Reporte
                                </button>
                            )}
                            {!canStart && !running && lambda / (numChairs * mu) >= 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.6rem', padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: C.red }}>
                                    <AlertTriangle size={14} />
                                    M/M/s necesita ρ &lt; 1 (sin límite). Aumenta sillas o μ, o activa límite de cola.
                                </div>
                            )}
                        </div>

                        {/* Stats live */}
                        {running && scene && (
                            <div style={cardStyle}>
                                <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: C.accent, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Clock size={14} /> En tiempo real
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[
                                        { label: 'Tiempo simulado', val: `${Math.floor(scene.clock / 60)}h ${scene.clock % 60}min` },
                                        { label: 'Clientes totales', val: scene.total },
                                        { label: 'En cola ahora', val: scene.queue.length },
                                        { label: 'Sillas ocupadas', val: scene.chairs.filter(c => c.busy).length + ' / ' + numChairs },
                                        { label: 'Rechazados', val: scene.lost, warn: scene.lost > 0 },
                                    ].map(({ label, val, warn }) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', color: C.muted }}>{label}</span>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: warn ? C.red : C.text }}>{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Panel derecho: Vista de la barbería ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ ...cardStyle, padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.accent, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Eye size={16} /> Vista de Dron
                                </h2>
                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: C.green }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.green, display: 'inline-block' }} /> Libre
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: C.red }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.red, display: 'inline-block' }} /> Ocupado
                                    </span>
                                </div>
                            </div>
                            {!scene ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', color: C.muted, gap: '0.75rem' }}>
                                    <Scissors size={48} style={{ opacity: 0.3 }} />
                                    <p style={{ fontSize: '0.9rem' }}>Configura los parámetros e inicia la simulación</p>
                                </div>
                            ) : renderShop()}
                        </div>
                    </div>
                </div>

                {/* ── Reporte ── */}
                {showReport && renderReport()}
            </div>
        </AppLayout>
    );
}
