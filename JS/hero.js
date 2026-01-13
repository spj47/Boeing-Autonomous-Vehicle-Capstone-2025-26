/* -- CANVAS SETUP -- */
const canvas = document.getElementById("buggyCanvas");
const ctx = canvas.getContext("2d");

/* -- OBSTACLES -- */
// Fixed obstacles that always show up no matter the random generation
const obstacles = [
  { x: 50, y: 150, w: 100, h: 100 },
  { x: 300, y: 150, w: 100, h: 200 },
  { x: 80, y: 350, w: 150, h: 200 }, 
];

function getHeroObstacle() {
  // Don't draw obstacles for mobile since it is too much
  if (canvas.width < 600)
  {
    return {
      x: 0,
      y: 0,
      w: 0,
      h: 0
    };
  }

  const hero = document.querySelector('.hero-content');
  const rect = hero.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    w: rect.width,
    h: rect.height
  };
}

/* -- BUGGY & MOUSE -- */
const buggy = { x: 100, y: 100 }; // keep float position
const mouse = { x: buggy.x, y: buggy.y };
let buggyAngle = 0;

/* -- GRID -- */
const GRID_SIZE = 10;
let cols, rows;
let grid = [];

/* -- RANDOM OBSTACLES  -- */
function generateRandomObstacles(count = 5) {
  const minSize = 100;
  const maxSize = 150;

  for (let i = 0; i < count; i++) {
    let w = Math.floor((minSize + Math.random() * (maxSize - minSize)) / GRID_SIZE) * GRID_SIZE;
    let h = Math.floor((minSize + Math.random() * (maxSize - minSize)) / GRID_SIZE) * GRID_SIZE;
    let x = Math.floor(Math.random() * (canvas.width - w) / GRID_SIZE) * GRID_SIZE;
    let y = Math.floor(Math.random() * (canvas.height - h) / GRID_SIZE) * GRID_SIZE;

    const fixed = obstacles[0];
    const buffer = 100;

    const overlapsFixed = !(x + w < fixed.x - buffer || x > fixed.x + fixed.w + buffer || y + h < fixed.y - buffer || y > fixed.y + fixed.h + buffer);
    const overlapsBuggy = !(x + w < buggy.x - buffer || x > buggy.x + buffer || y + h < buggy.y - buffer || y > buggy.y + buffer);

    if (!overlapsFixed && !overlapsBuggy) {
      obstacles.push({ x, y, w, h });
    } else {
      i--;
    }
  }
}

/* -- RESIZE -- */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  buildGrid();          
  updatePath();
}

window.addEventListener("resize", resizeCanvas);

/* -- MOUSE TRACKING -- */
let firstClickDone = false;
let lidarTimer = 0;
const initialTime = 5000; // 5 seconds (in ms)
let lastTimestamp = 0;
let lastTargetCell = { x: -1, y: -1 };

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  const tx = Math.floor(mouse.x / GRID_SIZE);
  const ty = Math.floor(mouse.y / GRID_SIZE);

  if (tx !== lastTargetCell.x || ty !== lastTargetCell.y) {
    lastTargetCell = { x: tx, y: ty };
    updatePath();
  }

  // Hide click prompt
  const clickPrompt = document.querySelector(".click-prompt");
  if (clickPrompt) clickPrompt.style.display = "none";

  // Start timer after first click
  if (!firstClickDone) {
    firstClickDone = true;
    lidarTimer = initialTime;
    lastTimestamp = performance.now();
  }
});


