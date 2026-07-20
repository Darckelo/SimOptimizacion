import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Home, BarChart2, Users, Package, ChevronLeft, ChevronRight, Sun, Moon, Server, Shuffle, Scissors,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const MODULOS = [
    { id: 'inicio',           href: '/',                Icon: Home,      label: 'Inicio',           active: true  },
    { id: 'calculadora',      href: '/calculadora',     Icon: BarChart2, label: 'Distribuciones',   active: true  },
    { id: 'lineas-espera',    href: '/lineas-espera',   Icon: Users,     label: 'Líneas de Espera', active: true  },
    { id: 'multi-servidor',   href: '/multi-servidor',  Icon: Server,    label: 'Varios Servidores',active: true  },
    { id: 'monte-carlo',       href: '/monte-carlo',      Icon: Shuffle,   label: 'Monte Carlo',      active: true  },
    { id: 'simulacion-barberia', href: '/simulacion-barberia', Icon: Scissors, label: 'Barbería Sim.',   active: true  },
];

// ─── Paletas de tema ──────────────────────────────────────────────────
const DARK = {
    bg:          '#0f172a',
    sidebar:     'rgba(10,18,38,0.98)',
    border:      'rgba(99,102,241,0.25)',
    accent:      '#6366f1',
    text:        '#e2e8f0',
    muted:       '#64748b',
    subBg:       'rgba(99,102,241,0.1)',
    toggleBg:    'rgba(99,102,241,0.12)',
    toggleHover: 'rgba(251,191,36,0.15)',
    toggleIcon:  '#fbbf24',
};
const LIGHT = {
    bg:          '#f1f5f9',
    sidebar:     '#ffffff',
    border:      'rgba(99,102,241,0.20)',
    accent:      '#4f46e5',
    text:        '#1e293b',
    muted:       '#94a3b8',
    subBg:       'rgba(99,102,241,0.08)',
    toggleBg:    'rgba(99,102,241,0.10)',
    toggleHover: 'rgba(99,102,241,0.20)',
    toggleIcon:  '#6366f1',
};

