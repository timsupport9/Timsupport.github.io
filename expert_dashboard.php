<?php
// expert_dashboard.php (Enhanced)
require_once 'db_config.php';
if (!isset($_SESSION['user_id']) || $_SESSION['role'] != 'expert') {
    header("Location: login.php");
    exit();
}
$user_id = $_SESSION['user_id'];

// Handle status update (same as before, but now also check deadline/priority)
if (isset($_POST['update_status'])) {
    $task_id = $_POST['task_id'];
    $new_status = $_POST['status'];
    $check = $conn->prepare("SELECT id FROM tasks WHERE id = ? AND assigned_to = ?");
    $check->bind_param("ii", $task_id, $user_id);
    $check->execute();
    if ($check->fetch()) {
        $upd = $conn->prepare("UPDATE tasks SET status = ? WHERE id = ?");
        $upd->bind_param("si", $new_status, $task_id);
        $upd->execute();
        $_SESSION['message'] = "Status updated.";
    } else $_SESSION['message'] = "Unauthorized.";
    header("Location: expert_dashboard.php");
    exit();
}

// Handle Add Comment
if (isset($_POST['add_comment'])) {
    $task_id = $_POST['task_id'];
    $comment = trim($_POST['comment']);
    if ($comment) {
        $stmt = $conn->prepare("INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)");
        $stmt->bind_param("iis", $task_id, $user_id, $comment);
        $stmt->execute();
        $_SESSION['message'] = "Comment added.";
    }
    header("Location: expert_dashboard.php");
    exit();
}

// Handle File Upload
if (isset($_POST['upload_attachment']) && isset($_FILES['attachment'])) {
    $task_id = $_POST['task_id'];
    $file = $_FILES['attachment'];
    if ($file['error'] === UPLOAD_ERR_OK) {
        $upload_dir = 'uploads/';
        if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
        $filename = time() . '_' . basename($file['name']);
        $filepath = $upload_dir . $filename;
        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            $stmt = $conn->prepare("INSERT INTO task_attachments (task_id, file_name, file_path, uploaded_by) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("issi", $task_id, $file['name'], $filepath, $user_id);
            $stmt->execute();
            $_SESSION['message'] = "File uploaded.";
        } else $_SESSION['message'] = "Upload failed.";
    } else $_SESSION['message'] = "File error.";
    header("Location: expert_dashboard.php");
    exit();
}