/* -- GRID BUILD -- */
function buildGrid() {
  cols = Math.floor(canvas.width / GRID_SIZE);
  rows = Math.floor(canvas.height / GRID_SIZE);

  grid = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({
      x,
      y,
      walkable: true
    }))
  );

  // Add fixed + random obstacles
  obstacles.forEach(o => {
    for (let y = Math.floor(o.y / GRID_SIZE); y < Math.ceil((o.y + o.h) / GRID_SIZE); y++) {
      for (let x = Math.floor(o.x / GRID_SIZE); x < Math.ceil((o.x + o.w) / GRID_SIZE); x++) {
        if (grid[y]?.[x]) grid[y][x].walkable = false;
      }
    }
  });

  // Add hero content as obstacle
  const heroObs = getHeroObstacle();
  for (let y = Math.floor(heroObs.y / GRID_SIZE); y < Math.ceil(heroObs.y / GRID_SIZE + heroObs.h / GRID_SIZE); y++) {
    for (let x = Math.floor(heroObs.x / GRID_SIZE); x < Math.ceil(heroObs.x / GRID_SIZE + heroObs.w / GRID_SIZE); x++) {
      if (grid[y]?.[x]) grid[y][x].walkable = false;
    }
  }
}

/* -- TILE CHECKS -- */
function isObstacle(x, y) { return grid[y]?.[x] && !grid[y][x].walkable; }
function isRoad(x, y) { return grid[y]?.[x] && grid[y][x].walkable; }
function isWalkableNode(x, y) {
  const buffer = 2;
  return grid[y]?.[x] && grid[y][x].walkable && !isNearObstacle(x, y, buffer);
}
function isNearObstacle(x, y, buffer) {
  for (let dy = -buffer; dy <= buffer; dy++) {
    for (let dx = -buffer; dx <= buffer; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (isObstacle(nx, ny)) return true;
    }
  }
  return false;
}
function isNearRoad(x, y, buffer) {
  for (let dy = -buffer; dy <= buffer; dy++) {
    for (let dx = -buffer; dx <= buffer; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (isRoad(nx, ny)) return true;
    }
  }
  return false;
}

// Checks to see if there are any existing decorations in an area
function isOverlappingExistingDecoration(x, y, buffer = 20) {
  // buffer is the minimum distance between decorations
  for (const d of decorationData) {
    const dx = d.x - x;
    const dy = d.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance < buffer + d.size) return true;
  }
  return false;
}


/* -- DRAW Decorations -- */
/* -- DRAW Bench -- */
function drawBench(decorationX, decorationY, opacity) {
  const benchWidth = 20;
  const benchHeight = 5;
  const legWidth = 4;
  const legHeight = 3;
  const seatOffsetY = 30;  // Y position offset for the seat
  const legOffsetY = seatOffsetY + benchHeight;  // Y position offset for the legs

  // Draw the main body of the bench (seat)
  ctx.fillStyle = `rgba(139,69,19,${1 - opacity})`; // Brown for the wood with fading effect
  ctx.fillRect(decorationX - benchWidth / 2, decorationY + seatOffsetY, benchWidth, benchHeight);

  // Draw the back of the bench
  ctx.fillStyle = `rgba(118,58,16,${1 - opacity})`; // Brown for the wood with fading effect
  ctx.fillRect(decorationX - benchWidth / 2, decorationY + seatOffsetY - benchHeight, benchWidth, benchHeight);

  // Draw the legs of the bench
  ctx.fillStyle = `rgba(101,67,33,${1 - opacity})`; // Darker brown for the legs with fading effect
  ctx.fillRect(decorationX - benchWidth / 2 + legWidth * 0.5, decorationY + legOffsetY, legWidth, legHeight); // Left leg
  ctx.fillRect(decorationX + benchWidth / 2 - legWidth * 1.5, decorationY + legOffsetY, legWidth, legHeight); // Right leg
}

