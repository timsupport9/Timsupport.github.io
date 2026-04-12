<?php
// admin_dashboard.php (Enhanced version)
require_once 'db_config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] != 'admin') {
    header("Location: login.php");
    exit();
}

// --- Handle all POST actions (create expert, delete expert, create task, delete task, update task, etc.) ---
// (All existing handlers remain, plus new ones for attachments, comments, etc.)

// Handle Create Expert (unchanged)
if (isset($_POST['create_expert'])) {
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $confirm = $_POST['confirm_password'];
    if ($password === $confirm && !empty($username)) {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'expert')");
        $stmt->bind_param("sss", $username, $email, $hashed);
        if ($stmt->execute()) $_SESSION['message'] = "Expert created!";
        else $_SESSION['message'] = "Error: " . $conn->error;
        $stmt->close();
    } else $_SESSION['message'] = "Passwords do not match!";
    header("Location: admin_dashboard.php");
    exit();
}

// Handle Delete Expert (unchanged)
if (isset($_POST['delete_expert'])) {
    $expert_id = $_POST['expert_id'];
    $check = $conn->prepare("SELECT COUNT(*) FROM tasks WHERE assigned_to = ?");
    $check->bind_param("i", $expert_id);
    $check->execute();
    $check->bind_result($count);
    $check->fetch();
    $check->close();
    if ($count == 0) {
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND role='expert'");
        $stmt->bind_param("i", $expert_id);
        if ($stmt->execute()) $_SESSION['message'] = "Expert deleted.";
        else $_SESSION['message'] = "Error deleting expert.";
        $stmt->close();
    } else $_SESSION['message'] = "Cannot delete: expert has tasks.";
    header("Location: admin_dashboard.php");
    exit();
}

// Handle Create Task (with deadline, priority, category)
if (isset($_POST['create_task'])) {
    $title = trim($_POST['title']);
    $desc = trim($_POST['description']);
    $assigned_to = $_POST['assigned_to'];
    $status = $_POST['status'];
    $deadline = !empty($_POST['deadline']) ? $_POST['deadline'] : null;
    $priority = $_POST['priority'];
    $category_id = !empty($_POST['category_id']) ? $_POST['category_id'] : null;
    
    $stmt = $conn->prepare("INSERT INTO tasks (title, description, assigned_to, status, deadline, priority, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssisssi", $title, $desc, $assigned_to, $status, $deadline, $priority, $category_id);
    if ($stmt->execute()) {
        $task_id = $stmt->insert_id;
        // Create notification for expert
        $notif_msg = "New task assigned: $title";
        $notif_stmt = $conn->prepare("INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'task_assigned', 'New Task', ?)");
        $notif_stmt->bind_param("is", $assigned_to, $notif_msg);
        $notif_stmt->execute();
        // Log activity
        $log_stmt = $conn->prepare("INSERT INTO activity_logs (user_id, action, ip_address) VALUES (?, ?, ?)");
        $admin_id = $_SESSION['user_id'];
        $ip = $_SERVER['REMOTE_ADDR'];
        $log_stmt->bind_param("iss", $admin_id, "Created task ID $task_id", $ip);
        $log_stmt->execute();
        $_SESSION['message'] = "Task created!";
    } else $_SESSION['message'] = "Error: " . $conn->error;
    $stmt->close();
    header("Location: admin_dashboard.php");
    exit();
}

// Handle Delete Task
if (isset($_POST['delete_task'])) {
    $task_id = $_POST['task_id'];
    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->bind_param("i", $task_id);
    if ($stmt->execute()) $_SESSION['message'] = "Task deleted.";
    else $_SESSION['message'] = "Error deleting task.";
    $stmt->close();
    header("Location: admin_dashboard.php");
    exit();
}

