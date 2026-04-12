<?php
// db_config.php
// Database configuration file

$db_host = 'MYSQL5045.site4now.net';   // Remote MySQL server
$db_user = 'ac7ecf_timsup';            // Database username
$db_pass = 'YOUR_DB_PASSWORD';         // <-- Replace with actual password
$db_name = 'db_ac7ecf_timsup';         // Database name

// Create connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Set timezone
date_default_timezone_set('UTC');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
