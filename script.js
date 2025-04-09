const canvas = document.getElementById("flightCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

let flightData = [];
let intervalId = null;
const totalTime = 20000; // 20 секунд
const scale = 0.5; // Масштаб для canvas 400x400
const startX = canvas.width / 2;
const startY = canvas.height / 2;
let positions = [];
let showBoom = false; // Прапорець для відображення BOOM!
let boomPosition = null; // Позиція для BOOM!

// Завантаження зображення дрону
const droneImage = new Image();
droneImage.src = "drone-svgrepo-com.svg";

// Завантаження зображення карти
const mapImage = new Image();
mapImage.src = "map.png";

// Завантаження зображення BOOM!
const boomImage = new Image();
boomImage.src = "boom-svgrepo-com.svg";
boomImage.style.zIndex = 3; // Встановлюємо z-index для BOOM!

// Завантаження JSON
async function loadFlightData() {
  try {
    const response = await fetch("flightData.json");
    flightData = await response.json();
    calculateTrajectory();
    droneImage.onload = () => {
      if (mapImage.complete && boomImage.complete) {
        drawFrame(0); // Малюємо, коли всі зображення готові
      } else {
        mapImage.onload = boomImage.onload = () => drawFrame(0);
      }
    };
  } catch (error) {
    console.error("Помилка завантаження JSON:", error);
  }
}

// Обчислення траєкторії
function calculateTrajectory() {
  let currentX = startX;
  let currentY = startY;
  positions = [{ x: currentX, y: currentY }];

  for (let i = 1; i < flightData.length; i++) {
    const prev = flightData[i - 1];
    const curr = flightData[i];
    const timeDiff = (curr.timestamp - prev.timestamp) / 3600;
    const speed = parseFloat(prev.speed);
    const direction = (parseFloat(prev.direction) * Math.PI) / 180;

    const distance = speed * timeDiff * scale;
    const dx = distance * Math.cos(direction);
    const dy = distance * Math.sin(direction);

    currentX += dx;
    currentY -= dy;
    positions.push({ x: currentX, y: currentY });
  }
}

// Малювання
function drawFrame(index) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Малюємо карту як фон
  if (mapImage.complete) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  }

  // Малюємо траєкторію
  ctx.beginPath();
  ctx.moveTo(positions[0].x, positions[0].y);
  for (let i = 1; i <= index; i++) {
    ctx.lineTo(positions[i].x, positions[i].y);
  }
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Малюємо дрон
  const x = positions[index].x - droneImage.width / 2;
  const y = positions[index].y - droneImage.height / 2;
  ctx.drawImage(droneImage, x, y);

  // Малюємо BOOM!, якщо активний прапорець
  if (showBoom && boomImage.complete && boomPosition) {
    const boomX = boomPosition.x - boomImage.width / 2; // Центруємо BOOM!
    const boomY = boomPosition.y - boomImage.height / 2;
    ctx.drawImage(boomImage, boomX, boomY);
  }
}

// Анімація
function startAnimation() {
  if (
    intervalId ||
    flightData.length === 0 ||
    !droneImage.complete ||
    !mapImage.complete ||
    !boomImage.complete
  )
    return;

  let currentIndex = 0;
  const stepTime = totalTime / flightData.length; // ~206 мс
  const halfwayIndex = Math.floor(positions.length / 2); // Індекс середини траєкторії

  // Анімація польоту дрону
  intervalId = setInterval(() => {
    if (currentIndex < positions.length) {
      drawFrame(currentIndex);
      currentIndex++;
    } else {
      stopAnimation();
    }
  }, stepTime);

  // Показ BOOM! через 10 секунд у позиції середини траєкторії
  setTimeout(() => {
    boomPosition = positions[halfwayIndex]; // Зберігаємо позицію середини
    showBoom = true; // Вмикаємо прапорець
    drawFrame(currentIndex); // Оновлюємо кадр із BOOM!
    setTimeout(() => {
      showBoom = false; // Вимикаємо через 2 секунди
      drawFrame(currentIndex); // Оновлюємо кадр без BOOM!
    }, 2000); // 2 секунди
  }, totalTime / 2); // 10 секунд
}

// Зупинка
function stopAnimation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  showBoom = false; // Прибираємо BOOM! при зупинці
  boomPosition = null; // Очищаємо позицію
  if (positions.length > 0) {
    drawFrame(0);
  }
}

// Обробники
startBtn.addEventListener("click", startAnimation);
stopBtn.addEventListener("click", stopAnimation);

// Завантажуємо дані
loadFlightData();
