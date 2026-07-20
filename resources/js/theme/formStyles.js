// ─────────────────────────────────────────────────────────────────────
// Estilos de formulario/tarjeta compartidos por los módulos de
// simulación con gráficas (Calculadora, LineasEspera, MonteCarlo,
// MultiServidor). Todos definían exactamente los mismos objetos de
// estilo a partir de la paleta activa `C`; esta función centraliza esa
// definición sin cambiar ningún valor por defecto.
//
// Uso típico dentro de un módulo:
//   const { cardStyle, labelStyle, inputStyle, selectStyle } = buildFormStyles(C);
//
// Si un módulo necesita una variación puntual (como hace
// SimulacionBarberia, que no usa esta fábrica por tener valores
// propios), puede pasar `overrides` para ajustar solo lo necesario:
//   buildFormStyles(C, { cardStyle: { padding: '1.25rem' } });
// ─────────────────────────────────────────────────────────────────────

export function buildFormStyles(C, overrides = {}) {
    const cardStyle = {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '1rem',
        padding: '1.5rem',
        backdropFilter: 'blur(12px)',
        transition: 'background 0.3s, border-color 0.3s',
        ...overrides.cardStyle,
    };

    const labelStyle = {
        color: C.muted,
        fontSize: '0.72rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.4rem',
        display: 'block',
        ...overrides.labelStyle,
    };

    const inputStyle = {
        width: '100%',
        background: C.inputBg,
        border: `1px solid ${C.border}`,
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        color: C.text,
        fontSize: '0.95rem',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'background 0.3s, color 0.3s',
        ...overrides.inputStyle,
    };

    const selectStyle = { ...inputStyle, cursor: 'pointer', ...overrides.selectStyle };

    return { cardStyle, labelStyle, inputStyle, selectStyle };
}
