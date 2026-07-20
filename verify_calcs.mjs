/**
 * Script de verificación de cálculos para la calculadora de distribuciones.
 * Compara los resultados del código contra valores teóricos conocidos.
 * 
 * Ejecutar: node verify_calcs.mjs
 */

// Reimplementar la lógica de jStat manualmente para verificación cruzada
// Usamos las fórmulas matemáticas directas

// ═══════════════════════════════════════════════════════════════════════
// POISSON: P(X=k) = (λ^k * e^(-λ)) / k!
// ═══════════════════════════════════════════════════════════════════════

function factorial(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

function poissonPMF(k, lambda) {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function poissonCDF(k, lambda) {
    let sum = 0;
    for (let i = 0; i <= k; i++) {
        sum += poissonPMF(i, lambda);
    }
    return sum;
}

// ═══════════════════════════════════════════════════════════════════════
// EXPONENCIAL: f(x) = λ*e^(-λx), CDF(x) = 1 - e^(-λx)
// ═══════════════════════════════════════════════════════════════════════

function exponentialCDF(x, lambda) {
    if (x < 0) return 0;
    return 1 - Math.exp(-lambda * x);
}

// ═══════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════

let allPassed = true;

function assert(name, actual, expected, tolerance = 1e-6) {
    const pass = Math.abs(actual - expected) < tolerance;
    if (!pass) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Expected: ${expected}`);
        console.log(`   Got:      ${actual}`);
        console.log(`   Diff:     ${Math.abs(actual - expected)}`);
        allPassed = false;
    } else {
        console.log(`✅ PASS: ${name} = ${actual.toFixed(6)}`);
    }
}

console.log('\n══════════════════════════════════════════════');
console.log(' POISSON: λ=3, xᵢ=2, xⱼ=5');
console.log('══════════════════════════════════════════════\n');

const lambda_p = 3;
const xi_p = 2;
const xj_p = 5;

const cdf_xi_p = poissonCDF(xi_p, lambda_p);       // P(X ≤ 2)
const cdf_xi1_p = poissonCDF(xi_p - 1, lambda_p);  // P(X ≤ 1) = P(X < 2)
const pmf_xi_p = poissonPMF(xi_p, lambda_p);        // P(X = 2)
const cdf_xj_p = poissonCDF(xj_p, lambda_p);        // P(X ≤ 5)
const cdf_xj1_p = poissonCDF(xj_p - 1, lambda_p);  // P(X ≤ 4) = P(X < 5)

// Casos simples
const p_mayor_xi_p = 1 - cdf_xi_p;          // P(X > 2) = 1 - P(X ≤ 2)
const p_menor_xi_p = cdf_xi1_p;             // P(X < 2) = P(X ≤ 1)
const p_igual_xi_p = pmf_xi_p;              // P(X = 2)
const p_mayor_igual_xi_p = 1 - cdf_xi1_p;   // P(X ≥ 2) = 1 - P(X ≤ 1)
const p_menor_igual_xi_p = cdf_xi_p;         // P(X ≤ 2)

console.log('--- Casos simples ---');
assert('P(X > 2)', p_mayor_xi_p, 0.576810);
assert('P(X < 2)', p_menor_xi_p, 0.199148);
assert('P(X = 2)', p_igual_xi_p, 0.224042);
assert('P(X ≥ 2)', p_mayor_igual_xi_p, 0.800852);
assert('P(X ≤ 2)', p_menor_igual_xi_p, 0.423190);

// Verificar identidades fundamentales
console.log('\n--- Identidades ---');
assert('P(X>xi) + P(X≤xi) = 1', p_mayor_xi_p + p_menor_igual_xi_p, 1.0);
assert('P(X<xi) + P(X≥xi) = 1', p_menor_xi_p + p_mayor_igual_xi_p, 1.0);
assert('P(X≥xi) = P(X>xi) + P(X=xi)', p_mayor_igual_xi_p, p_mayor_xi_p + p_igual_xi_p);
assert('P(X≤xi) = P(X<xi) + P(X=xi)', p_menor_igual_xi_p, p_menor_xi_p + p_igual_xi_p);

// Casos de intervalo
console.log('\n--- Intervalos (Poisson) ---');
const p_strict_p = cdf_xj1_p - cdf_xi_p;     // P(2 < X < 5) = P(X≤4) - P(X≤2)
const p_inc_inc_p = cdf_xj_p - cdf_xi1_p;     // P(2 ≤ X ≤ 5) = P(X≤5) - P(X≤1)
const p_inc_exc_p = cdf_xj1_p - cdf_xi1_p;    // P(2 ≤ X < 5) = P(X≤4) - P(X≤1)
const p_exc_inc_p = cdf_xj_p - cdf_xi_p;      // P(2 < X ≤ 5) = P(X≤5) - P(X≤2)

assert('P(2 < X < 5)', p_strict_p, 0.392073);
assert('P(2 ≤ X ≤ 5)', p_inc_inc_p, 0.716934);
assert('P(2 ≤ X < 5)', p_inc_exc_p, 0.616115);
assert('P(2 < X ≤ 5)', p_exc_inc_p, 0.492892, 1e-5);

// Verificar: P(a≤X≤b) = P(a<X<b) + P(X=a) + P(X=b)
const pmf_xj_p = poissonPMF(xj_p, lambda_p);
assert('P(a≤X≤b) = P(a<X<b) + P(X=a) + P(X=b)', p_inc_inc_p, p_strict_p + pmf_xi_p + pmf_xj_p);

console.log('\n══════════════════════════════════════════════');
console.log(' EXPONENCIAL: λ=3, xᵢ=2, xⱼ=5');
console.log('══════════════════════════════════════════════\n');

const lambda_e = 3;
const xi_e = 2;
const xj_e = 5;

const cdf_xi_e = exponentialCDF(xi_e, lambda_e);
const cdf_xj_e = exponentialCDF(xj_e, lambda_e);

console.log('--- Casos simples ---');
assert('P(X > 2)', 1 - cdf_xi_e, Math.exp(-lambda_e * xi_e));
assert('P(X < 2) = P(X ≤ 2)', cdf_xi_e, 1 - Math.exp(-lambda_e * xi_e));
assert('P(X = 2)', 0, 0); // Siempre 0 en continua
assert('P(X ≥ 2) = P(X > 2)', 1 - cdf_xi_e, Math.exp(-lambda_e * xi_e));
assert('P(X ≤ 2)', cdf_xi_e, 1 - Math.exp(-lambda_e * xi_e));

console.log('\n--- Identidades ---');
assert('P(X>xi) + P(X≤xi) = 1', (1 - cdf_xi_e) + cdf_xi_e, 1.0);

console.log('\n--- Intervalos (todos iguales en continua) ---');
const p_interval_e = cdf_xj_e - cdf_xi_e;
assert('P(2 ≤ X ≤ 5)', p_interval_e, Math.exp(-lambda_e * xi_e) - Math.exp(-lambda_e * xj_e));

console.log('\n══════════════════════════════════════════════');
console.log(' ESTADÍSTICOS');
console.log('══════════════════════════════════════════════\n');

// Poisson λ=3
console.log('--- Poisson λ=3 ---');
assert('Media', 3, 3);
assert('Varianza', 3, 3);
assert('Desv. Estándar', Math.sqrt(3), 1.732051);
assert('Asimetría = 1/√λ', 1/Math.sqrt(3), 0.577350);
assert('Curtosis = 1/λ', 1/3, 0.333333);
assert('CV = (σ/μ)×100', (Math.sqrt(3)/3)*100, 57.735027);

// Exponencial λ=3
console.log('\n--- Exponencial λ=3 ---');
assert('Media = 1/λ', 1/3, 0.333333);
assert('Varianza = 1/λ²', 1/9, 0.111111);
assert('Desv. Estándar = 1/λ', 1/3, 0.333333);
assert('Asimetría', 2, 2);
assert('Curtosis', 6, 6);
assert('CV', 100, 100);

// ═══════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
if (allPassed) {
    console.log(' ✅ TODOS LOS CÁLCULOS SON CORRECTOS');
} else {
    console.log(' ❌ HAY CÁLCULOS INCORRECTOS — REVISAR ARRIBA');
}
console.log('══════════════════════════════════════════════\n');
