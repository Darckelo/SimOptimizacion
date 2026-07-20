import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, X, ChevronLeft, ChevronRight, Compass } from 'lucide-react';

// ─── Atajos de teclado ───────────────────────────────────────────────
const KBD_STYLE = {
    background: 'rgba(255,255,255,0.07)', borderRadius: '0.2rem',
    padding: '0.05rem 0.3rem', fontSize: '0.63rem',
    color: '#64748b', border: '1px solid rgba(255,255,255,0.1)',
};

// ─── TourOverlay ─────────────────────────────────────────────────────
// Props:
//   steps  — array de pasos: { targetId, sectionName, Icon, accentColor, what, dos[], donts[] }
//   onClose — callback para cerrar
export default function TourOverlay({ steps, onClose }) {
    const [step, setStep] = useState(0);
    const cur = steps[step];
    const total = steps.length;
    const pct = total > 1 ? (step / (total - 1)) * 100 : 100;

    // Resaltar sección activa
    useEffect(() => {
        const el = document.getElementById(cur.targetId);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const prev = { outline: el.style.outline, boxShadow: el.style.boxShadow, position: el.style.position, zIndex: el.style.zIndex, borderRadius: el.style.borderRadius };
        el.style.outline = `2.5px solid ${cur.accentColor}`;
        el.style.boxShadow = `0 0 0 6px ${cur.accentColor}20, 0 0 50px ${cur.accentColor}35`;
        el.style.position = 'relative';
        el.style.zIndex = '1001';
        el.style.borderRadius = '1rem';
        return () => Object.assign(el.style, { outline: prev.outline, boxShadow: prev.boxShadow, position: prev.position, zIndex: prev.zIndex, borderRadius: prev.borderRadius });
    }, [step, cur.targetId, cur.accentColor]);

    // Limpiar todos al cerrar
    useEffect(() => () => steps.forEach(s => {
        const el = document.getElementById(s.targetId);
        if (el) Object.assign(el.style, { outline: '', boxShadow: '', position: '', zIndex: '', borderRadius: '' });
    }), [steps]);

    // Navegación por teclado
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && step < total - 1) setStep(s => s + 1);
            if (e.key === 'ArrowLeft'  && step > 0)         setStep(s => s - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [step, onClose, total]);

    const ac = cur.accentColor;

    return (
        <>
            {/* Overlay */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', animation: 'tourFadeIn 0.25s ease' }} />

            {/* Panel inferior */}
            <div style={{
                position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                zIndex: 1002, width: '760px', maxWidth: 'calc(100vw - 2rem)',
                background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
                border: `1.5px solid ${ac}50`, borderRadius: '1.25rem',
                boxShadow: `0 -4px 60px rgba(0,0,0,0.6), 0 0 40px ${ac}15`,
                backdropFilter: 'blur(20px)', overflow: 'hidden',
                animation: 'tourSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                transition: 'border-color 0.4s, box-shadow 0.4s',
            }}>
                {/* Barra de progreso */}
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,#6366f1,${ac})`, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>

                <div style={{ padding: '1.1rem 1.4rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                            <div style={{ width: 46, height: 46, flexShrink: 0, background: `linear-gradient(135deg,${ac}25,${ac}45)`, border: `1.5px solid ${ac}55`, borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 18px ${ac}30`, transition: 'all 0.35s' }}>
                                <cur.Icon size={22} color={ac} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: ac, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Compass size={10} /> Tour · Paso {step + 1} de {total}
                                </div>
                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#e2e8f0', marginBottom: '0.2rem' }}>{cur.sectionName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{cur.what}</div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', padding: '0.4rem', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}>
                            <X size={14} />
                        </button>
                    </div>

                    {/* Separador */}
                    <div style={{ height: '1px', background: `linear-gradient(90deg,transparent,${ac}35,transparent)`, marginBottom: '0.9rem' }} />

                    {/* Columnas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                        {[
                            { items: cur.dos,   color: '#10b981', bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.18)', Icon: CheckCircle, label: 'Puedes hacer',    prefix: (i) => `${i + 1}.`, prefixColor: '#10b981' },
                            { items: cur.donts, color: '#ef4444', bg: 'rgba(239,68,68,0.05)',   border: 'rgba(239,68,68,0.18)',  Icon: XCircle,     label: 'No debes hacer', prefix: () => '✕',         prefixColor: '#ef4444' },
                        ].map(({ items, color, bg, border, Icon: ColIcon, label, prefix, prefixColor }) => (
                            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '0.75rem', padding: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                                    <ColIcon size={12} color={color} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    {items.map((text, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                                            <span style={{ color: prefixColor, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0, marginTop: '0.1rem', lineHeight: 1 }}>{prefix(i)}</span>
                                            <span style={{ fontSize: '0.77rem', color: '#94a3b8', lineHeight: 1.5 }}>{text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Dots */}
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {steps.map((s, i) => (
                                <button key={i} onClick={() => setStep(i)} title={s.sectionName} style={{ width: i === step ? '22px' : '7px', height: '7px', borderRadius: '9999px', background: i === step ? ac : i < step ? `${ac}55` : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)' }} />
                            ))}
                        </div>

                        {/* Tip teclado */}
                        <span style={{ fontSize: '0.65rem', color: '#334155' }}>
                            <kbd style={KBD_STYLE}>←</kbd> <kbd style={KBD_STYLE}>→</kbd> navegar · <kbd style={KBD_STYLE}>Esc</kbd> cerrar
                        </span>

                        {/* Botones nav */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', background: step === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.12)', border: `1px solid ${step === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.3)'}`, borderRadius: '0.6rem', cursor: step === 0 ? 'not-allowed' : 'pointer', color: step === 0 ? '#1e293b' : '#a5b4fc', fontSize: '0.78rem', fontWeight: 600, opacity: step === 0 ? 0.35 : 1, transition: 'all 0.2s' }}
                                onMouseEnter={e => { if (step > 0) { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; e.currentTarget.style.transform = 'translateX(-1px)'; }}}
                                onMouseLeave={e => { e.currentTarget.style.background = step > 0 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'none'; }}>
                                <ChevronLeft size={14} /> Anterior
                            </button>

                            {step < total - 1 ? (
                                <button onClick={() => setStep(s => s + 1)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', background: `linear-gradient(135deg,#6366f1,${ac})`, border: 'none', borderRadius: '0.6rem', cursor: 'pointer', color: '#fff', fontSize: '0.78rem', fontWeight: 700, boxShadow: `0 3px 12px ${ac}40`, transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(1px)'; e.currentTarget.style.boxShadow = `0 5px 18px ${ac}60`; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 3px 12px ${ac}40`; }}>
                                    Siguiente <ChevronRight size={14} />
                                </button>
                            ) : (
                                <button onClick={onClose}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: '0.6rem', cursor: 'pointer', color: '#fff', fontSize: '0.78rem', fontWeight: 700, boxShadow: '0 3px 12px rgba(16,185,129,0.4)', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(16,185,129,0.55)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(16,185,129,0.4)'; }}>
                                    ¡Listo! <CheckCircle size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes tourFadeIn   { from { opacity: 0; } to { opacity: 1; } }
                @keyframes tourSlideUp  { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            `}</style>
        </>
    );
}
