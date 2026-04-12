<?php
// db_config.php
// Database configuration file

$db_host = 'localhost';
$db_user = 'root';      // Change to your database username
$db_pass = '';          // Change to your database password
$db_name = 'dashboard_db';

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