/* -- DRAW Lamp Post -- */
function drawLampPost(decorationX, decorationY, opacity) {
  const poleRadius = 5;
  const bulbRadius = 7;
  const lightRadius = 40;

  // Draw the light
  ctx.beginPath();
  ctx.arc(decorationX, decorationY, lightRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(217, 217, 0, ${Math.min(1 - opacity, 0.1)})`; // Light color (semi-transparent yellow)
  ctx.fill();

  // Draw the bulb
  ctx.beginPath();
  ctx.arc(decorationX, decorationY, bulbRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 0, ${1 - opacity})`; // Bulb color with fading effect
  ctx.fill();

  // Draw the pole
  ctx.beginPath();
  ctx.arc(decorationX, decorationY, poleRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(128, 128, 128, ${1 - opacity})`; // Gray for the pole with fading effect
  ctx.fill();
}

/* -- DRAW Fountain -- */
function drawFountain(decorationX, decorationY, opacity) {
  const baseRadius = 25;
  const waterRadius = 21;

  // Draw the fountain base
  ctx.beginPath();
  ctx.arc(decorationX, decorationY, baseRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(162, 162, 162, ${1 - opacity})`; // Light gray for stone with fading effect
  ctx.fill();

  // Draw the water
  ctx.beginPath();
  ctx.arc(decorationX, decorationY, waterRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(26, 116, 206, ${1 - opacity})`; // Blue for water with fading effect
  ctx.fill();

  // Draw the fountain upper
  ctx.beginPath();
  ctx.arc(decorationX, decorationY, baseRadius / 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(192, 192, 192, ${1 - opacity})`; // Light gray for stone with fading effect
  ctx.fill();

  // Draw the upper water
  ctx.beginPath();
  ctx.arc(decorationX, decorationY, waterRadius / 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(30, 144, 255, ${1 - opacity})`; // Blue for water with fading effect
  ctx.fill();
}

/* -- DRAW Tree -- */
function drawTree(decorationX, decorationY, opacity) {
  const canopyRadius = 20;

  // Draw the tree canopy
  ctx.beginPath();
  ctx.arc(decorationX, decorationY - canopyRadius / 2, canopyRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(15, 90, 15, ${1 - opacity})`; // Green for leaves with fading effect
  ctx.fill();
}

/* -- DRAW Bush -- */
function drawBush(decorationX, decorationY, opacity) {
  const bushRadius = 5; // Radius of each bush circle
  const bushPositions = [
    [decorationX, decorationY - bushRadius * 0.8],
    [decorationX + bushRadius * 1.2, decorationY],
    [decorationX - bushRadius * 1.2, decorationY],
    [decorationX, decorationY + bushRadius * 0.8],
  ];

  // Draw each bush circle
  bushPositions.forEach(([bx, by]) => {
    ctx.beginPath();
    ctx.arc(bx, by, bushRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(15, 90, 15, ${1 - opacity})`; // Green color with fading effect
    ctx.fill();
  });
}

/* -- DRAW Rock -- */
function drawRock(decorationX, decorationY, opacity) {
  const rockColor = "#808080"; // Green color for the bush
  const rockRadius = 5; // Radius of each bush circle
  const rockPositions = [
    [decorationX, decorationY - rockRadius * 0.8],
    [decorationX, decorationY],
    [decorationX - rockRadius, decorationY],
  ];

  // Draw each bush circle
  rockPositions.forEach(([bx, by]) => {
    ctx.beginPath();
    ctx.arc(bx, by, rockRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(128, 128, 128, ${1 - opacity})`; // Gray color with fading effect
    ctx.fill();
  });
}

/* -- DRAW Flower -- */
function drawFlower(decorationX, decorationY, opacity) {
  const flowerCenterRadius = 1;
  const petalRaidus = 3;
  const flowerX = decorationX; // X position for the flower
  const flowerY = decorationY; // Y position for the flower

  // Draw Petals
  ctx.beginPath();
  ctx.arc(flowerX, flowerY, petalRaidus, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 99, 71, ${1 - opacity})`; // Red for petals with fading effect
  ctx.fill();

  // Draw the flower center
  ctx.beginPath();
  ctx.arc(flowerX, flowerY, flowerCenterRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 215, 0, ${1 - opacity})`; // Yellow for the center with fading effect
  ctx.fill();
}


/* -- DECORATION FUNCTION -- */
// Create a list of decorations
const decorations = [
  { type: 'bench', draw: drawBench, weight: 15, size: 12 },
  { type: 'lampPost', draw: drawLampPost, weight: 4, size: 12 },
  { type: 'fountain', draw: drawFountain, weight: 2, size: 30 },
  { type: 'tree', draw: drawTree, weight: 20, size: 25 },
  { type: 'bush', draw: drawBush, weight: 20, size: 12 },
  { type: 'rock', draw: drawRock, weight: 8, size: 12 },
  { type: 'flower', draw: drawFlower, weight: 50, size: 5 },
];

/* -- RANDOM DECORATIONS GENERATION -- */
function getWeightedRandomDecoration() {
  const totalWeight = decorations.reduce((sum, d) => sum + d.weight, 0);
  let random = Math.random() * totalWeight;

  for (const d of decorations) {
    if (random < d.weight) return d;
    random -= d.weight;
  }
}

function getRandomNonWalkableCell() {
  const nonWalkableCells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (isObstacle(x, y) && !isNearRoad(x, y, 3)) {  // Only non-walkable cells
        nonWalkableCells.push(grid[y][x]);
      }
    }
  }

  if (nonWalkableCells.length > 0) {
    const chosenCell = nonWalkableCells[Math.floor(Math.random() * nonWalkableCells.length)];
    
    return chosenCell;
  } else {
    return null;
  }
}

const decorationData = [];
function generateRandomDecorations(count = 10) {
  for (let i = 0; i < count; i++) {
    // Get a random non-walkable (obstacle) cell
    let randomCell = getRandomNonWalkableCell();

    if (!randomCell) continue; // If no obstacle cell is available, skip

    // Randomly pick a decoration from the list
    const randomDecoration = getWeightedRandomDecoration();

    // Use the random cell's x and y as the position for the decoration
    const decorationX = randomCell.x * GRID_SIZE / 2;
    const decorationY = randomCell.y * GRID_SIZE / 2;

    // Skip decorations that overlap others
    if (isOverlappingExistingDecoration(decorationX, decorationY, randomDecoration.size)) {
      continue;
    }

    // Save the decoration data
    decorationData.push({
      type: randomDecoration.type,
      size: randomDecoration.size,
      x: decorationX,
      y: decorationY,
      draw: randomDecoration.draw, // Function to draw this decoration
    });
  }
}


function drawDecorations() {
  decorationData.forEach((decoration) => {
    ctx.save();
    ctx.translate(decoration.x, decoration.y);
    decoration.draw(decoration.x, decoration.y, lidarOpacity); // Pass lidarOpacity to control the fade
    ctx.restore();
  });
}


/* -- DRAW OBSTACLES -- */
let isLidarMode = false;

function drawObstacles() {
  lidarAngleOffset += lidarRotationSpeed;
  
  // Draw the normal grid first
  if (lidarOpacity < 1) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!isObstacle(x, y)) continue;

        const px = x * GRID_SIZE;
        const py = y * GRID_SIZE;

        const up    = isRoad(x, y - 1);
        const down  = isRoad(x, y + 1);
        const left  = isRoad(x - 1, y);
        const right = isRoad(x + 1, y);
        const hasRoadNeighbor = up || down || left || right;

        // Draw in grass
        ctx.fillStyle = `rgba(47,125,50,${1 - lidarOpacity})`;
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);

        // Curbs
        const curb = 6;
        ctx.fillStyle = `rgba(136,136,136,${1 - lidarOpacity})`;
        if (up)    ctx.fillRect(px, py, GRID_SIZE, curb);
        if (down)  ctx.fillRect(px, py + GRID_SIZE - curb, GRID_SIZE, curb);
        if (left)  ctx.fillRect(px, py, curb, GRID_SIZE);
        if (right) ctx.fillRect(px + GRID_SIZE - curb, py, curb, GRID_SIZE);

        if (!hasRoadNeighbor) {
          ctx.fillStyle = `rgba(37,102,40,${1 - lidarOpacity})`;
          ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);
        }
      }
    }
  }

  // Draw LIDAR overlay with fading in
  if (lidarOpacity > 0) 
  {
    const curb = 1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!isObstacle(x, y)) continue;

        const px = x * GRID_SIZE;
        const py = y * GRID_SIZE;

        const up    = isRoad(x, y - 1);
        const down  = isRoad(x, y + 1);
        const left  = isRoad(x - 1, y);
        const right = isRoad(x + 1, y);
        const hasRoadNeighbor = up || down || left || right;

        ctx.fillStyle = `rgba(0,255,0,${lidarOpacity * 0.08})`;
        if (up)    ctx.fillRect(px, py, GRID_SIZE, curb);
        if (down)  ctx.fillRect(px, py + GRID_SIZE - curb, GRID_SIZE, curb);
        if (left)  ctx.fillRect(px, py, curb, GRID_SIZE);
        if (right) ctx.fillRect(px + GRID_SIZE - curb, py, curb, GRID_SIZE);
      }
    }

    drawLidarWithOpacity(lidarOpacity);
  }
}