// Fetch tasks for this expert
$tasks = $conn->prepare("SELECT t.*, c.name as category_name, c.color as category_color 
                         FROM tasks t LEFT JOIN categories c ON t.category_id = c.id 
                         WHERE t.assigned_to = ? ORDER BY FIELD(t.priority, 'high','medium','low'), t.deadline ASC");
$tasks->bind_param("i", $user_id);
$tasks->execute();
$my_tasks = $tasks->get_result();

// Fetch notifications for this expert (unread count)
$notif_count = $conn->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
$notif_count->bind_param("i", $user_id);
$notif_count->execute();
$notif_count->bind_result($unread_count);
$notif_count->fetch();
$notif_count->close();

// Mark all as read (simple, can be improved)
if (isset($_GET['mark_read'])) {
    $conn->query("UPDATE notifications SET is_read = 1 WHERE user_id = $user_id");
    header("Location: expert_dashboard.php");
    exit();
}

$message = $_SESSION['message'] ?? '';
unset($_SESSION['message']);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Expert Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .task-card { border-left: 4px solid; margin-bottom: 20px; background: white; border-radius: 10px; transition: 0.2s; }
        .task-card:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #198754; }
        .deadline-overdue { background-color: #fff0f0; }
        .notification-badge { position: relative; top: -8px; left: -5px; }
    </style>
</head>
<body>
<nav class="navbar navbar-dark bg-dark">
    <div class="container">
        <a class="navbar-brand" href="#"><i class="fas fa-chalkboard-teacher"></i> Expert Dashboard</a>
        <div>
            <a href="?mark_read=1" class="btn btn-outline-light position-relative me-3">
                <i class="fas fa-bell"></i> Notifications
                <?php if($unread_count > 0): ?><span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"><?= $unread_count ?></span><?php endif; ?>
            </a>
            <span class="text-white me-3"><?= htmlspecialchars($_SESSION['username']) ?></span>
            <a href="logout.php" class="btn btn-outline-light btn-sm">Logout</a>
        </div>
    </div>
</nav>
<div class="container mt-4">
    <?php if($message): ?><div class="alert alert-info"><?= htmlspecialchars($message) ?></div><?php endif; ?>
    
    <div class="row">
        <?php while($task = $my_tasks->fetch_assoc()):
            $is_overdue = ($task['deadline'] && $task['deadline'] < date('Y-m-d') && $task['status'] != 'completed');
            $priority_class = $task['priority'] == 'high' ? 'priority-high' : ($task['priority'] == 'medium' ? 'priority-medium' : 'priority-low');
        ?>
        <div class="col-md-6">
            <div class="task-card p-3 <?= $priority_class ?> <?= $is_overdue ? 'deadline-overdue' : '' ?>">
                <div class="d-flex justify-content-between">
                    <h5><?= htmlspecialchars($task['title']) ?>
                        <span class="badge bg-<?= $task['status']=='completed'?'success':($task['status']=='in_progress'?'warning':'secondary') ?>"><?= ucfirst($task['status']) ?></span>
                        <span class="badge bg-<?= $task['priority']=='high'?'danger':'info' ?>"><?= ucfirst($task['priority']) ?></span>
                        <?php if($task['category_name']): ?><span class="badge" style="background:<?= $task['category_color'] ?>"><?= htmlspecialchars($task['category_name']) ?></span><?php endif; ?>
                    </h5>
                </div>
                <p><?= nl2br(htmlspecialchars($task['description'] ?: 'No description')) ?></p>
                <div class="small text-muted">
                    <i class="fas fa-calendar-alt"></i> Deadline: <?= $task['deadline'] ?: 'No deadline' ?>
                    <?= $is_overdue ? '<span class="text-danger"> (Overdue!)</span>' : '' ?>
                    <br><i class="fas fa-clock"></i> Created: <?= date('Y-m-d', strtotime($task['created_at'])) ?>
                </div>
                <hr>
                <strong>Comments</strong>
                <?php
                $comments = $conn->prepare("SELECT c.*, u.username FROM task_comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at DESC");
                $comments->bind_param("i", $task['id']);
                $comments->execute();
                $comm_res = $comments->get_result();
                while($comm = $comm_res->fetch_assoc()): ?>
                    <div class="bg-light p-2 rounded mt-1"><strong><?= htmlspecialchars($comm['username']) ?>:</strong> <?= nl2br(htmlspecialchars($comm['comment'])) ?> <small class="text-muted"><?= $comm['created_at'] ?></small></div>
                <?php endwhile; ?>
                <form method="POST" class="mt-2"><input type="hidden" name="task_id" value="<?= $task['id'] ?>"><div class="input-group"><input type="text" name="comment" class="form-control" placeholder="Add comment..."><button type="submit" name="add_comment" class="btn btn-secondary btn-sm">Post</button></div></form>
                
                <hr>
                <strong>Attachments</strong>
                <?php
                $attach = $conn->prepare("SELECT * FROM task_attachments WHERE task_id = ?");
                $attach->bind_param("i", $task['id']);
                $attach->execute();
                $attach_res = $attach->get_result();
                while($att = $attach_res->fetch_assoc()): ?>
                    <div><a href="<?= htmlspecialchars($att['file_path']) ?>" target="_blank"><i class="fas fa-download"></i> <?= htmlspecialchars($att['file_name']) ?></a></div>
                <?php endwhile; ?>
                <form method="POST" enctype="multipart/form-data" class="mt-2"><input type="hidden" name="task_id" value="<?= $task['id'] ?>"><div class="input-group"><input type="file" name="attachment" class="form-control"><button type="submit" name="upload_attachment" class="btn btn-info btn-sm">Upload</button></div></form>
                
                <form method="POST" class="mt-3"><input type="hidden" name="task_id" value="<?= $task['id'] ?>">
                    <div class="row"><div class="col-8"><select name="status" class="form-select"><option <?= $task['status']=='pending'?'selected':'' ?>>pending</option><option <?= $task['status']=='in_progress'?'selected':'' ?>>in_progress</option><option <?= $task['status']=='completed'?'selected':'' ?>>completed</option></select></div>
                    <div class="col-4"><button type="submit" name="update_status" class="btn btn-primary w-100">Update</button></div></div>
                </form>
            </div>
        </div>
        <?php endwhile; ?>
        <?php if($my_tasks->num_rows == 0): ?>
            <div class="col-12 text-center p-5"><i class="fas fa-inbox fa-3x text-muted"></i><h4>No tasks assigned yet</h4></div>
        <?php endif; ?>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>