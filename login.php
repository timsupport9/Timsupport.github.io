<?php
session_start();
$conn = new mysqli("localhost","root","","resourcehub");

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    $sql = "SELECT * FROM users WHERE username=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s",$username);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();

    if ($result && password_verify($password, $result['password'])) {
        $_SESSION['user'] = $result['username'];
        $_SESSION['role'] = $result['role'];
        header("Location: resources.php");
        exit;
    } else {
        $error = "Invalid login!";
    }
}
?>

<!DOCTYPE html>
<html>
<head>
  <title>Login — Resource Hub</title>
  <style>
    body {font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f4f6f9;}
    .login-box {background:white;padding:30px;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,0.2);}
    input {display:block;width:100%;margin:10px 0;padding:10px;}
    button {background:#0b5ed7;color:white;padding:10px;width:100%;border:none;border-radius:5px;cursor:pointer;}
    button:hover {background:#094bb0;}
    .error {color:red;}
  </style>
</head>
<body>
  <div class="login-box">
    <h2>Login</h2>
    <?php if(!empty($error)) echo "<p class='error'>$error</p>"; ?>
    <form method="post">
      <input type="text" name="username" placeholder="Username" required/>
      <input type="password" name="password" placeholder="Password" required/>
      <button type="submit">Login</button>
    </form>
  </div>
</body>
</html>