function drawLidarWithOpacity(opacity) {
  const prevGlobalAlpha = ctx.globalAlpha;
  ctx.globalAlpha = opacity;
  drawLidar(); // your existing LIDAR drawing
  ctx.globalAlpha = prevGlobalAlpha;
}


/* -- LIDAR FUNCTIONS -- */
let lidarAngleOffset = 0;
const lidarRotationSpeed = 0.3; // radians per frame
const maxDistance = 200; // unified

const lidarMap = new Map(); // key = "x,y", value = opacity

function drawLidar() {
  const raysPerFrame = 1;
  const currentLidarAngle = lidarAngleOffset + buggyAngle;

  for (let i = 0; i < raysPerFrame; i++) {
    const angle = currentLidarAngle + (i / raysPerFrame) * Math.PI * 2;
    let distance = 0;
    let hitX = buggy.x + Math.cos(angle) * maxDistance;
    let hitY = buggy.y + Math.sin(angle) * maxDistance;

    while (distance < maxDistance) {
      const x = buggy.x + Math.cos(angle) * distance;
      const y = buggy.y + Math.sin(angle) * distance;
      const gx = Math.floor(x / GRID_SIZE);
      const gy = Math.floor(y / GRID_SIZE);

      if (!grid[gy]?.[gx] || !grid[gy][gx].walkable) {
        hitX = x;
        hitY = y;

        const key = gx + "," + gy;
        const opacity = 1 - distance / maxDistance;
        lidarMap.set(key, Math.max(lidarMap.get(key) ?? 0, opacity));
        break;
      }

      distance += 6;
    }

    ctx.strokeStyle = "rgba(0,255,0,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(buggy.x, buggy.y);
    ctx.lineTo(hitX, hitY);
    ctx.stroke();
  }

  // Fade existing points
  for (const [key, value] of lidarMap.entries()) {
    const [gx, gy] = key.split(",").map(Number);
    ctx.fillStyle = `rgba(0,255,0,${value})`;
    ctx.fillRect(gx * GRID_SIZE + GRID_SIZE / 4, gy * GRID_SIZE + GRID_SIZE / 4, GRID_SIZE / 2, GRID_SIZE / 2);

    const newOpacity = value - 0.003;
    if (newOpacity <= 0) lidarMap.delete(key);
    else lidarMap.set(key, newOpacity);
  }
}

