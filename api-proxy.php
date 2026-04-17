<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$BASE = 'https://toolsmarket.online';

$path = $_SERVER['REQUEST_URI'];
$path = preg_replace('#^/recharge#', '', $path);
$path = strtok($path, '?');

$url = $BASE . $path;
$method = $_SERVER['REQUEST_METHOD'];
$body = file_get_contents('php://input');

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
    CURLOPT_ENCODING       => 'gzip',
    CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_2TLS,
]);

if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false || !empty($error)) {
    http_response_code(502);
    echo json_encode(['error' => 'Upstream error: ' . $error]);
    exit();
}

// Cache GET key checks for 30s
if ($method === 'GET' && strpos($path, '/api/keys/') !== false && strpos($path, '/activation') === false) {
    $cacheFile = sys_get_temp_dir() . '/z3ra_' . md5($path) . '.cache';
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 30) {
        http_response_code(200);
        echo file_get_contents($cacheFile);
        exit();
    }
    file_put_contents($cacheFile, $response);
}

http_response_code($httpCode ?: 200);
echo $response;
