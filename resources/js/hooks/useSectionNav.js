import { useCallback, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────
// Navegación por secciones compartida por Calculadora, LineasEspera,
// MonteCarlo y MultiServidor: mantiene la sección activa y arma el
// arreglo `subNav` (con el onClick de scroll) que consume AppLayout.
// SimulacionBarberia no usa este patrón porque no tiene sub-navegación
// por secciones.
//
// Uso:
//   const { activeSection, subNav } = useSectionNav(SUB_NAV_DEF, 'config');
//   <AppLayout subNav={subNav} activeSubSection={activeSection}>
// ─────────────────────────────────────────────────────────────────────
export default function useSectionNav(subNavDef, initialId) {
    const [activeSection, setActiveSection] = useState(initialId ?? subNavDef[0]?.id);

    const scrollTo = useCallback((id) => {
        setActiveSection(id);
        const el = document.getElementById('sec-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const subNav = subNavDef.map(item => ({ ...item, onClick: () => scrollTo(item.id) }));

    return { activeSection, setActiveSection, scrollTo, subNav };
}