/* -- A* PATHFINDING -- */
function heuristic(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function getNeighbors(node) {
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],  // Cardinal directions
    [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonal directions
  ];

  // Filter neighbors that are walkable and not near an obstacle
  return dirs
    .map(d => grid[node.y + d[1]]?.[node.x + d[0]])  // Get neighboring node
    .filter(n => n && isWalkableNode(n.x, n.y));   // Check if node is walkable and not near obstacle
}

function findClosestRoad(obstacle) {
  let closestRoad = null;
  let closestDist = Infinity;

  // Loop through all nodes on the grid to find the nearest road
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (isRoad(x, y)) {
        const dist = heuristic({ x, y }, obstacle); // Calculate distance to the road
        if (dist < closestDist) {
          closestDist = dist;
          closestRoad = { x, y }; // Store the closest road coordinates
        }
      }
    }
  }
  return closestRoad;
}


function aStar(start, end) {
  const startKey = `${start.x},${start.y}`;
  const endKey = `${end.x},${end.y}`;

  const open = [start];
  const cameFrom = {};
  const g = { [startKey]: 0 };
  const f = { [startKey]: heuristic(start, end) };

  let closestNode = null;
  let closestNodeDist = Infinity;

  while (open.length) {
    // Sort open list by lowest f-score
    open.sort((a, b) => f[`${a.x},${a.y}`] - f[`${b.x},${b.y}`]);
    const current = open.shift();
    const currentKey = `${current.x},${current.y}`;

    // If we have reached the destination
    if (currentKey === endKey) {
      const path = [];
      let cKey = currentKey;
      while (cKey) {
        const [x, y] = cKey.split(",").map(Number);
        path.push(grid[y][x]);
        cKey = cameFrom[cKey];
      }
      return path.reverse();
    }

    // Update closest node if we are further from the destination
    const currentDist = heuristic(current, end);
    if (currentDist < closestNodeDist) {
      closestNode = current;
      closestNodeDist = currentDist;
    }

    // Explore neighbors
    for (const n of getNeighbors(current)) {
      const nKey = `${n.x},${n.y}`;
      const tentative = g[currentKey] + 1;

      if (tentative < (g[nKey] ?? Infinity)) {
        cameFrom[nKey] = currentKey;
        g[nKey] = tentative;
        f[nKey] = tentative + heuristic(n, end);

        if (!open.includes(n)) open.push(n);
      }
    }
  }

  // If no path is found, return the closest node to the end goal
  if (closestNode) {
    const path = [];
    let cKey = `${closestNode.x},${closestNode.y}`;
    while (cKey) {
      const [x, y] = cKey.split(",").map(Number);
      path.push(grid[y][x]);
      cKey = cameFrom[cKey];
    }
    return path.reverse();
  }

  // If all else fails, return an empty path (no valid node found)
  return [];
}

