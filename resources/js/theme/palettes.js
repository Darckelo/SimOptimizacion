// ─────────────────────────────────────────────────────────────────────
// Paleta base compartida por los módulos de simulación con gráficas
// (Calculadora, LineasEspera, MonteCarlo, MultiServidor).
//
// Cada módulo construye su propia paleta extendiendo esta base con las
// claves adicionales que necesite:
//
//   const DARK_C  = { ...DARK_BASE,  /* extras propios del módulo */ };
//   const LIGHT_C = { ...LIGHT_BASE, /* extras propios del módulo */ };
//
// SimulacionBarberia usa una paleta propia (tema "taller/tienda") y no
// participa de esta base porque sus valores son distintos a propósito.
// ─────────────────────────────────────────────────────────────────────

export const DARK_BASE = {
    bg: '#0f172a',
    card: 'rgba(30,41,59,0.85)',
    border: 'rgba(99,102,241,0.25)',
    accent: '#6366f1',
    accent2: '#8b5cf6',
    green: '#10b981',
    amber: '#f59e0b',
    text: '#e2e8f0',
    muted: '#94a3b8',
    danger: '#ef4444',
    inputBg: 'rgba(15,23,42,0.7)',
    resultBg: 'rgba(16,185,129,0.07)',
    resultBorder: 'rgba(16,185,129,0.25)',
    statBg: 'rgba(245,158,11,0.07)',
    statBorder: 'rgba(245,158,11,0.2)',
    infoBoxBg: 'rgba(99,102,241,0.08)',
    infoBoxBorder: 'rgba(99,102,241,0.25)',
    titleColor: '#e2e8f0',
    tabActiveBg: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    // Nota: tabInactiveText NO va aquí — en modo oscuro Calculadora usa
    // '#64748b' mientras el resto usa '#94a3b8'; cada módulo lo define.
    tableBg: 'rgba(15,23,42,0.5)',
    tableRowAlt: 'rgba(99,102,241,0.04)',
    tableHeaderBg: 'rgba(99,102,241,0.12)',
};

export const LIGHT_BASE = {
    bg: '#f0f4ff',
    card: '#ffffff',
    border: 'rgba(99,102,241,0.20)',
    accent: '#4f46e5',
    accent2: '#7c3aed',
    green: '#059669',
    amber: '#b45309',
    text: '#1e293b',
    muted: '#64748b',
    danger: '#dc2626',
    inputBg: '#f8fafc',
    resultBg: 'rgba(5,150,105,0.07)',
    resultBorder: 'rgba(5,150,105,0.30)',
    statBg: 'rgba(180,83,9,0.07)',
    statBorder: 'rgba(180,83,9,0.20)',
    infoBoxBg: 'rgba(79,70,229,0.06)',
    infoBoxBorder: 'rgba(79,70,229,0.20)',
    titleColor: '#3730a3',
    tabActiveBg: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    tabInactiveText: '#64748b',
    tableBg: 'rgba(248,250,252,0.8)',
    tableRowAlt: 'rgba(99,102,241,0.03)',
    tableHeaderBg: 'rgba(79,70,229,0.08)',
};
