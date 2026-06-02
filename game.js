const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 1. TẢI HÌNH ẢNH ---
const marioImage = new Image();
marioImage.src = "mario.png";

const heartImage = new Image();
heartImage.src = "heart.png";

const spikeImage = new Image();
spikeImage.src = "spike.png";

const goombaImage = new Image();
goombaImage.src = "goomba.png";

// --- 2. CẤU HÌNH NHÂN VẬT ---
const player = {
    startX: 50,
    startY: 150,
    x: 50,
    y: 150,
    width: 40,
    height: 50,
    speed: 6,
    velX: 0,
    velY: 0,
    jumping: false,
    grounded: false,
    lives: 3,
    isInvincible: false,
    invincibleTimer: 0,
    score: 0,         
    maxReachedX: 50   
}; 

// --- KHAI BÁO CÁC BIẾN TRẠNG THÁI ---
let isGameWon = false;       
let isJumpscareActive = false; 

const gravity = 0.5;
const friction = 0.8;

// --- 3. QUẢN LÝ CAMERA ---
const camera = {
    x: 0,
    width: canvas.width
};

// --- 4. KHỞI TẠO ĐỊA HÌNH VÀ CẤU HÌNH ĐÍCH ---
const platforms = [
    { x: 0, y: 360, width: 300, height: 40, color: "#fcb434" }
];
const spikes = [];
const items = [];
const enemies = [];

const finishLine = {
    x: 15000,          
    y: 160,           
    width: 20,
    height: 200,
    color: "#2ecc71"  
};

let lastGeneratedX = 300;

function generateMap(targetX) {
    while (lastGeneratedX < targetX + 2000 && lastGeneratedX < finishLine.x) {
        let gap = Math.floor(Math.random() * 60) + 70;
        
        for (let spikeX = lastGeneratedX; spikeX < lastGeneratedX + gap; spikeX += 30) {
            if (spikeX < finishLine.x) { 
                spikes.push({ x: spikeX, y: 375, width: 30, height: 25, color: "red" });
            }
        }

        let pWidth = Math.floor(Math.random() * 100) + 120;
        let pY = Math.floor(Math.random() * 100) + 200;

        platforms.push({ x: lastGeneratedX + gap, y: pY, width: pWidth, height: 20, color: "#b84418" });

        if (Math.random() < 0.30 && (lastGeneratedX + gap + pWidth) < finishLine.x) {
            enemies.push({
                x: lastGeneratedX + gap + 10,
                y: pY - 30,
                width: 30,
                height: 30,
                speed: 1,
                minX: lastGeneratedX + gap,
                maxX: lastGeneratedX + gap + pWidth - 30,
                color: "#4a154b"
            });
        }

        if (Math.random() < 0.15) {
            items.push({ x: lastGeneratedX + gap + (pWidth / 2) - 12, y: pY - 50, width: 25, height: 25, color: "pink", active: true });
        }

        lastGeneratedX = lastGeneratedX + gap + pWidth;
    }

    if (lastGeneratedX >= finishLine.x && platforms.filter(p => p.x === finishLine.x - 100).length === 0) {
        platforms.push({ x: finishLine.x - 100, y: 360, width: 400, height: 40, color: "#fcb434" });
    }
}

// --- 5. ĐIỀU KHIỂN PHÍM BẤM ---
const keys = {};
window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
// --- ĐIỀU KHIỂN CẢM ỨNG ĐIỆN THOẠI (BẢN VÁ LỖI KHÔNG DI CHUYỂN) ---
const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");
const btnJump = document.getElementById("btn-jump");