// ─── Layout interno (accede al contexto) ─────────────────────────────
function AppLayoutInner({ children, subNav = [], activeSubSection = '' }) {
    const { url } = usePage();
    const { isDark, toggleTheme } = useTheme();
    const [open, setOpen] = useState(true);

    const C = isDark ? DARK : LIGHT;
    const W = open ? '220px' : '62px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif", color: C.text, transition: 'background 0.3s, color 0.3s' }}>

            {/* ── SIDEBAR GLOBAL ── */}
            <aside style={{
                width: W, minHeight: '100vh', flexShrink: 0,
                background: C.sidebar,
                borderRight: `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column',
                transition: 'width 0.25s cubic-bezier(.4,0,.2,1), background 0.3s, border-color 0.3s',
                overflow: 'hidden', position: 'sticky', top: 0, height: '100vh', zIndex: 50,
            }}>
                {/* Logo + colapsar */}
                <div style={{ padding: '1rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: `1px solid ${C.border}` }}>
                    <button onClick={() => setOpen(o => !o)} title={open ? 'Colapsar' : 'Expandir'} style={{
                        flexShrink: 0, width: '34px', height: '34px',
                        background: C.toggleBg, border: `1px solid ${C.border}`,
                        borderRadius: '0.45rem', color: C.accent, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                    }}>
                        {open ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                    </button>
                    {open && (
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem', background: 'linear-gradient(135deg,#a5b4fc,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                                SimOptimización
                            </div>
                            <div style={{ fontSize: '0.6rem', color: C.muted, whiteSpace: 'nowrap' }}>Simulación y Optimización</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '0.6rem 0', overflowY: 'auto', overflowX: 'hidden' }}>
                    {open && (
                        <div style={{ padding: '0.6rem 1rem 0.3rem', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: C.muted, textTransform: 'uppercase' }}>
                            Módulos
                        </div>
                    )}

                    {MODULOS.map(mod => {
                        const isCurrent = url === mod.href || (mod.href === '/' && url === '/');
                        const isDisabled = !mod.active;
                        const hasSubNav = isCurrent && subNav.length > 0;
                        const { Icon } = mod;

                        const modItem = (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.7rem',
                                padding: open ? '0.62rem 1rem' : '0.62rem 0',
                                justifyContent: open ? 'flex-start' : 'center',
                                borderLeft: isCurrent ? `3px solid ${C.accent}` : '3px solid transparent',
                                background: isCurrent ? C.subBg : 'transparent',
                                opacity: isDisabled ? 0.4 : 1,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s', userSelect: 'none',
                            }}>
                                <Icon size={17} style={{ flexShrink: 0, color: isCurrent ? C.accent : C.muted }} />
                                {open && (
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? C.accent : C.text, whiteSpace: 'nowrap' }}>
                                            {mod.label}
                                        </div>
                                        {isDisabled && <div style={{ fontSize: '0.6rem', color: C.muted }}>Próximamente</div>}
                                    </div>
                                )}
                            </div>
                        );

                        return (
                            <div key={mod.id}>
                                {isDisabled
                                    ? <div>{modItem}</div>
                                    : <Link href={mod.href} style={{ textDecoration: 'none', display: 'block' }}>{modItem}</Link>
                                }

                                {/* Sub-nav expandido */}
                                {hasSubNav && open && (
                                    <div style={{ borderLeft: `2px solid rgba(99,102,241,0.2)`, marginLeft: '1.75rem', marginBottom: '0.2rem' }}>
                                        {subNav.map(item => {
                                            const isActiveSub = activeSubSection === item.id;
                                            const SubIcon = item.Icon;
                                            return (
                                                <button key={item.id} onClick={item.onClick} style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    padding: '0.42rem 0.7rem',
                                                    background: isActiveSub ? C.subBg : 'transparent',
                                                    border: 'none',
                                                    borderLeft: isActiveSub ? `2px solid ${C.accent}` : '2px solid transparent',
                                                    color: isActiveSub ? C.accent : C.muted,
                                                    cursor: 'pointer', fontSize: '0.78rem',
                                                    fontWeight: isActiveSub ? 600 : 400,
                                                    textAlign: 'left', transition: 'all 0.12s', whiteSpace: 'nowrap',
                                                }}
                                                    onMouseEnter={e => { if (!isActiveSub) e.currentTarget.style.color = C.text; }}
                                                    onMouseLeave={e => { if (!isActiveSub) e.currentTarget.style.color = C.muted; }}
                                                >
                                                    {SubIcon && <SubIcon size={14} />}
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Sub-nav colapsado (solo iconos) */}
                                {hasSubNav && !open && (
                                    <div style={{ padding: '0.15rem 0' }}>
                                        {subNav.map(item => {
                                            const isActiveSub = activeSubSection === item.id;
                                            const SubIcon = item.Icon;
                                            return (
                                                <button key={item.id} onClick={item.onClick} title={item.label} style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: '0.38rem 0',
                                                    background: isActiveSub ? C.subBg : 'transparent',
                                                    border: 'none', color: isActiveSub ? C.accent : C.muted,
                                                    cursor: 'pointer', transition: 'all 0.12s',
                                                }}>
                                                    {SubIcon && <SubIcon size={15} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* ── Footer: toggle tema + copyright ── */}
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

                    {/* Botón toggle dark/light */}
                    <button
                        id="btn-toggle-tema"
                        onClick={toggleTheme}
                        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: open ? 'flex-start' : 'center',
                            gap: '0.6rem',
                            padding: open ? '0.55rem 0.75rem' : '0.55rem 0',
                            background: C.toggleBg,
                            border: `1px solid ${C.border}`,
                            borderRadius: '0.55rem',
                            color: C.toggleIcon,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = C.toggleHover;
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = C.toggleBg;
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {/* Ícono animado */}
                        <span style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '22px', height: '22px', flexShrink: 0,
                            transition: 'transform 0.4s ease',
                            transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
                        }}>
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </span>
                        {open && (
                            <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
                        )}
                    </button>

                    {/* Copyright */}
                    {open && (
                        <div style={{ fontSize: '0.6rem', color: C.muted, lineHeight: 1.6 }}>
                            © 2025 SimOptimización<br />Poisson · Exponencial · +
                        </div>
                    )}
                </div>
            </aside>

            {/* ── CONTENIDO ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {children}
            </div>
        </div>
    );
}

// ─── Export directo (ThemeProvider ya está en app.jsx) ─────────────────
export default function AppLayout(props) {
    return <AppLayoutInner {...props} />;
}
