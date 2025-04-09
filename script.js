const canvas = document.getElementById("flightCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

let flightData = []; // Дані польоту
let intervalId = null; // Ідентифікатор інтервалу
let boomTimeoutId = null; // Ідентифікатор таймера для BOOM!
let boomHideTimeoutId = null; // Ідентифікатор таймера для приховування BOOM!
const totalTime = 20000; // 20 секунд
const scale = 0.5; // Масштаб для canvas 400x400
const startX = canvas.width / 2; // Центр canvas по осі X
const startY = canvas.height / 2; // Центр canvas по осі Y
let positions = []; // Позиції дрону
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
// boomImage.style.zIndex = 3; // Ця строка не потрібна для canvas, прибираємо

// Завантаження JSON
async function loadFlightData() {
  try {
    const response = await fetch("flightData.json");
    flightData = await response.json(); // Завантажуємо дані з JSON
    console.log(flightData); // Виводимо дані в консоль
    calculateTrajectory(); // Обчислюємо траєкторію
    droneImage.onload = () => {
      // Коли зображення дрону завантажено
      if (mapImage.complete && boomImage.complete) {
        // Якщо всі зображення готові
        drawFrame(0); // Малюємо, коли всі зображення готові
      } else {
        // Якщо зображення ще не готові
        mapImage.onload = boomImage.onload = () => drawFrame(0); // Малюємо, коли зображення готові
      }
    };
  } catch (error) {
    console.error("Помилка завантаження JSON:", error);
  }
}

// Обчислення траєкторії
function calculateTrajectory() {
  // Обчислюємо траєкторію дрону
  let currentX = startX; // Початкова позиція по осі X
  let currentY = startY; // Початкова позиція по осі Y
  positions = [{ x: currentX, y: currentY }]; // Додаємо початкову позицію

  for (let i = 1; i < flightData.length; i++) {
    // Проходимо по всіх даних
    const prev = flightData[i - 1]; // Попереднє значення даних польоту
    const curr = flightData[i]; // Поточне значення даних польоту
    const timeDiff = (curr.timestamp - prev.timestamp) / 3600; // Різниця часу в годинах
    const speed = parseFloat(prev.speed); // Швидкість дрону
    const direction = (parseFloat(prev.direction) * Math.PI) / 180; // Напрямок дрону в радіанах

    const distance = speed * timeDiff * scale; // Відстань, яку пройшов дрон
    const dx = distance * Math.cos(direction); // Зміщення по осі X
    const dy = distance * Math.sin(direction); // Зміщення по осі Y

    currentX += dx; // Оновлюємо позицію по осі X
    currentY -= dy; // Оновлюємо позицію по осі Y (інвертуємо Y, оскільки canvas має іншу систему координат)
    positions.push({ x: currentX, y: currentY }); // Додаємо нову позицію
  }
}

// Малювання
function drawFrame(index) {
  // Малюємо кадр
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Очищаємо canvas

  // Малюємо карту як фон
  if (mapImage.complete) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  }

  // Малюємо траєкторію
  ctx.beginPath(); // Починаємо новий шлях
  ctx.moveTo(positions[0].x, positions[0].y); // Переміщаємося до початкової позиції
  for (let i = 1; i <= index; i++) {
    // Проходимо по всіх позиціях до поточного індексу
    ctx.lineTo(positions[i].x, positions[i].y); // Малюємо лінію до поточної позиції
  }
  ctx.strokeStyle = "#000"; // Колір лінії
  ctx.lineWidth = 3; // Товщина лінії
  ctx.stroke(); // Малюємо лінію

  // Малюємо дрон
  const x = positions[index].x - droneImage.width / 2; // Центруємо дрон по осі X
  const y = positions[index].y - droneImage.height / 2; // Центруємо дрон по осі Y
  ctx.drawImage(droneImage, x, y); // Малюємо дрон

  // Малюємо BOOM!, якщо активний прапорець
  if (showBoom && boomImage.complete && boomPosition) {
    // Якщо прапорець активний і зображення BOOM! завантажено
    const boomX = boomPosition.x - boomImage.width / 2; // Центруємо BOOM! по осі X
    const boomY = boomPosition.y - boomImage.height / 2; // Центруємо BOOM! по осі Y
    ctx.drawImage(boomImage, boomX, boomY); // Малюємо BOOM!
  }
}

// Анімація
function startAnimation() {
  // Запускаємо анімацію
  if (
    intervalId ||
    flightData.length === 0 ||
    !droneImage.complete ||
    !mapImage.complete ||
    !boomImage.complete // Перевіряємо, чи всі зображення завантажені
  )
    return;

  let currentIndex = 0; // Поточний індекс для анімації
  const stepTime = totalTime / flightData.length; // ~206 мс для кожного кроку
  const halfwayIndex = Math.floor(positions.length / 2); // Індекс середини траєкторії

  // Анімація польоту дрону
  intervalId = setInterval(() => {
    // Запускаємо інтервал
    if (currentIndex < positions.length) {
      // Якщо індекс менший за кількість позицій
      drawFrame(currentIndex); // Малюємо кадр
      currentIndex++; // Збільшуємо індекс
    } else {
      // Якщо індекс більший або дорівнює кількості позицій
      stopAnimation(); // Зупиняємо анімацію
    }
  }, stepTime); // Кожні ~206 мс

  // Показ BOOM! через 10 секунд у позиції середини траєкторії
  boomTimeoutId = setTimeout(() => {
    boomPosition = positions[halfwayIndex]; // Зберігаємо позицію середини
    showBoom = true; // Вмикаємо прапорець
    drawFrame(currentIndex); // Оновлюємо кадр із BOOM!
    boomHideTimeoutId = setTimeout(() => {
      showBoom = false; // Вимикаємо через 2 секунди
      drawFrame(currentIndex); // Оновлюємо кадр без BOOM!
    }, 2000); // 2 секунди
  }, totalTime / 2); // 10 секунд
}

// Зупинка
function stopAnimation() {
  // Зупиняємо анімацію
  if (intervalId) {
    // Якщо інтервал активний
    clearInterval(intervalId); // Очищаємо інтервал
    intervalId = null; // Очищаємо інтервал
  }
  if (boomTimeoutId) {
    // Якщо таймер BOOM! активний
    clearTimeout(boomTimeoutId); // Очищаємо таймер показу BOOM!
    boomTimeoutId = null; // Очищаємо таймер
  }
  if (boomHideTimeoutId) {
    clearTimeout(boomHideTimeoutId); // Очищаємо таймер приховування BOOM!
    boomHideTimeoutId = null;
  }
  showBoom = false; // Прибираємо BOOM! при зупинці
  boomPosition = null; // Очищаємо позицію
  if (positions.length > 0) {
    drawFrame(0); // Малюємо початковий кадр
  }
}

// Обробники
startBtn.addEventListener("click", startAnimation);
stopBtn.addEventListener("click", stopAnimation);

// Завантажуємо дані
loadFlightData();
