<?php
header('Content-Type: application/json');

// 1. Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// 2. Get and parse JSON input
$input = json_decode(file_get_contents('php://input'), true);

// 3. Validate required fields
if (!isset($input['frameCount'], $input['pages'], $input['algorithm'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$frameCount = intval($input['frameCount']);
$pages = $input['pages'];
$algorithm = $input['algorithm'];

// 4. Validate input constraints
if ($frameCount < 1 || $frameCount > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid frame count (1-100)']);
    exit;
}

if (!is_array($pages) || count($pages) < 1 || count($pages) > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid page count (1-100)']);
    exit;
}

if (!in_array($algorithm, ['FIFO', 'LRU'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid algorithm selected']);
    exit;
}

// 5. Core Backend Simulation Processor
function simulatePageReplacement($frames, $pages, $onHit) {
    $memory = [];
    $steps = [];
    $hits = 0;
    $faults = 0;
    $queue = [];

    foreach ($pages as $page) {
        $pageIndex = array_search($page, $memory, true);
        $isHit = ($pageIndex !== false);

        if ($isHit) {
            $hits++;
            $onHit($queue, $page);
            $steps[] = [
                'page'       => $page,
                'memory'     => $memory,
                'isHit'      => true,
                'replaced'   => null,
                'memorySize' => count($memory),
                'queue'      => $queue,
                'queueFront' => !empty($queue) ? $queue[0] : null
            ];
        } else {
            $faults++;
            $replaced = null;

            if (count($memory) < $frames) {
                $memory[] = $page;
                $queue[] = $page;
            } else {
                $replaced = array_shift($queue);
                $replaceIndex = array_search($replaced, $memory, true);
                $memory[$replaceIndex] = $page;
                $queue[] = $page;
            }

            $steps[] = [
                'page'       => $page,
                'memory'     => $memory,
                'isHit'      => false,
                'replaced'   => $replaced,
                'memorySize' => count($memory),
                'queue'      => $queue,
                'queueFront' => !empty($queue) ? $queue[0] : null
            ];
        }
    }

    return [
        'hits'   => $hits,
        'faults' => $faults,
        'steps'  => $steps
    ];
}

// 6. Run selected algorithm logic
if ($algorithm === 'FIFO') {
    $result = simulatePageReplacement($frameCount, $pages, function(&$queue, $page) {
        // FIFO queue remains untouched on hit
    });
} else {
    $result = simulatePageReplacement($frameCount, $pages, function(&$queue, $page) {
        // LRU: Move accessed page to the back (Most Recently Used)
        $queueIndex = array_search($page, $queue, true);
        if ($queueIndex !== false) {
            array_splice($queue, $queueIndex, 1);
        }
        $queue[] = $page;
    });
}

// 7. Output simulation response JSON
echo json_encode($result);
exit;