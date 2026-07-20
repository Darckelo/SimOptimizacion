import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { BarChart2, Users, Package, ArrowRight, Tag, Server, Shuffle, Scissors } from 'lucide-react';

// ─── Paletas ──────────────────────────────────────────────────────────
const DARK_C = {
    bg:           '#0f172a',
    card:         'rgba(30,41,59,0.85)',
    cardHover:    'rgba(40,55,80,0.95)',
    cardDisabled: 'rgba(15,23,42,0.5)',
    border:       'rgba(99,102,241,0.20)',
    borderHover:  'rgba(99,102,241,0.55)',
    borderDisabled: 'rgba(99,102,241,0.08)',
    accent:       '#6366f1',
    accent2:      '#8b5cf6',
    green:        '#10b981',
    amber:        '#f59e0b',
    text:         '#e2e8f0',
    muted:        '#64748b',
    titleColor:   '#e2e8f0',
    footerBorder: 'rgba(99,102,241,0.1)',
    tagBg:        'rgba(99,102,241,0.12)',
    tagBorder:    'rgba(99,102,241,0.25)',
    iconBgOn:     'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))',
    iconBorderOn: 'rgba(99,102,241,0.35)',
    iconBgOff:    'rgba(99,102,241,0.06)',
    iconBorderOff:'rgba(99,102,241,0.1)',
    badgeGreenBg: 'rgba(16,185,129,0.15)',
    badgeGreenBorder:'rgba(16,185,129,0.3)',
    badgeGrayBg:  'rgba(100,116,139,0.15)',
    badgeGrayBorder:'rgba(100,116,139,0.2)',
    ctaBorder:    'rgba(99,102,241,0.15)',
};
const LIGHT_C = {
    bg:           '#f0f4ff',
    card:         '#ffffff',
    cardHover:    '#f5f7ff',
    cardDisabled: 'rgba(241,245,249,0.7)',
    border:       'rgba(99,102,241,0.18)',
    borderHover:  'rgba(99,102,241,0.50)',
    borderDisabled: 'rgba(148,163,184,0.25)',
    accent:       '#4f46e5',
    accent2:      '#7c3aed',
    green:        '#059669',
    amber:        '#b45309',
    text:         '#1e293b',
    muted:        '#64748b',
    titleColor:   '#3730a3',
    footerBorder: 'rgba(99,102,241,0.12)',
    tagBg:        'rgba(79,70,229,0.08)',
    tagBorder:    'rgba(79,70,229,0.20)',
    iconBgOn:     'linear-gradient(135deg,rgba(79,70,229,0.12),rgba(124,58,237,0.12))',
    iconBorderOn: 'rgba(79,70,229,0.30)',
    iconBgOff:    'rgba(148,163,184,0.10)',
    iconBorderOff:'rgba(148,163,184,0.20)',
    badgeGreenBg: 'rgba(5,150,105,0.10)',
    badgeGreenBorder:'rgba(5,150,105,0.30)',
    badgeGrayBg:  'rgba(100,116,139,0.08)',
    badgeGrayBorder:'rgba(100,116,139,0.18)',
    ctaBorder:    'rgba(79,70,229,0.12)',
};