if (btnLeft && btnRight && btnJump) {
    // Khi chạm vào nút Qua Trái -> Kích hoạt phím KeyA
    btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); keys["KeyA"] = true; });
    btnLeft.addEventListener("touchend", (e) => { e.preventDefault(); keys["KeyA"] = false; });

    // Khi chạm vào nút Qua Phải -> Kích hoạt phím KeyD
    btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); keys["KeyD"] = true; });
    btnRight.addEventListener("touchend", (e) => { e.preventDefault(); keys["KeyD"] = false; });

    // Khi chạm vào nút Nhảy -> Kích hoạt phím Space
    btnJump.addEventListener("touchstart", (e) => { e.preventDefault(); keys["Space"] = true; });
    btnJump.addEventListener("touchend", (e) => { e.preventDefault(); keys["Space"] = false; });
}
// --- 6. HÀM KIỂM TRA VA CHẠM ---
function colCheck(shapeA, shapeB) {
    const vX = (shapeA.x + (shapeA.width / 2)) - (shapeB.x + (shapeB.width / 2));
    const vY = (shapeA.y + (shapeA.height / 2)) - (shapeB.y + (shapeB.height / 2));
    const hWidths = (shapeA.width / 2) + (shapeB.width / 2);
    const hHeights = (shapeA.height / 2) + (shapeB.height / 2);
    let colDir = null;

    if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
        const oX = hWidths - Math.abs(vX);
        const oY = hHeights - Math.abs(vY);
        if (oX >= oY) {
            if (vY > 0) {
                colDir = "t"; shapeA.y += oY;
            } else {
                colDir = "b"; shapeA.y -= oY;
            }
        } else {
            if (vX > 0) {
                colDir = "l"; shapeA.x += oX;
            } else {
                colDir = "r"; shapeA.x -= oX;
            }
        }
    }
    return colDir;
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// --- RESET TOÀN BỘ TRÒ CHƠI ---
function resetGame() {
    player.lives = 3; 
    player.score = 0;
    player.maxReachedX = 50;
    player.x = player.startX;
    player.y = player.startY;
    player.velX = 0;
    player.velY = 0;
    player.jumping = false;
    player.grounded = false;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    
    platforms.length = 1; 
    spikes.length = 0;
    items.length = 0;
    enemies.length = 0;
    lastGeneratedX = 300;
    
    isGameWon = false;
    isJumpscareActive = false; // ĐẢM BẢO CÓ DÒNG NÀY ĐỂ HỦY ĐÓNG BĂNG GAME
    
    for (let key in keys) { keys[key] = false; }
}
// --- HÀM TẠO THÔNG BÁO TỰ CHẾ ĐỂ THAY THẾ ALERT MẶC ĐỊNH ---
function showCustomAlert(title, message, buttonText, callback) {
    const alertLayer = document.getElementById("custom-alert");
    const alertTitle = document.getElementById("alert-title");
    const alertMsg = document.getElementById("alert-message");
    const alertBtn = document.getElementById("alert-button");
    
    if (alertLayer && alertTitle && alertMsg && alertBtn) {
        alertTitle.innerText = title;
        alertMsg.innerText = message;
        alertBtn.innerText = buttonText; // Đổi chữ nút bấm linh hoạt
        
        alertLayer.style.display = "flex"; // Hiện bảng lên
        
        alertBtn.onclick = function() {
            alertLayer.style.display = "none"; // Ẩn bảng đi khi bấm nút
            if (callback) callback(); 
        };
    }
}

// --- 7. HÀM XỬ LÝ CHẾT VÌ RƠI XUỐNG VỰC GAI ---
function playerFallInSpikes() {
    player.lives = 0; 
    isJumpscareActive = true; // Tạm dừng cập nhật game
    for (let key in keys) { keys[key] = false; } // Reset toàn bộ phím bấm tránh bị kẹt đi tiếp

    // Gọi hộp thoại tự chế (đã thiết kế trong index.html)
    showCustomAlert(
        "THẤT BẠI 💀", 
        "Bạn đã rơi xuống hố gai và mất hết mạng rồi!", 
        "THỬ LẠI XEM", 
        function() {
            resetGame(); // Reset mạng, điểm, vị trí map
            isJumpscareActive = false; // Kích hoạt lại vòng lặp game để chơi tiếp
        }
    );
}

// --- HÀM XỬ LÝ KHI ĐỤNG TRÚNG QUÁI ---
function playerHitEnemy() {
    if (player.isInvincible || isJumpscareActive) return; 

    player.lives--; 
    
    if (player.lives <= 0) {
        isJumpscareActive = true; 
        for (let key in keys) { keys[key] = false; }
        
        showCustomAlert(
            "GAME OVER 👾", 
            "Bạn đã bị quái vật hạ gục hoàn toàn!", 
            "HỒI SINH CHƠI TIẾP", 
            function() {
                resetGame(); // Reset toàn bộ game
                isJumpscareActive = false; // Mở khóa đóng băng game
            }
        );
    } else {
        // Nếu còn mạng thì chỉ bị bật lùi lại và nhấp nháy bất tử tạm thời
        player.velY = -6;
        player.velX = -8; 
        player.isInvincible = true;
        player.invincibleTimer = 60; 
    }
}