/* -- PATH STATE -- */
let path = [];
let debugvisted = [];
let pathIndex = 0;

/* -- UPDATE PATH -- */
function updatePath() {
  if (!grid.length) return;

  const sx = Math.floor(buggy.x / GRID_SIZE);
  const sy = Math.floor(buggy.y / GRID_SIZE);
  const ex = Math.floor(mouse.x / GRID_SIZE);
  const ey = Math.floor(mouse.y / GRID_SIZE);

  const start = grid[sy]?.[sx];
  const end = grid[ey]?.[ex];

  if (!start || !end) return;

  const lastEndKey = path[path.length - 1]?.x + "," + path[path.length - 1]?.y;
  const newEndKey = ex + "," + ey;
  if (lastEndKey === newEndKey) return;

  const newPath = aStar(start, end);
  if (newPath.length) {
    path = newPath;
    pathIndex = 0;
  }
}

/* -- DRAW PATH -- */
function drawPath() {
  if (!path.length || pathIndex >= path.length) return;

  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = pathIndex; i < path.length; i++) {
    const p = path[i];
    const x = p.x * GRID_SIZE + GRID_SIZE / 2;
    const y = p.y * GRID_SIZE + GRID_SIZE / 2;
    i === pathIndex ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }

  ctx.stroke();
}

/* -- BUGGY MOVEMENT -- */
function moveBuggy() {
  if (!path.length || pathIndex >= path.length) return;

  const target = path[pathIndex];
  const tx = target.x * GRID_SIZE + GRID_SIZE / 2;
  const ty = target.y * GRID_SIZE + GRID_SIZE / 2;

  const dx = tx - buggy.x;
  const dy = ty - buggy.y;
  const dist = Math.hypot(dx, dy);

  const speed = 2;

  if (dist < speed) {
    buggy.x = tx;
    buggy.y = ty;
    pathIndex++;
  } else {
    buggy.x += (dx / dist) * speed;
    buggy.y += (dy / dist) * speed;
  }

  if (dist > 0.1) {
  const targetAngle = Math.atan2(dy, dx);
  
  // Calculate the difference in angles
  let angleDiff = targetAngle - buggyAngle;

  // Normalize the angle difference to be within the range -π to +π
  if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  
  // Apply a smooth rotation
  const rotationSpeed = 0.1;
  buggyAngle += angleDiff * rotationSpeed;
}
}