// ─── Card de módulo ───────────────────────────────────────────────────
function ModuloCard({ mod, C }) {
    const { Icon } = mod;
    const cardInner = (
        <div style={{
            background: mod.disponible ? C.card : C.cardDisabled,
            border: `1px solid ${mod.disponible ? C.border : C.borderDisabled}`,
            borderRadius: '1.1rem',
            padding: '1.75rem',
            height: '100%',
            display: 'flex', flexDirection: 'column', gap: '1rem',
            cursor: mod.disponible ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            opacity: mod.disponible ? 1 : 0.5,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: mod.disponible ? '0 2px 12px rgba(99,102,241,0.07)' : 'none',
        }}
            onMouseEnter={e => {
                if (!mod.disponible) return;
                e.currentTarget.style.border = `1px solid ${C.borderHover}`;
                e.currentTarget.style.background = C.cardHover;
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 12px 40px rgba(99,102,241,0.18)`;
            }}
            onMouseLeave={e => {
                if (!mod.disponible) return;
                e.currentTarget.style.border = `1px solid ${C.border}`;
                e.currentTarget.style.background = C.card;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.07)';
            }}
        >
            {/* Glow fondo si disponible */}
            {mod.disponible && (
                <div style={{
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '120px', height: '120px',
                    background: `radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />
            )}

            {/* Header: ícono + badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                    width: '48px', height: '48px',
                    background: mod.disponible ? C.iconBgOn : C.iconBgOff,
                    border: `1px solid ${mod.disponible ? C.iconBorderOn : C.iconBorderOff}`,
                    borderRadius: '0.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: mod.disponible ? C.accent : C.muted,
                }}>
                    <Icon size={22} />
                </div>
                {mod.disponible
                    ? <span style={{ fontSize: '0.65rem', fontWeight: 700, background: C.badgeGreenBg, border: `1px solid ${C.badgeGreenBorder}`, color: C.green, borderRadius: '9999px', padding: '0.2rem 0.6rem' }}>Disponible</span>
                    : <span style={{ fontSize: '0.65rem', fontWeight: 700, background: C.badgeGrayBg, border: `1px solid ${C.badgeGrayBorder}`, color: C.muted, borderRadius: '9999px', padding: '0.2rem 0.6rem' }}>En desarrollo</span>
                }
            </div>

            {/* Título + descripción */}
            <div>
                <h2 style={{ margin: '0 0 0.4rem', fontSize: '1rem', fontWeight: 700, color: mod.disponible ? C.text : C.muted }}>{mod.titulo}</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: C.muted, lineHeight: 1.5 }}>{mod.desc}</p>
            </div>

            {/* Tags */}
            {mod.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 'auto' }}>
                    {mod.tags.map(t => (
                        <span key={t} style={{
                            fontSize: '0.65rem', fontWeight: 600,
                            background: C.tagBg,
                            border: `1px solid ${C.tagBorder}`,
                            color: C.accent, borderRadius: '0.35rem',
                            padding: '0.15rem 0.5rem',
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        }}>
                            <Tag size={9} />{t}
                        </span>
                    ))}
                </div>
            )}

            {/* CTA */}
            {mod.disponible && (
                <div style={{
                    marginTop: 'auto', paddingTop: '0.75rem',
                    borderTop: `1px solid ${C.ctaBorder}`,
                    display: 'flex', alignItems: 'center',
                }}>
                    <span style={{ fontSize: '0.78rem', color: C.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <ArrowRight size={14} /> Abrir módulo
                    </span>
                </div>
            )}
        </div>
    );

    return mod.disponible
        ? <Link href={mod.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>{cardInner}</Link>
        : <div style={{ display: 'flex', flexDirection: 'column' }}>{cardInner}</div>;
}

// ─── Página principal ─────────────────────────────────────────────────
export default function Inicio() {
    const { isDark } = useTheme();
    const C = isDark ? DARK_C : LIGHT_C;

    const MODULOS = [
        {
            id: 'calculadora', href: '/calculadora',
            Icon: BarChart2,
            titulo: 'Calculadora de Distribuciones',
            desc: 'Poisson y Exponencial. Calcula probabilidades, estadísticos y genera gráficas interactivas.',
            tags: ['Poisson', 'Exponencial', 'PMF', 'CDF'],
            color: C.accent, disponible: true,
        },
        {
            id: 'lineas-espera', href: '/lineas-espera',
            Icon: Users,
            titulo: 'Líneas de Espera',
            desc: 'Teoría de Colas M/M/1 y M/M/1/K. Calcula ρ, P₀, Ls, Lq, Ws, Wq, distribución P(n) y más.',
            tags: ['M/M/1', 'M/M/1/K', 'Colas', 'Servidor único'],
            color: C.accent, disponible: true,
        },
        {
            id: 'multi-servidor', href: '/multi-servidor',
            Icon: Server,
            titulo: 'Varios Servidores',
            desc: 'Modelos M/M/s y M/M/s/K. Calcula ρ, Erlang C, P₀, Ls, Lq, Ws, Wq con múltiples servidores en paralelo.',
            tags: ['M/M/s', 'M/M/s/K', 'Erlang C', 'Multi-servidor'],
            color: C.accent, disponible: true,
        },
        {
            id: 'monte-carlo', href: '/monte-carlo',
            Icon: Shuffle,
            titulo: 'Simulación de Monte Carlo',
            desc: 'Simula bases de datos de distribuciones Poisson y Exponencial usando los métodos de Knuth y Transformación Inversa. Exporta en CSV y PDF.',
            tags: ['Monte Carlo', 'Poisson', 'Exponencial', 'Simulación'],
            color: C.accent, disponible: true,
        },
        {
            id: 'simulacion-barberia', href: '/simulacion-barberia',
            Icon: Scissors,
            titulo: 'Simulación de Barbería',
            desc: 'Simula una barbería multi-servidor en tiempo real con vista de Dron (top-down). Configura sillas, λ, μ y límite de cola. Genera reporte completo al detener.',
            tags: ['M/M/s/K', 'Eventos Discretos', 'SVG', 'Vista Dron'],
            color: C.accent, disponible: true,
        },
    ];

    return (
        <AppLayout>
            <Head title="Inicio — SimOptimización" />
            <div style={{
                padding: '2.5rem 2rem',
                maxWidth: '1100px', margin: '0 auto',
                width: '100%', boxSizing: 'border-box',
                minHeight: '100vh',
                background: C.bg,
                transition: 'background 0.3s',
            }}>

                {/* Hero */}
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        borderRadius: '0.65rem', padding: '0.3rem 1rem',
                        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
                        color: '#fff', marginBottom: '1rem',
                    }}>
                        SIMULACIÓN Y OPTIMIZACIÓN
                    </div>
                    <h1 style={{
                        fontSize: '2.4rem', fontWeight: 900,
                        margin: '0 0 0.75rem',
                        color: C.titleColor,
                        lineHeight: 1.15,
                        transition: 'color 0.3s',
                    }}>
                        Panel de Módulos
                    </h1>
                    <p style={{ color: C.muted, fontSize: '1rem', maxWidth: '480px', lineHeight: 1.6, transition: 'color 0.3s' }}>
                        Selecciona un módulo para comenzar. Los módulos marcados como{' '}
                        <span style={{ color: C.green, fontWeight: 600 }}>Disponible</span>{' '}
                        están listos para usar.
                    </p>
                </div>

                {/* Grid de módulos */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {MODULOS.map(mod => <ModuloCard key={mod.id} mod={mod} C={C} />)}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '3rem', paddingTop: '1.5rem',
                    borderTop: `1px solid ${C.footerBorder}`,
                    textAlign: 'center', color: C.muted, fontSize: '0.72rem',
                    transition: 'border-color 0.3s, color 0.3s',
                }}>
                    SimOptimización · Simulación y Optimización
                </div>
            </div>
        </AppLayout>
    );
}
