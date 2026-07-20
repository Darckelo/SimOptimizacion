<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// 1. Ruta raíz → Página de Inicio (panel de módulos)
Route::get('/', function () {
    return Inertia::render('Inicio');
})->name('inicio');

// 2. Módulo: Calculadora de Distribuciones
Route::get('/calculadora', function () {
    return Inertia::render('Calculadora');
})->name('calculadora');

// 3. Módulo: Líneas de Espera (Teoría de Colas)
Route::get('/lineas-espera', function () {
    return Inertia::render('LineasEspera');
})->name('lineas-espera');

// 4. Módulo: Varios Servidores (M/M/s & M/M/s/K)
Route::get('/multi-servidor', function () {
    return Inertia::render('MultiServidor');
})->name('multi-servidor');

// 5. Módulo: Simulación de Monte Carlo
Route::get('/monte-carlo', function () {
    return Inertia::render('MonteCarlo');
})->name('monte-carlo');

// 6. Módulo: Simulación de Barbería
Route::get('/simulacion-barberia', function () {
    return Inertia::render('SimulacionBarberia');
})->name('simulacion-barberia');

// --- Rutas Base de Laravel Breeze (Se mantienen intactas para proteger el sistema) ---

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';