// --- 8. VÒNG LẶP CẬP NHẬT GAME ---
function update() {
    // Thay vì return chặn đứng cả game, chúng ta chỉ chặn di chuyển của Mario nếu đang hiện thông báo
    if (!isJumpscareActive && !isGameWon) {
        // Chỉ chạy các lệnh bấm phím di chuyển khi KHÔNG bị chết
        if (keys["ArrowRight"] || keys["KeyD"]) {
            if (player.velX < player.speed) player.velX++;
        }
        if (keys["ArrowLeft"] || keys["KeyA"]) {
            if (player.velX > -player.speed) player.velX--;
        }
        if ((keys["ArrowUp"] || keys["Space"]) && !player.jumping && player.grounded) {
            player.jumping = true;
            player.grounded = false;
            player.velY = -12; 
        }
    }
    player.velX *= friction;
    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    if (player.x < 0) player.x = 0;

    if (player.isInvincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) player.isInvincible = false;
    }

    if (player.x > player.maxReachedX) {
        player.maxReachedX = player.x;
        player.score = Math.floor(player.maxReachedX / 10);
    }

    generateMap(player.x);

    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        enemy.x += enemy.speed;
        if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) enemy.speed = -enemy.speed;
        if (isColliding(player, enemy)) playerHitEnemy();
    }

    if (player.y > canvas.height) playerFallInSpikes();

    if (isColliding(player, finishLine)) {
        isGameWon = true;
        player.score += 500;
        setTimeout(() => {
            showCustomAlert(
                "CHIẾN THẮNG 🎉", 
                "Xuất sắc! Bạn đã đến đích an toàn với Điểm Số: " + player.score, 
                "CHƠI TIẾP VÒNG MỚI", 
                function() {
                    resetGame();
                }
            );
        }, 100);
        return;
    }
    if (player.x > canvas.width / 2) {
        camera.x = player.x - canvas.width / 2;
    } else {
        camera.x = 0;
    }

    player.grounded = false;
    for (let i = 0; i < platforms.length; i++) {
        let dir = colCheck(player, platforms[i]);
        if (dir === "l" || dir === "r") {
            player.velX = 0;
            player.jumping = false;
        } else if (dir === "b") {
            player.grounded = true;
            player.jumping = false;
        } else if (dir === "t") {
            player.velY = gravity;
        }
    }
    if (player.grounded) player.velY = 0;

    for (let i = 0; i < spikes.length; i++) {
        if (isColliding(player, spikes[i])) {
            playerFallInSpikes();
            break;
        }
    }

    for (let i = 0; i < items.length; i++) {
        if (items[i].active && isColliding(player, items[i])) {
            items[i].active = false;
            if (player.lives < 3) player.lives++;
        }
    }

    // --- 9. VẼ ĐỒ HỌA ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, 0);

    for (let i = 0; i < platforms.length; i++) {
        ctx.fillStyle = platforms[i].color;
        ctx.fillRect(platforms[i].x, platforms[i].y, platforms[i].width, platforms[i].height);
    }

    for (let i = 0; i < spikes.length; i++) {
        if (spikeImage.complete && spikeImage.src !== "" && spikeImage.width > 0) {
            ctx.drawImage(spikeImage, spikes[i].x, spikes[i].y, spikes[i].width, spikes[i].height);
        } else {
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.moveTo(spikes[i].x, spikes[i].y + spikes[i].height);
            ctx.lineTo(spikes[i].x + spikes[i].width / 2, spikes[i].y);
            ctx.lineTo(spikes[i].x + spikes[i].width, spikes[i].y + spikes[i].height);
            ctx.fill();
        }
    }

    for (let i = 0; i < items.length; i++) {
        if (items[i].active) {
            if (heartImage.complete && heartImage.src !== "" && heartImage.width > 0) {
                ctx.drawImage(heartImage, items[i].x, items[i].y, items[i].width, items[i].height);
            } else {
                ctx.fillStyle = "pink";
                ctx.fillRect(items[i].x, items[i].y, items[i].width, items[i].height);
            }
        }
    }

    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        if (goombaImage.complete && goombaImage.src !== "" && goombaImage.width > 0) {
            ctx.drawImage(goombaImage, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.fillStyle = finishLine.color;
    ctx.fillRect(finishLine.x, finishLine.y, finishLine.width, finishLine.height);
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(finishLine.x + finishLine.width, finishLine.y);
    ctx.lineTo(finishLine.x + finishLine.width + 30, finishLine.y + 20);
    ctx.lineTo(finishLine.x + finishLine.width, finishLine.y + 40);
    ctx.fill();

    if (player.isInvincible && Math.floor(player.invincibleTimer / 5) % 2 === 0) {
        // Hiệu ứng nhấp nháy khi dính đòn
    } else {
        if (marioImage.complete && marioImage.width > 0) {
            ctx.drawImage(marioImage, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    }

    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.fillText("MẠNG: " + "❤️".repeat(player.lives), 20, 40);
    ctx.fillText("ĐIỂM: " + player.score, canvas.width - 150, 40);

    requestAnimationFrame(update);
}

update();