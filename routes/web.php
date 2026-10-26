<?php

use Illuminate\Support\Facades\Route;

// HTML SPA tidak boleh dicache browser: ia memuat referensi bundle JS/CSS
// ber-hash baru setiap build. Kalau HTML lama tersimpan, aplikasi berjalan
// dengan kode lama walau server sudah diperbarui.
$noCache = ['Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma' => 'no-cache'];

Route::get('/', function () use ($noCache) {
    return response()->view('app')->withHeaders($noCache);
});

Route::get('/{any}', function () use ($noCache) {
    return response()->view('app')->withHeaders($noCache);
})->where('any', '^(?!api|storage|up).*$');
