<?php
$data = json_encode(['email' => 'davehermoso01@gmail.com', 'password' => 'password']);
$options = [
    'http' => [
        'header'  => "Content-type: application/json\r\nOrigin: https://random-site.com\r\n",
        'method'  => 'POST',
        'content' => $data,
        'ignore_errors' => true,
    ]
];
$context  = stream_context_create($options);
$result = file_get_contents('https://darkgoldenrod-anteater-579870.hostingersite.com/api/login', false, $context);
echo "HEADERS:\n";
print_r($http_response_header);
echo "\nBODY:\n";
echo $result;