/* -- DRAW BUGGY AS MINI CAR -- */
function drawBuggy() {
  ctx.save();
  ctx.translate(buggy.x, buggy.y);
  ctx.rotate(buggyAngle);  // Use buggyAngle to rotate the car and LIDAR

  // Draw the wheels
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-15, -12, 5, 0, Math.PI * 2);
  ctx.arc(15, -12, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-15, 12, 5, 0, Math.PI * 2);
  ctx.arc(15, 12, 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw the body of the buggy
  ctx.fillStyle = "#0033a0";
  ctx.fillRect(-20, -10, 40, 20);

  // Draw the window
  ctx.fillStyle = "#0046dcff";
  ctx.fillRect(10, -8, 8, 15);

  // Black circle at the center of the buggy (LIDAR base)
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  // Blue semi-circle that spins around the center
  ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
  ctx.beginPath();
  const currentLidarAngle = lidarAngleOffset;
  ctx.arc(0, 0, 5, -Math.PI / 2 + currentLidarAngle, Math.PI / 2 + currentLidarAngle);  // Semi-circle arc
  ctx.fill();

  ctx.restore();
}

/* -- FADE CONTROL -- */
let lidarOpacity = 0; // 0 = normal grid fully visible, 1 = LIDAR fully visible
const fadeSpeed = 0.02; // Adjust for faster/slower fade
let lidarTarget = 0; // 0 = normal, 1 = LIDAR

document.getElementById("toggleGrid")?.addEventListener("click", () => {
  lidarTarget = lidarTarget === 0 ? 1 : 0;

  if (firstClickDone) {
    lidarTimer = initialTime * 3;
    lastTimestamp = performance.now();
  }
});


/* -- ANIMATION LOOP -- */
function animate(timestamp) {
  const deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Countdown LIDAR timer if first click is done
  if (firstClickDone && lidarTimer > 0) {
    lidarTimer -= deltaTime;
    if (lidarTimer <= 0) {
      lidarTimer = 0;
      // Auto-toggle LIDAR
      lidarTarget = lidarTarget === 0 ? 1 : 0;
      // Reset timer to initialTime for next auto-toggle
      lidarTimer = initialTime;
    }
  }

  // Fade lidarOpacity toward target
  if (lidarOpacity < lidarTarget) {
    lidarOpacity = Math.min(lidarOpacity + fadeSpeed, lidarTarget);
  } else if (lidarOpacity > lidarTarget) {
    lidarOpacity = Math.max(lidarOpacity - fadeSpeed, lidarTarget);
  }

  isLidarMode = lidarOpacity > 0.5;

  // Drawing
  ctx.fillStyle = isLidarMode ? "#111111" : "#3c3c3c"; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the path, move the buggy, and render the buggy
  drawPath();
  moveBuggy();
  drawBuggy();
  
  // Draw obstacles and decorations
  drawObstacles();

  if (!isLidarMode) { drawDecorations(); }

  requestAnimationFrame(animate);
}

/* -- INIT -- */
function initializeCanvas() {
  let obstacleCount = 0;
  if (canvas.width > 700) { obstacleCount = 10; }
  else if (canvas.width > 1400) { obstacleCount = 20; }
  generateRandomObstacles(obstacleCount);  // Generate obstacles 
  resizeCanvas();
  generateRandomDecorations(500); // Generate random decorations
  lastTimestamp = performance.now(); // initialize timestamp
  requestAnimationFrame(animate);
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
initializeCanvas(); 