// Handle Update Task (includes deadline, priority, category)
if (isset($_POST['update_task'])) {
    $task_id = $_POST['task_id'];
    $title = trim($_POST['title']);
    $desc = trim($_POST['description']);
    $assigned_to = $_POST['assigned_to'];
    $status = $_POST['status'];
    $deadline = !empty($_POST['deadline']) ? $_POST['deadline'] : null;
    $priority = $_POST['priority'];
    $category_id = !empty($_POST['category_id']) ? $_POST['category_id'] : null;
    
    $stmt = $conn->prepare("UPDATE tasks SET title=?, description=?, assigned_to=?, status=?, deadline=?, priority=?, category_id=? WHERE id=?");
    $stmt->bind_param("ssisssii", $title, $desc, $assigned_to, $status, $deadline, $priority, $category_id, $task_id);
    if ($stmt->execute()) $_SESSION['message'] = "Task updated.";
    else $_SESSION['message'] = "Error updating task.";
    $stmt->close();
    header("Location: admin_dashboard.php");
    exit();
}

// Handle Add Comment
if (isset($_POST['add_comment'])) {
    $task_id = $_POST['task_id'];
    $comment = trim($_POST['comment']);
    $user_id = $_SESSION['user_id'];
    if (!empty($comment)) {
        $stmt = $conn->prepare("INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)");
        $stmt->bind_param("iis", $task_id, $user_id, $comment);
        $stmt->execute();
        $stmt->close();
        $_SESSION['message'] = "Comment added.";
    }
    header("Location: admin_dashboard.php");
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
            $stmt->bind_param("issi", $task_id, $file['name'], $filepath, $_SESSION['user_id']);
            $stmt->execute();
            $stmt->close();
            $_SESSION['message'] = "File uploaded.";
        } else $_SESSION['message'] = "Upload failed.";
    } else $_SESSION['message'] = "File error.";
    header("Location: admin_dashboard.php");
    exit();
}

// --- Data fetching for dashboard ---
$experts = [];
$exp_res = $conn->query("SELECT id, username FROM users WHERE role='expert' ORDER BY username");
while($row = $exp_res->fetch_assoc()) $experts[] = $row;

// Fetch tasks with joins
$tasks_query = "SELECT t.*, u.username as expert_name, c.name as category_name, c.color as category_color 
                FROM tasks t 
                LEFT JOIN users u ON t.assigned_to = u.id 
                LEFT JOIN categories c ON t.category_id = c.id 
                ORDER BY t.created_at DESC";
$tasks_result = $conn->query($tasks_query);

// Fetch categories for dropdown
$categories = $conn->query("SELECT * FROM categories ORDER BY name");

