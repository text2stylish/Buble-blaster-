document.addEventListener('DOMContentLoaded', () => {
    // Game canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 500;
    canvas.height = 500;
    
    // Game state
    let score = 0;
    let level = 1;
    let gameRunning = true;
    let bubbles = [];
    let shooterBubble = null;
    let nextBubble = null;
    let angle = 90; // Straight up
    let rows = 8;
    let cols = 8;
    let bubbleRadius = 25;
    let bubbleSpeed = 5;
    let grid = [];
    
    // Colors for bubbles
    const bubbleColors = [
        '#6441ff', // Purple
        '#ff66a3', // Pink
        '#4df0ff', // Cyan
        '#ffde59', // Yellow
        '#6aff87', // Green
        '#ff7b54'  // Orange
    ];
    
    // Initialize game
    initGame();
    
    // Event listeners
    document.getElementById('restartBtn').addEventListener('click', initGame);
    document.getElementById('leftBtn').addEventListener('click', () => adjustAngle(-5));
    document.getElementById('rightBtn').addEventListener('click', () => adjustAngle(5));
    document.getElementById('shootBtn').addEventListener('click', shootBubble);
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                adjustAngle(-5);
                break;
            case 'ArrowRight':
                adjustAngle(5);
                break;
            case ' ':
            case 'ArrowUp':
                shootBubble();
                break;
        }
    });
    
    // Mobile touch controls
    let touchStartX = 0;
    let touchStartY = 0;
    let isShooting = false;
    
    document.getElementById('joystickArea').addEventListener('touchstart', handleJoystickStart);
    document.addEventListener('touchmove', handleJoystickMove);
    document.addEventListener('touchend', handleJoystickEnd);
    
    document.getElementById('shootArea').addEventListener('touchstart', () => {
        if (gameRunning) shootBubble();
    });
    
    function handleJoystickStart(e) {
        if (!gameRunning) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
    
    function handleJoystickMove(e) {
        if (!gameRunning || !touchStartX) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // Calculate angle based on touch position relative to start
        const newAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        
        // Only allow angles between 30 and 150 degrees (upwards)
        if (newAngle < -90) angle = 0;
        else if (newAngle > 90) angle = 180;
        else angle = 90 - newAngle;
        
        // Limit angle range
        angle = Math.max(30, Math.min(150, angle));
    }
    
    function handleJoystickEnd() {
        touchStartX = 0;
        touchStartY = 0;
    }
    
    // Game functions
    function initGame() {
        score = 0;
        level = 1;
        gameRunning = true;
        bubbles = [];
        grid = [];
        shooterBubble = null;
        nextBubble = null;
        angle = 90;
        
        updateScore();
        createGrid();
        generateShooterBubble();
        generateNextBubble();
        
        // Start game loop
        requestAnimationFrame(gameLoop);
    }
    
    function createGrid() {
        // Create initial grid of bubbles
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                if (row < 3) { // Only fill top 3 rows initially
                    const offset = row % 2 === 0 ? 0 : bubbleRadius;
                    const x = col * (bubbleRadius * 2) + bubbleRadius + offset;
                    const y = row * (bubbleRadius * 1.8) + bubbleRadius;
                    
                    const colorIndex = Math.floor(Math.random() * bubbleColors.length);
                    const bubble = {
                        x,
                        y,
                        row,
                        col,
                        color: bubbleColors[colorIndex],
                        radius: bubbleRadius
                    };
                    
                    grid[row][col] = bubble;
                    bubbles.push(bubble);
                } else {
                    grid[row][col] = null;
                }
            }
        }
    }
    
    function generateShooterBubble() {
        const colorIndex = Math.floor(Math.random() * bubbleColors.length);
        shooterBubble = {
            x: canvas.width / 2,
            y: canvas.height - bubbleRadius - 10,
            color: bubbleColors[colorIndex],
            radius: bubbleRadius,
            dx: 0,
            dy: 0,
            moving: false
        };
    }
    
    function generateNextBubble() {
        const colorIndex = Math.floor(Math.random() * bubbleColors.length);
        nextBubble = {
            color: bubbleColors[colorIndex],
            radius: bubbleRadius * 0.7
        };
    }
    
    function adjustAngle(change) {
        if (!gameRunning || shooterBubble.moving) return;
        angle += change;
        angle = Math.max(30, Math.min(150, angle));
    }
    
    function shootBubble() {
        if (!gameRunning || shooterBubble.moving) return;
        
        // Convert angle to radians and calculate direction
        const radians = angle * (Math.PI / 180);
        shooterBubble.dx = Math.cos(radians) * bubbleSpeed;
        shooterBubble.dy = -Math.sin(radians) * bubbleSpeed;
        shooterBubble.moving = true;
    }
    
    function update() {
        if (!gameRunning) return;
        
        // Move the shooter bubble
        if (shooterBubble.moving) {
            shooterBubble.x += shooterBubble.dx;
            shooterBubble.y += shooterBubble.dy;
            
            // Check for collisions with walls
            if (shooterBubble.x - shooterBubble.radius < 0 || 
                shooterBubble.x + shooterBubble.radius > canvas.width) {
                shooterBubble.dx = -shooterBubble.dx;
            }
            
            // Check for collisions with ceiling
            if (shooterBubble.y - shooterBubble.radius < 0) {
                attachBubble();
                return;
            }
            
            // Check for collisions with other bubbles
            for (const bubble of bubbles) {
                if (checkCollision(shooterBubble, bubble)) {
                    attachBubble(bubble);
                    return;
                }
            }
        }
        
        // Check if any bubbles need to be removed
        checkForMatches();
    }
    
    function checkCollision(bubble1, bubble2) {
        const dx = bubble1.x - bubble2.x;
        const dy = bubble1.y - bubble2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < bubble1.radius + bubble2.radius;
    }
    
    function attachBubble(collidedBubble = null) {
        shooterBubble.moving = false;
        
        // Find the grid position for the new bubble
        let row, col;
        
        if (collidedBubble) {
            // Find adjacent position to collided bubble
            const positions = findAdjacentPositions(collidedBubble);
            
            // Find the closest position to the shooter bubble
            let closestPos = null;
            let minDistance = Infinity;
            
            for (const pos of positions) {
                if (!pos.bubble) {
                    const dx = shooterBubble.x - pos.x;
                    const dy = shooterBubble.y - pos.y;
                    const distance = dx * dx + dy * dy;
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPos = pos;
                    }
                }
            }
            
            if (closestPos) {
                row = closestPos.row;
                col = closestPos.col;
                shooterBubble.x = closestPos.x;
                shooterBubble.y = closestPos.y;
            } else {
                // Shouldn't happen, but fallback to ceiling
                row = 0;
                col = Math.round((shooterBubble.x - bubbleRadius) / (bubbleRadius * 2));
                shooterBubble.y = bubbleRadius;
            }
        } else {
            // Attach to ceiling
            row = 0;
            col = Math.round((shooterBubble.x - bubbleRadius) / (bubbleRadius * 2));
            shooterBubble.y = bubbleRadius;
        }
        
        // Ensure col is within bounds
        col = Math.max(0, Math.min(cols - 1, col));
        
        // Add to grid and bubbles array
        shooterBubble.row = row;
        shooterBubble.col = col;
        grid[row][col] = shooterBubble;
        bubbles.push(shooterBubble);
        
        // Generate new shooter bubble from next bubble
        shooterBubble = {
            x: canvas.width / 2,
            y: canvas.height - bubbleRadius - 10,
            color: nextBubble.color,
            radius: bubbleRadius,
            dx: 0,
            dy: 0,
            moving: false
        };
        
        generateNextBubble();
        
        // Check if any bubbles need to be removed
        checkForMatches();
        
        // Check if game over (bubbles reached bottom)
        checkGameOver();
    }
    
    function findAdjacentPositions(bubble) {
        const positions = [];
        const { row, col } = bubble;
        const offset = row % 2 === 0 ? 0 : bubbleRadius;
        
        // Possible adjacent positions
        const neighbors = [
            { row: row - 1, col: col - (row % 2 === 0 ? 1 : 0) }, // top-left
            { row: row - 1, col: col + (row % 2 === 0 ? 0 : 1) }, // top-right
            { row: row, col: col - 1 }, // left
            { row: row, col: col + 1 }, // right
            { row: row + 1, col: col - (row % 2 === 0 ? 1 : 0) }, // bottom-left
            { row: row + 1, col: col + (row % 2 === 0 ? 0 : 1) }  // bottom-right
        ];
        
        for (const neighbor of neighbors) {
            if (neighbor.row >= 0 && neighbor.row < rows && 
                neighbor.col >= 0 && neighbor.col < cols) {
                
                const x = neighbor.col * (bubbleRadius * 2) + bubbleRadius + (neighbor.row % 2 === 0 ? 0 : bubbleRadius);
                const y = neighbor.row * (bubbleRadius * 1.8) + bubbleRadius;
                
                positions.push({
                    row: neighbor.row,
                    col: neighbor.col,
                    x,
                    y,
                    bubble: grid[neighbor.row][neighbor.col]
                });
            }
        }
        
        return positions;
    }
    
    function checkForMatches() {
        const visited = new Set();
        const bubblesToRemove = [];
        
        for (const bubble of bubbles) {
            if (!visited.has(bubble)) {
                const matchingBubbles = findMatchingBubbles(bubble);
                
                if (matchingBubbles.length >= 3) {
                    bubblesToRemove.push(...matchingBubbles);
                    visited.add(bubble);
                }
            }
        }
        
        if (bubblesToRemove.length > 0) {
            // Remove bubbles from grid and array
            for (const bubble of bubblesToRemove) {
                grid[bubble.row][bubble.col] = null;
                const index = bubbles.indexOf(bubble);
                if (index !== -1) bubbles.splice(index, 1);
            }
            
            // Update score
            score += bubblesToRemove.length * 10 * level;
            updateScore();
            
            // Check for floating bubbles
            checkFloatingBubbles();
            
            // Check if level complete
            if (bubbles.length === 0) {
                levelUp();
            }
        }
    }
    
    function findMatchingBubbles(startBubble, matchingBubbles = []) {
        matchingBubbles.push(startBubble);
        
        const neighbors = findAdjacentPositions(startBubble)
            .filter(pos => pos.bubble && pos.bubble.color === startBubble.color)
            .map(pos => pos.bubble);
        
        for (const neighbor of neighbors) {
            if (!matchingBubbles.includes(neighbor)) {
                findMatchingBubbles(neighbor, matchingBubbles);
            }
        }
        
        return matchingBubbles;
    }
    
    function checkFloatingBubbles() {
        const attachedBubbles = new Set();
        const queue = [];
        
        // Start with bubbles attached to the ceiling
        for (let col = 0; col < cols; col++) {
            if (grid[0][col]) {
                queue.push(grid[0][col]);
                attachedBubbles.add(grid[0][col]);
            }
        }
        
        // BFS to find all attached bubbles
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = findAdjacentPositions(current)
                .filter(pos => pos.bubble && !attachedBubbles.has(pos.bubble))
                .map(pos => pos.bubble);
            
            for (const neighbor of neighbors) {
                attachedBubbles.add(neighbor);
                queue.push(neighbor);
            }
        }
        
        // Remove floating bubbles
        const floatingBubbles = bubbles.filter(b => !attachedBubbles.has(b));
        
        if (floatingBubbles.length > 0) {
            for (const bubble of floatingBubbles) {
                grid[bubble.row][bubble.col] = null;
                const index = bubbles.indexOf(bubble);
                if (index !== -1) bubbles.splice(index, 1);
            }
            
            // Update score
            score += floatingBubbles.length * 5 * level;
            updateScore();
        }
    }
    
    function checkGameOver() {
        for (const bubble of bubbles) {
            if (bubble.y + bubbleRadius >= canvas.height - bubbleRadius * 2) {
                gameOver();
                return;
            }
        }
    }
    
    function levelUp() {
        level++;
        document.getElementById('level').textContent = level;
        
        // Add new row of bubbles
        for (let row = rows - 1; row > 0; row--) {
            for (let col = 0; col < cols; col++) {
                if (grid[row - 1][col]) {
                    const bubble = grid[row - 1][col];
                    bubble.row = row;
                    grid[row][col] = bubble;
                    grid[row - 1][col] = null;
                    
                    // Update y position
                    bubble.y = row * (bubbleRadius * 1.8) + bubbleRadius;
                }
            }
        }
        
        // Add new top row
        grid[0] = [];
        for (let col = 0; col < cols; col++) {
            if (Math.random() > 0.3) { // 70% chance of a bubble in each cell
                const colorIndex = Math.floor(Math.random() * bubbleColors.length);
                const offset = 0 % 2 === 0 ? 0 : bubbleRadius;
                const x = col * (bubbleRadius * 2) + bubbleRadius + offset;
                const y = 0 * (bubbleRadius * 1.8) + bubbleRadius;
                
                const bubble = {
                    x,
                    y,
                    row: 0,
                    col,
                    color: bubbleColors[colorIndex],
                    radius: bubbleRadius
                };
                
                grid[0][col] = bubble;
                bubbles.push(bubble);
            } else {
                grid[0][col] = null;
            }
        }
        
        // Check if game over after adding new row
        checkGameOver();
    }
    
    function gameOver() {
        gameRunning = false;
        
        // Display game over message
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ff66a3';
        ctx.font = '30px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px Orbitron';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(`Level: ${level}`, canvas.width / 2, canvas.height / 2 + 50);
    }
    
    function updateScore() {
        document.getElementById('score').textContent = score;
    }
    
    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw bubbles
        for (const bubble of bubbles) {
            drawBubble(bubble);
        }
        
        // Draw shooter bubble
        if (shooterBubble) {
            drawBubble(shooterBubble);
            
            // Draw aiming line
            if (!shooterBubble.moving) {
                const radians = angle * (Math.PI / 180);
                const lineLength = 100;
                const endX = shooterBubble.x + Math.cos(radians) * lineLength;
                const endY = shooterBubble.y - Math.sin(radians) * lineLength;
                
                ctx.beginPath();
                ctx.moveTo(shooterBubble.x, shooterBubble.y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw small circle at end
                ctx.beginPath();
                ctx.arc(endX, endY, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fill();
            }
        }
        
        // Draw next bubble preview
        if (nextBubble) {
            const previewX = canvas.width - bubbleRadius - 20;
            const previewY = canvas.height - bubbleRadius - 10;
            
            ctx.beginPath();
            ctx.arc(previewX, previewY, nextBubble.radius, 0, Math.PI * 2);
            ctx.fillStyle = nextBubble.color;
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('NEXT', previewX, previewY + nextBubble.radius + 20);
        }
    }
    
    function drawBubble(bubble) {
        // Bubble glow effect
        const gradient = ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, bubble.radius
        );
        
        gradient.addColorStop(0, bubble.color);
        gradient.addColorStop(1, shadeColor(bubble.color, -40));
        
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Bubble highlight
        ctx.beginPath();
        ctx.arc(
            bubble.x - bubble.radius * 0.3, 
            bubble.y - bubble.radius * 0.3, 
            bubble.radius * 0.2, 
            0, 
            Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        
        // Bubble border
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    function shadeColor(color, percent) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);
        
        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);
        
        R = (R < 255) ? R : 255;
        G = (G < 255) ? G : 255;
        B = (B < 255) ? B : 255;
        
        const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16);
        const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16);
        const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16);
        
        return "#" + RR + GG + BB;
    }
    
    function gameLoop() {
        update();
        draw();
        
        if (gameRunning) {
            requestAnimationFrame(gameLoop);
        }
    }
});