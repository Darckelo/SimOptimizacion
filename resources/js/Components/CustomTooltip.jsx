import React from 'react';

// ─────────────────────────────────────────────────────────────────────
// Tooltip personalizado para las gráficas (recharts) de Calculadora,
// LineasEspera, MonteCarlo y MultiServidor. Los cuatro módulos
// definían el mismo componente, solo cambiando la letra usada para
// identificar el valor del eje X ("x" o "n"); ese detalle ahora se
// controla con la prop `labelPrefix`.
//
// Uso:
//   <Tooltip content={<CustomTooltip />} />            // "x = ..."
//   <Tooltip content={<CustomTooltip labelPrefix="n" />} /> // "n = ..."
// ─────────────────────────────────────────────────────────────────────
export default function CustomTooltip({ active, payload, label, labelPrefix = 'x', decimals = 6 }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.5rem', padding: '0.5rem 1rem', color: '#e2e8f0', fontSize: '0.8rem' }}>
            <p style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>{labelPrefix} = {label}</p>
            {payload.map(p => (
                <p key={p.dataKey} style={{ color: p.color, margin: '0.1rem 0' }}>{p.name}: {Number(p.value).toFixed(decimals)}</p>
            ))}
        </div>
    );
}