// Workload view: count non-completed tasks per expert
$workload = $conn->query("SELECT u.id, u.username, 
                          COUNT(CASE WHEN t.status != 'completed' THEN 1 END) as active_tasks,
                          COUNT(*) as total_tasks
                          FROM users u LEFT JOIN tasks t ON u.id = t.assigned_to
                          WHERE u.role='expert' GROUP BY u.id");

// Charts data: tasks by status and by priority
$status_stats = $conn->query("SELECT status, COUNT(*) as count FROM tasks GROUP BY status");
$priority_stats = $conn->query("SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority");

// Search/filter parameters
$search_title = $_GET['search_title'] ?? '';
$filter_status = $_GET['filter_status'] ?? '';
$filter_priority = $_GET['filter_priority'] ?? '';
$filter_expert = $_GET['filter_expert'] ?? '';
$tasks_filtered = $conn->prepare("SELECT t.*, u.username as expert_name, c.name as category_name 
                                   FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id 
                                   LEFT JOIN categories c ON t.category_id = c.id
                                   WHERE (t.title LIKE ? OR ? = '') 
                                   AND (t.status = ? OR ? = '')
                                   AND (t.priority = ? OR ? = '')
                                   AND (t.assigned_to = ? OR ? = '')
                                   ORDER BY t.created_at DESC");
$like = "%$search_title%";
$tasks_filtered->bind_param("ssssssss", $like, $search_title, $filter_status, $filter_status, $filter_priority, $filter_priority, $filter_expert, $filter_expert);
$tasks_filtered->execute();
$filtered_tasks = $tasks_filtered->get_result();

// Message handling
$message = $_SESSION['message'] ?? '';
$message_type = $_SESSION['message_type'] ?? '';
unset($_SESSION['message'], $_SESSION['message_type']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Dashboard - Advanced Task Management</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .priority-high { border-left: 4px solid #dc3545; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #198754; }
        .task-card { transition: 0.2s; margin-bottom: 15px; }
        .task-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .deadline-overdue { background-color: #f8d7da; }
    </style>
</head>
<body>
<div class="container-fluid">
    <div class="row">
        <!-- Sidebar (same as before) -->
        <div class="col-md-3 col-lg-2 bg-dark text-white min-vh-100">
            <div class="py-4 text-center"><h4><i class="fas fa-tachometer-alt"></i> Admin Panel</h4><p>Welcome, <?= htmlspecialchars($_SESSION['username']) ?></p></div>
            <nav class="nav flex-column">
                <a href="#experts" class="nav-link text-white" data-bs-toggle="collapse"><i class="fas fa-users"></i> Manage Experts</a>
                <a href="#tasks" class="nav-link text-white" data-bs-toggle="collapse"><i class="fas fa-tasks"></i> Tasks & Allocation</a>
                <a href="#analytics" class="nav-link text-white" data-bs-toggle="collapse"><i class="fas fa-chart-line"></i> Analytics</a>
                <a href="logout.php" class="nav-link text-white"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </nav>
        </div>
        
        <!-- Main content -->
        <div class="col-md-9 col-lg-10 p-4">
            <h2 class="mb-4">Admin Dashboard <small class="text-muted">(with Deadlines, Priorities, Comments, Files)</small></h2>
            <?php if ($message): ?><div class="alert alert-<?= $message_type ?: 'info' ?> alert-dismissible"><?= htmlspecialchars($message) ?><button type="button" class="btn-close" data-bs-dismiss="alert"></button></div><?php endif; ?>
            
            <!-- Stats Cards (same as before, can add more) -->
            <div class="row mb-4">
                <div class="col-md-3"><div class="card text-white bg-primary"><div class="card-body"><h5>Total Experts</h5><h2><?= $conn->query("SELECT COUNT(*) FROM users WHERE role='expert'")->fetch_row()[0] ?></h2></div></div></div>
                <div class="col-md-3"><div class="card text-white bg-success"><div class="card-body"><h5>Total Tasks</h5><h2><?= $conn->query("SELECT COUNT(*) FROM tasks")->fetch_row()[0] ?></h2></div></div></div>
                <div class="col-md-3"><div class="card text-white bg-warning"><div class="card-body"><h5>Pending</h5><h2><?= $conn->query("SELECT COUNT(*) FROM tasks WHERE status='pending'")->fetch_row()[0] ?></h2></div></div></div>
                <div class="col-md-3"><div class="card text-white bg-danger"><div class="card-body"><h5>Overdue Tasks</h5><h2><?= $conn->query("SELECT COUNT(*) FROM tasks WHERE deadline < CURDATE() AND status != 'completed'")->fetch_row()[0] ?></h2></div></div></div>
            </div>
            
            <!-- ==================== MANAGE EXPERTS SECTION ==================== -->
            <div class="collapse show" id="experts">
                <div class="card mb-4"><div class="card-header">Create New Expert</div><div class="card-body">
                    <form method="POST"><div class="row"><div class="col-md-4"><input type="text" name="username" class="form-control" placeholder="Username" required></div>
                    <div class="col-md-4"><input type="email" name="email" class="form-control" placeholder="Email"></div>
                    <div class="col-md-4"><input type="password" name="password" class="form-control" placeholder="Password" required></div>
                    <div class="col-md-4 mt-2"><input type="password" name="confirm_password" class="form-control" placeholder="Confirm Password" required></div>
                    <div class="col-md-4 mt-2"><button type="submit" name="create_expert" class="btn btn-primary">Create Expert</button></div></div></form>
                </div></div>
                <div class="card mb-4"><div class="card-header">Existing Experts & Workload</div><div class="card-body">
                    <table class="table"><thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Active Tasks</th><th>Total Tasks</th><th>Actions</th></tr></thead>
                    <tbody><?php while($exp = $workload->fetch_assoc()): ?><tr><td><?= $exp['id'] ?></td><td><?= htmlspecialchars($exp['username']) ?></td><td><?= $exp['email'] ?? '-' ?></td>
                    <td><span class="badge bg-warning"><?= $exp['active_tasks'] ?></span></td><td><?= $exp['total_tasks'] ?></td>
                    <td><form method="POST" style="display:inline" onsubmit="return confirm('Delete expert?');"><input type="hidden" name="expert_id" value="<?= $exp['id'] ?>"><button name="delete_expert" class="btn btn-danger btn-sm">Delete</button></form></td></tr><?php endwhile; ?></tbody></table>
                </div></div>
            </div>
            
            <!-- ==================== TASK MANAGEMENT SECTION ==================== -->
            <div class="collapse show" id="tasks">
                <!-- Create Task Form with advanced fields -->
                <div class="card mb-4"><div class="card-header bg-white"><h5><i class="fas fa-plus-circle"></i> Allocate New Task</h5></div>
                <div class="card-body">
                    <form method="POST">
                        <div class="row">
                            <div class="col-md-6 mb-3"><label>Task Title *</label><input type="text" name="title" class="form-control" required></div>
                            <div class="col-md-6 mb-3"><label>Assign To *</label><select name="assigned_to" class="form-control" required><?php foreach($experts as $e): ?><option value="<?= $e['id'] ?>"><?= htmlspecialchars($e['username']) ?></option><?php endforeach; ?></select></div>
                            <div class="col-md-12 mb-3"><label>Description</label><textarea name="description" class="form-control" rows="2"></textarea></div>
                            <div class="col-md-3 mb-3"><label>Deadline</label><input type="date" name="deadline" class="form-control"></div>
                            <div class="col-md-3 mb-3"><label>Priority</label><select name="priority" class="form-control"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
                            <div class="col-md-3 mb-3"><label>Category</label><select name="category_id" class="form-control"><option value="">None</option><?php while($cat = $categories->fetch_assoc()): ?><option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option><?php endwhile; ?></select></div>
                            <div class="col-md-3 mb-3"><label>Status</label><select name="status" class="form-control"><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
                            <div class="col-12"><button type="submit" name="create_task" class="btn btn-success">Create Task</button></div>
                        </div>
                    </form>
                </div></div>
                
                <!-- Search and Filter Bar -->
                <div class="card mb-4"><div class="card-header">Search & Filter Tasks</div><div class="card-body">
                    <form method="GET" class="row g-2">
                        <div class="col-md-3"><input type="text" name="search_title" class="form-control" placeholder="Task title" value="<?= htmlspecialchars($search_title) ?>"></div>
                        <div class="col-md-2"><select name="filter_status" class="form-control"><option value="">All Status</option><option value="pending" <?= $filter_status=='pending'?'selected':'' ?>>Pending</option><option value="in_progress" <?= $filter_status=='in_progress'?'selected':'' ?>>In Progress</option><option value="completed" <?= $filter_status=='completed'?'selected':'' ?>>Completed</option></select></div>
                        <div class="col-md-2"><select name="filter_priority" class="form-control"><option value="">All Priorities</option><option value="low" <?= $filter_priority=='low'?'selected':'' ?>>Low</option><option value="medium" <?= $filter_priority=='medium'?'selected':'' ?>>Medium</option><option value="high" <?= $filter_priority=='high'?'selected':'' ?>>High</option></select></div>
                        <div class="col-md-3"><select name="filter_expert" class="form-control"><option value="">All Experts</option><?php foreach($experts as $e): ?><option value="<?= $e['id'] ?>" <?= $filter_expert==$e['id']?'selected':'' ?>><?= htmlspecialchars($e['username']) ?></option><?php endforeach; ?></select></div>
                        <div class="col-md-2"><button type="submit" class="btn btn-primary w-100">Filter</button></div>
                    </form>
                </div></div>
                
                <!-- List of Tasks with Comments, Attachments, Edit/Delete -->
                <div class="card"><div class="card-header">All Tasks</div><div class="card-body">
                    <?php while($task = $filtered_tasks->fetch_assoc()): 
                        $is_overdue = ($task['deadline'] && $task['deadline'] < date('Y-m-d') && $task['status'] != 'completed');
                        $priority_class = $task['priority'] == 'high' ? 'priority-high' : ($task['priority'] == 'medium' ? 'priority-medium' : 'priority-low');
                    ?>
                    <div class="task-card card p-3 mb-3 <?= $priority_class ?> <?= $is_overdue ? 'deadline-overdue' : '' ?>">
                        <div class="d-flex justify-content-between">
                            <h5><?= htmlspecialchars($task['title']) ?> 
                                <span class="badge bg-<?= $task['status']=='completed'?'success':($task['status']=='in_progress'?'warning':'secondary') ?>"><?= ucfirst($task['status']) ?></span>
                                <span class="badge bg-<?= $task['priority']=='high'?'danger':($task['priority']=='medium'?'warning':'info') ?>"><?= ucfirst($task['priority']) ?></span>
                                <?php if($task['category_name']): ?><span class="badge" style="background-color: <?= $task['category_color'] ?? '#6c757d' ?>"><?= htmlspecialchars($task['category_name']) ?></span><?php endif; ?>
                            </h5>
                            <div>
                                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editTaskModal<?= $task['id'] ?>"><i class="fas fa-edit"></i> Edit</button>
                                <form method="POST" style="display:inline" onsubmit="return confirm('Delete?')"><input type="hidden" name="task_id" value="<?= $task['id'] ?>"><button name="delete_task" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash"></i> Delete</button></form>
                            </div>
                        </div>
                        <p class="mt-2"><?= nl2br(htmlspecialchars($task['description'] ?: 'No description')) ?></p>
                        <div class="small text-muted">
                            <i class="fas fa-user"></i> Assigned to: <?= htmlspecialchars($task['expert_name'] ?? 'Unassigned') ?> |
                            <i class="fas fa-calendar"></i> Deadline: <?= $task['deadline'] ?: 'No deadline' ?> <?= $is_overdue ? '<span class="text-danger">(Overdue!)</span>' : '' ?> |
                            <i class="fas fa-clock"></i> Created: <?= date('Y-m-d', strtotime($task['created_at'])) ?>
                        </div>
                        
                        <!-- Comments Section -->
                        <hr>
                        <strong><i class="fas fa-comments"></i> Comments</strong>
                        <?php
                        $comments = $conn->prepare("SELECT c.*, u.username FROM task_comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at DESC");
                        $comments->bind_param("i", $task['id']);
                        $comments->execute();
                        $comments_res = $comments->get_result();
                        while($comm = $comments_res->fetch_assoc()): ?>
                            <div class="bg-light p-2 rounded mt-1"><strong><?= htmlspecialchars($comm['username']) ?>:</strong> <?= nl2br(htmlspecialchars($comm['comment'])) ?> <small class="text-muted"><?= $comm['created_at'] ?></small></div>
                        <?php endwhile; ?>
                        <form method="POST" class="mt-2"><input type="hidden" name="task_id" value="<?= $task['id'] ?>"><div class="input-group"><input type="text" name="comment" class="form-control" placeholder="Add a comment..."><button type="submit" name="add_comment" class="btn btn-secondary">Post</button></div></form>
                        
                        <!-- Attachments Section -->
                        <hr>
                        <strong><i class="fas fa-paperclip"></i> Attachments</strong>
                        <?php
                        $attachments = $conn->prepare("SELECT * FROM task_attachments WHERE task_id = ?");
                        $attachments->bind_param("i", $task['id']);
                        $attachments->execute();
                        $attach_res = $attachments->get_result();
                        while($att = $attach_res->fetch_assoc()): ?>
                            <div><a href="<?= htmlspecialchars($att['file_path']) ?>" target="_blank"><i class="fas fa-file"></i> <?= htmlspecialchars($att['file_name']) ?></a> <small>(uploaded <?= $att['uploaded_at'] ?>)</small></div>
                        <?php endwhile; ?>
                        <form method="POST" enctype="multipart/form-data" class="mt-2"><input type="hidden" name="task_id" value="<?= $task['id'] ?>"><div class="input-group"><input type="file" name="attachment" class="form-control"><button type="submit" name="upload_attachment" class="btn btn-info">Upload</button></div></form>
                    </div>
                    
                    <!-- Edit Task Modal -->
                    <div class="modal fade" id="editTaskModal<?= $task['id'] ?>" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><h5>Edit Task #<?= $task['id'] ?></h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <form method="POST"><div class="modal-body"><input type="hidden" name="task_id" value="<?= $task['id'] ?>">
                        <div class="mb-2"><label>Title</label><input type="text" name="title" class="form-control" value="<?= htmlspecialchars($task['title']) ?>" required></div>
                        <div class="mb-2"><label>Description</label><textarea name="description" class="form-control" rows="2"><?= htmlspecialchars($task['description']) ?></textarea></div>
                        <div class="row"><div class="col-md-6"><label>Assigned To</label><select name="assigned_to" class="form-control"><?php foreach($experts as $e): ?><option value="<?= $e['id'] ?>" <?= $e['id']==$task['assigned_to']?'selected':'' ?>><?= htmlspecialchars($e['username']) ?></option><?php endforeach; ?></select></div>
                        <div class="col-md-6"><label>Status</label><select name="status" class="form-control"><option <?= $task['status']=='pending'?'selected':'' ?>>pending</option><option <?= $task['status']=='in_progress'?'selected':'' ?>>in_progress</option><option <?= $task['status']=='completed'?'selected':'' ?>>completed</option></select></div></div>
                        <div class="row mt-2"><div class="col-md-6"><label>Deadline</label><input type="date" name="deadline" class="form-control" value="<?= $task['deadline'] ?>"></div>
                        <div class="col-md-6"><label>Priority</label><select name="priority" class="form-control"><option value="low" <?= $task['priority']=='low'?'selected':'' ?>>Low</option><option value="medium" <?= $task['priority']=='medium'?'selected':'' ?>>Medium</option><option value="high" <?= $task['priority']=='high'?'selected':'' ?>>High</option></select></div></div>
                        <div class="mt-2"><label>Category</label><select name="category_id" class="form-control"><option value="">None</option><?php $cats = $conn->query("SELECT * FROM categories"); while($cat=$cats->fetch_assoc()): ?><option value="<?= $cat['id'] ?>" <?= $cat['id']==$task['category_id']?'selected':'' ?>><?= htmlspecialchars($cat['name']) ?></option><?php endwhile; ?></select></div>
                    </div><div class="modal-footer"><button type="submit" name="update_task" class="btn btn-primary">Save Changes</button></div></form></div></div></div>
                    <?php endwhile; ?>
                </div></div>
            </div>
            
            <!-- ==================== ANALYTICS SECTION ==================== -->
            <div class="collapse show" id="analytics">
                <div class="card mt-4"><div class="card-header">Charts & Insights</div><div class="card-body">
                    <div class="row">
                        <div class="col-md-6"><canvas id="statusChart" width="400" height="200"></canvas></div>
                        <div class="col-md-6"><canvas id="priorityChart" width="400" height="200"></canvas></div>
                    </div>
                </div></div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
<script>
    // Chart.js initialization
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    const statusData = <?php 
        $labels = []; $counts = [];
        $status_stats->data_seek(0);
        while($row = $status_stats->fetch_assoc()) { $labels[] = ucfirst($row['status']); $counts[] = $row['count']; }
        echo json_encode(['labels'=>$labels, 'counts'=>$counts]);
    ?>;
    new Chart(statusCtx, { type: 'pie', data: { labels: statusData.labels, datasets: [{ data: statusData.counts, backgroundColor: ['#6c757d','#ffc107','#198754'] }] } });
    
    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    const priorityData = <?php 
        $p_labels = []; $p_counts = [];
        $priority_stats->data_seek(0);
        while($row = $priority_stats->fetch_assoc()) { $p_labels[] = ucfirst($row['priority']); $p_counts[] = $row['count']; }
        echo json_encode(['labels'=>$p_labels, 'counts'=>$p_counts]);
    ?>;
    new Chart(priorityCtx, { type: 'bar', data: { labels: priorityData.labels, datasets: [{ label: 'Number of Tasks', data: priorityData.counts, backgroundColor: '#0d6efd' }] } });
</script>
</body>
</html>