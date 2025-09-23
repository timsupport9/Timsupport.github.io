<?php
session_start();
if (!isset($_SESSION['user']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

$conn = new mysqli("localhost","root","","resourcehub");

/* =========================
   ADD RESOURCE
========================= */
if ($_SERVER['REQUEST_METHOD']=='POST' && isset($_POST['addResource'])) {
    $title=$_POST['title'];
    $desc=$_POST['description'];
    $tags=$_POST['tags'];
    $link=$_POST['link'];
    $stmt=$conn->prepare("INSERT INTO resources(title,description,tags,link) VALUES(?,?,?,?)");
    $stmt->bind_param("ssss",$title,$desc,$tags,$link);
    $stmt->execute();
}

/* =========================
   ADD USER
========================= */
if ($_SERVER['REQUEST_METHOD']=='POST' && isset($_POST['addUser'])) {
    $username = $_POST['username'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $role = $_POST['role'];
    $stmt = $conn->prepare("INSERT INTO users(username,password,role) VALUES(?,?,?)");
    $stmt->bind_param("sss",$username,$password,$role);
    $stmt->execute();
}

/* =========================
   DELETE RESOURCE
========================= */
if (isset($_GET['delRes'])) {
    $id = intval($_GET['delRes']);
    $conn->query("DELETE FROM resources WHERE id=$id");
}

/* =========================
   DELETE USER
========================= */
if (isset($_GET['delUser'])) {
    $id = intval($_GET['delUser']);
    $conn->query("DELETE FROM users WHERE id=$id");
}

/* =========================
   FETCH DATA
========================= */
$res=$conn->query("SELECT * FROM resources ORDER BY id DESC");
$users=$conn->query("SELECT * FROM users ORDER BY id DESC");
?>
<!DOCTYPE html>
<html>
<head>
  <title>Admin — Resource Hub</title>
  <style>
    body {font-family:Arial, sans-serif; margin:20px;}
    h1,h2 {color:#0b5ed7;}
    form {margin-bottom:20px;padding:15px;border:1px solid #ccc;border-radius:8px;background:#f9f9f9;}
    input,textarea,select,button {margin:5px 0;padding:10px;width:100%;max-width:400px;}
    button {background:#0b5ed7;color:white;border:none;cursor:pointer;border-radius:5px;}
    button:hover {background:#094bb0;}
    table {border-collapse:collapse;width:100%;margin-top:15px;}
    th,td {border:1px solid #ccc;padding:10px;text-align:left;}
    th {background:#0b5ed7;color:white;}
    a.delete {color:red;text-decoration:none;font-weight:bold;}
  </style>
</head>
<body>
  <h1>Admin Panel</h1>
  <p>Welcome, <?php echo $_SESSION['user']; ?> | <a href="logout.php">Logout</a></p>

  <!-- Add Resource -->
  <h2>Add Resource</h2>
  <form method="post">
    <input type="text" name="title" placeholder="Title" required/>
    <textarea name="description" placeholder="Description"></textarea>
    <input type="text" name="tags" placeholder="Tags (comma separated)"/>
    <input type="text" name="link" placeholder="Resource Link" required/>
    <button type="submit" name="addResource">Add Resource</button>
  </form>

  <!-- Resource List -->
  <h2>All Resources</h2>
  <table>
    <tr><th>Title</th><th>Description</th><th>Tags</th><th>Link</th><th>Action</th></tr>
    <?php while($row=$res->fetch_assoc()){ ?>
      <tr>
        <td><?php echo htmlspecialchars($row['title']); ?></td>
        <td><?php echo htmlspecialchars($row['description']); ?></td>
        <td><?php echo htmlspecialchars($row['tags']); ?></td>
        <td><a href="<?php echo $row['link']; ?>" target="_blank">Open</a></td>
        <td><a class="delete" href="?delRes=<?php echo $row['id']; ?>" onclick="return confirm('Delete resource?')">Delete</a></td>
      </tr>
    <?php } ?>
  </table>

  <!-- Add User -->
  <h2>Create User</h2>
  <form method="post">
    <input type="text" name="username" placeholder="Username" required/>
    <input type="password" name="password" placeholder="Password" required/>
    <select name="role" required>
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
    <button type="submit" name="addUser">Add User</button>
  </form>

  <!-- User List -->
  <h2>All Users</h2>
  <table>
    <tr><th>Username</th><th>Role</th><th>Action</th></tr>
    <?php while($u=$users->fetch_assoc()){ ?>
      <tr>
        <td><?php echo htmlspecialchars($u['username']); ?></td>
        <td><?php echo htmlspecialchars($u['role']); ?></td>
        <td>
          <?php if($u['username']!=="admin"){ ?>
            <a class="delete" href="?delUser=<?php echo $u['id']; ?>" onclick="return confirm('Delete user?')">Delete</a>
          <?php } else { echo "Protected"; } ?>
        </td>
      </tr>
    <?php } ?>
  </table>
</body>
</html>