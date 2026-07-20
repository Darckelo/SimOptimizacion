# Suite de Simulación y Optimización Estocástica (SimOptimizacion)

[![Laravel](https://img.shields.io/badge/Laravel-11.0-FF2D20?style=flat-square&logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-1.0-9553E6?style=flat-square&logo=inertia)](https://inertiajs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.2-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)

Una suite de alto rendimiento para ingeniería de operaciones, modelado estadístico y optimización de procesos estocásticos. Permite calcular modelos matemáticos de líneas de espera y visualizar simulaciones en tiempo real mediante una interfaz premium y responsiva (soporte para temas Claro/Oscuro).

---

## 🛠️ Tecnologías y Arquitectura

El proyecto está construido sobre una arquitectura **híbrida moderna de alto rendimiento**:

| Tecnología / Librería | Tipo | Grado de Aplicación |
| :--- | :--- | :--- |
| **Laravel 11.0** (PHP ^8.2) | Backend (Core) | Gestiona el ciclo de vida de la aplicación, el enrutamiento web y sirve de contenedor base para el SPA. |
| **React 18.2.0** | Frontend (UI) | Controla la interfaz de usuario en modo SPA. Toda la lógica interactiva de entrada de datos, simulación y renderizado se ejecuta reactivamente en el cliente. |
| **Inertia.js 1.0** | Bridge (Laravel-React) | Permite renderizar componentes React directamente desde los controladores y rutas de Laravel compartiendo datos sin APIs complejas. |
| **Vite 5.0** | Bundler (Compilación) | Compila de forma óptima todos los recursos en caliente para un rendimiento instantáneo. |
| **Tailwind CSS 3.2.1** | Estilos (CSS) | Estructura el diseño visual adaptativo de toda la aplicación con bordes difuminados y paletas personalizadas. |
| **jStat 1.9.6** | Librería Matemática | Calcula las densidades probabilísticas y acumuladas de las distribuciones directamente en el cliente. |
| **Recharts 3.8.1** | Visualización | Dibuja las gráficas dinámicas e interactivas SVG de las curvas PMF, PDF y CDF. |
| **Lucide React 1.16.0** | Iconografía | Proporciona set de iconos vectoriales consistentes en toda la suite. |

---

## 🚀 Módulos del Sistema (100% Implementados)

### 1. Simulador Visual de Barbería (Vista de Dron)
Simula físicamente el comportamiento de una barbería con servidores múltiples y cola en tiempo real mediante un motor de eventos discretos.
*   **Visualización Cenital (Vista de Dron):** Renderiza en SVG dinámico un local de barbería detallado con pisos de baldosa, estaciones con luces LED de disponibilidad (Libre 🟢 / Ocupado 🔴), sala de espera con sofá de diseño y fila de clientes, barra con barber pole giratorio y puerta de salida.
*   **Escala Temporal:** 1 segundo real = 1 minuto simulado (1 minuto real de ejecución representa 1 hora simulada).
*   **Controles del Usuario:** Permite modificar la cantidad de sillas (1 a 20), tasas de llegada ($\lambda$) y servicio ($\mu$), y definir si la cola es infinita ($M/M/s$) o limitada ($M/M/s/K$) con capacidad de espera configurable.
*   **Reporte Detallado:** Al detener la simulación, se genera un reporte comparativo que contrasta las estadísticas empíricas recopiladas contra el modelo analítico:
    *   Factor de utilización del sistema ($\rho$).
    *   Tiempo promedio en cola ($W_q$) y en el sistema ($W_s$).
    *   Cantidad promedio de clientes en cola ($L_q$) y en el sistema ($L_s$).
    *   Tasa efectiva de llegada y tasa de clientes perdidos.
    *   Promedio de servidores activos e inactivos.
    *   Tabla de probabilidades de estado estable ($P_0$ a $P_k$) con precisión de $1 \times 10^{-4}$.
    *   Historial completo de tiempos de arribo y servicios individuales generados.
*   **Impresión Optimizada:** CSS adaptativo `@media print` para exportar a PDF de forma limpia, ocultando paneles y menús innecesarios.

### 2. Calculadora de Distribuciones Estocásticas
*   Analiza distribuciones **Poisson** y **Exponencial** a partir de una tasa $\lambda$.
*   Calcula 9 casos de probabilidad puntual, acumulada e intervalos.
*   Muestra estadísticos descriptivos (media, varianza, desviación estándar, asimetría, curtosis, CV).
*   Genera curvas y gráficos interactivos con un **Tour Guiado** dinámico.

### 3. Teoría de Colas - Servidor Único
*   Modela sistemas de colas con un único servidor utilizando los modelos tradicionales de Kendall **M/M/1** y **M/M/1/K**.
*   Calcula factores de utilización, tiempos de espera, longitudes de cola y distribución probabilística de estados estables.

### 4. Teoría de Colas - Varios Servidores
*   Resuelve modelos de colas con múltiples servidores paralelos **M/M/s** y **M/M/s/K**.
*   Implementa la fórmula exacta de probabilidad de espera de **Erlang C** y sumatorias de capacidad limitada.

### 5. Simulación de Monte Carlo
*   Simula bases de datos estadísticas masivas a partir de distribuciones Poisson y Exponenciales usando los métodos de Knuth y Transformada Inversa.
*   Permite exportar bases de datos simuladas directamente en **CSV** y **PDF**.

---

## ⚙️ Instalación y Uso Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/Darckelo/SimOptimizacion.git
    cd SimOptimizacion
    ```
2.  **Instalar dependencias:**
    ```bash
    composer install
    npm install
    ```
3.  **Configurar variables de entorno y base de datos:**
    ```bash
    cp .env.example .env
    php artisan key:generate
    php artisan migrate
    ```
4.  **Iniciar servidores de desarrollo:**
    *   Terminal 1 (Laravel): `php artisan serve`
    *   Terminal 2 (Vite): `npm run dev`
5.  **Abrir en el navegador:** Accede a `http://127.0.0.1:8000`.

---

## 🧪 Pruebas Unitarias y de Calidad

El sistema incluye dos scripts automáticos de verificación numérica para comprobar que los motores de cálculo en JS concuerdan exactamente con la teoría matemática clásica con un margen de tolerancia menor a $1 \times 10^{-6}$:

*   **Verificación de distribuciones:**
    ```bash
    node verify_calcs.mjs
    ```
*   **Verificación de modelos de varios servidores:**
    ```bash
    node verify_multi.mjs
    ```

Ambos deben retornar confirmación exitosa (`✅ TODOS LOS CÁLCULOS SON CORRECTOS`).

---

## 📁 Estructura del Frontend

Los cinco módulos viven cada uno en su propia página bajo `resources/js/Pages/`, pero comparten un pequeño conjunto de piezas comunes para no repetir la paleta de colores, los estilos de formulario, el tooltip de las gráficas y la navegación por secciones:

```
resources/js/
├── Pages/
│   ├── Calculadora.jsx          Distribuciones Poisson / Exponencial
│   ├── LineasEspera.jsx         Colas M/M/1 y M/M/1/K
│   ├── MultiServidor.jsx        Colas M/M/s y M/M/s/K
│   ├── MonteCarlo.jsx           Simulación de bases de datos (CSV/PDF)
│   └── SimulacionBarberia.jsx   Simulación visual de eventos discretos
├── Components/
│   ├── TourOverlay.jsx          Tour guiado reutilizado por todos los módulos
│   └── CustomTooltip.jsx        Tooltip de recharts (Calculadora, LineasEspera, MonteCarlo, MultiServidor)
├── theme/
│   ├── palettes.js               Paleta base Claro/Oscuro compartida (DARK_BASE / LIGHT_BASE)
│   └── formStyles.js             Fábrica de estilos de tarjeta/formulario (buildFormStyles)
├── hooks/
│   └── useSectionNav.js          Estado de sección activa + scroll suave + sub-nav para AppLayout
├── Layouts/
│   └── AppLayout.jsx
└── contexts/
    └── ThemeContext.jsx           Contexto Claro/Oscuro global
```

Cada módulo sigue extendiendo su propia paleta a partir de la base (`{ ...DARK_BASE, /* extras del módulo */ }`), así que valores realmente exclusivos de un módulo (por ejemplo, los tonos del simulador de la barbería) no se ven forzados a encajar en la base compartida. `SimulacionBarberia.jsx` conserva su propia paleta y estilos porque son visualmente distintos por diseño (tema "taller"), no una duplicación accidental.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

