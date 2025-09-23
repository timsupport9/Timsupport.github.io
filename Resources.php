<?php
session_start();
if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit;
}

$conn = new mysqli("localhost","root","","resourcehub");
$res = $conn->query("SELECT * FROM resources ORDER BY id DESC");

// Fetch resources into PHP array for JSON
$resources = [];
while($row = $res->fetch_assoc()){
    $resources[] = [
        "title" => $row['title'],
        "desc" => $row['description'],
        "tags" => array_map('trim', explode(",", $row['tags'])),
        "link" => $row['link']
    ];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Resources — Hub</title>
  <style>
    body {font-family: 'Segoe UI', sans-serif; margin:0; background:#f4f6f9; color:#333;}
    header {display:flex;justify-content:space-between;align-items:center;padding:15px 25px;background:#0b5ed7;color:white;}
    .logo{font-size:1.3rem;font-weight:bold;}
    a.logout {color:#ffe082;text-decoration:none;margin-left:15px;}
    .hero{text-align:center;padding:50px 20px;background:#0b5ed7;color:white;}
    .hero h1{font-size:2rem;margin-bottom:10px;}
    .search-bar{text-align:center;margin:20px auto;}
    .search-bar input{padding:12px;width:80%;max-width:450px;border:1px solid #ccc;border-radius:25px;}
    .filters{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:20px 0;}
    .filter-btn{padding:8px 16px;border-radius:20px;border:1px solid #ccc;background:white;cursor:pointer;transition:.3s;font-size:.9rem;}
    .filter-btn.active,.filter-btn:hover{background:#0b5ed7;color:white;border-color:#0b5ed7;}
    .resources-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;padding:30px;}
    .resource-card{background:white;padding:20px;border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,0.1);transition:.3s;}
    .resource-card:hover{transform:translateY(-5px);box-shadow:0 8px 16px rgba(0,0,0,0.2);}
    .resource-card h3{margin:0 0 10px;color:#0b5ed7;}
    .tags{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;}
    .tag{font-size:.85rem;background:#e5e7eb;padding:4px 10px;border-radius:12px;text-decoration:none;color:#0b5ed7;transition:.3s;}
    .tag:hover{background:#0b5ed7;color:white;}
    footer{background:#0b5ed7;color:white;text-align:center;padding:15px;margin-top:30px;}
  </style>
</head>
<body>
<header>
  <div class="logo">📚 Resource Hub</div>
  <div>
    Welcome, <?php echo $_SESSION['user']; ?> 
    <a href="logout.php" class="logout">Logout</a>
  </div>
</header>

<section class="hero">
  <h1>Find Resources that Empower You</h1>
  <p>Browse, filter, and access academic papers, teaching aids, and personal growth resources.</p>
</section>

<section>
  <div class="search-bar">
    <input type="text" id="searchInput" placeholder="🔍 Search resources..." onkeyup="searchResources()">
  </div>
  <div class="filters" id="filters"></div>
  <div class="resources-grid" id="resourcesGrid"></div>
</section>

<footer><p>&copy; 2025 Learning Resource Hub. All Rights Reserved.</p></footer>

<script>
// PHP data → JS
const resources = <?php echo json_encode($resources); ?>;

const filters = document.getElementById('filters');
const resourcesGrid = document.getElementById('resourcesGrid');
let activeTag = "All";

// Render Filters
function renderFilters(){
  let allTags = [...new Set(resources.flatMap(r=>r.tags))].filter(t=>t);
  filters.innerHTML = `<button class="filter-btn ${activeTag==="All"?"active":""}" onclick="filterTag('All')">All</button>` +
    allTags.map(tag=>`<button class="filter-btn ${activeTag===tag?"active":""}" onclick="filterTag('${tag}')">${tag}</button>`).join('');
}

// Render Resources
function renderResources(){
  resourcesGrid.innerHTML = "";
  const filtered = resources.filter(r=>activeTag==="All" || r.tags.includes(activeTag));
  
  filtered.forEach(res=>{
    const div = document.createElement('div');
    div.className="resource-card";
    div.innerHTML=`
      <h3>${res.title}</h3>
      <p>${res.desc}</p>
      <div class="tags">
        ${res.tags.map(t=>`<span class="tag">${t}</span>`).join('')}
        <a href="${res.link}" target="_blank" class="tag">Open</a>
      </div>
    `;
    resourcesGrid.appendChild(div);
  });
}

// Filter Tag
function filterTag(tag){ activeTag=tag; renderFilters(); renderResources(); }

// Search Function
function searchResources(){
  const q=document.getElementById("searchInput").value.toLowerCase();
  [...resourcesGrid.children].forEach(card=>{
    const text=card.innerText.toLowerCase();
    card.style.display=text.includes(q)?"block":"none";
  });
}

// Init
renderFilters(); renderResources();
</script>
</body>
</html>