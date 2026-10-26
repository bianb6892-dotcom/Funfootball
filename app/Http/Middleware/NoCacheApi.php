<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API mengembalikan data dinamis (lineup, koleksi, mail) — responsnya tidak
 * boleh disimpan browser. Tanpa header ini, browser boleh menyajikan JSON
 * lama dari cache sehingga perubahan server (foto/flag baru) tidak terlihat
 * walau halaman sudah di-refresh.
 */
class NoCacheApi
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');

        return $response;
    }
}
