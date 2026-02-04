import { APP_URL } from '../constants';

/**
 * Загрузить изображение
 */
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Нарисовать текст с тенью
 */
const drawTextWithShadow = (ctx, text, x, y, shadowColor = 'rgba(0,0,0,0.5)') => {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText(text, x, y);
  ctx.restore();
};

/**
 * Генерация картинки для шеринга в историю
 * @param {string} diagnosis - текст диагноза
 * @param {string} mode - режим (angry/soft)
 * @returns {Promise<string>} base64 изображения без префикса data:
 */
export const generateShareImage = async (diagnosis, mode) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // Основной фон — градиент
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
  if (mode === 'angry') {
    gradient.addColorStop(0, '#1a0505');
    gradient.addColorStop(0.5, '#2d0a0a');
    gradient.addColorStop(1, '#1a0505');
  } else {
    gradient.addColorStop(0, '#051a1a');
    gradient.addColorStop(0.5, '#0a2d2d');
    gradient.addColorStop(1, '#051a1a');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // Декоративные круги на фоне
  const accentColor = mode === 'angry' ? 'rgba(255, 80, 80, 0.1)' : 'rgba(80, 255, 180, 0.1)';
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(200, 400, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(900, 1500, 400, 0, Math.PI * 2);
  ctx.fill();

  // Пытаемся загрузить картинку креветки
  try {
    const shrimpImg = await loadImage('shrimp-hero.png');
    // Рисуем креветку по центру сверху
    const imgSize = 400;
    const imgX = (1080 - imgSize) / 2;
    ctx.drawImage(shrimpImg, imgX, 150, imgSize, imgSize);
  } catch {
    // Fallback — эмодзи
    ctx.font = '200px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦐', 540, 400);
  }

  // Заголовок с эффектом свечения
  ctx.textAlign = 'center';
  const titleColor = mode === 'angry' ? '#ff6b6b' : '#6bffb8';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
  drawTextWithShadow(ctx, 'Креветка судьбы', 540, 650, mode === 'angry' ? 'rgba(255,50,50,0.5)' : 'rgba(50,255,150,0.5)');

  // Подзаголовок
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '36px system-ui, sans-serif';
  const subtitle = mode === 'angry' ? '🔥 Злая креветка сказала:' : '✨ Мягкая креветка сказала:';
  ctx.fillText(subtitle, 540, 720);

  // Карточка для диагноза
  const cardY = 800;
  const cardHeight = 500;
  const cardPadding = 60;

  // Фон карточки
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, cardPadding, cardY, 1080 - cardPadding * 2, cardHeight, 30);
  ctx.fill();

  // Рамка карточки
  ctx.strokeStyle = mode === 'angry' ? 'rgba(255, 80, 80, 0.5)' : 'rgba(80, 255, 180, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardPadding, cardY, 1080 - cardPadding * 2, cardHeight, 30);
  ctx.stroke();

  // Диагноз
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px system-ui, sans-serif';

  // Перенос текста
  const words = diagnosis.split(' ');
  const lines = [];
  let currentLine = '';
  const maxWidth = 1080 - cardPadding * 2 - 60;

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = 65;
  const textStartY = cardY + (cardHeight - lines.length * lineHeight) / 2 + 40;

  lines.forEach((line, i) => {
    drawTextWithShadow(ctx, `"${line}"`, 540, textStartY + i * lineHeight);
  });

  // Нижняя часть — CTA
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillText('Узнай свою правду', 540, 1450);

  // Кнопка
  const btnY = 1500;
  const btnWidth = 400;
  const btnHeight = 70;
  const btnX = (1080 - btnWidth) / 2;

  ctx.fillStyle = mode === 'angry' ? '#ff6b6b' : '#6bffb8';
  roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 35);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('Тыкни креветку', 540, btnY + 47);

  // URL внизу
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('vk.com/app54437141', 540, 1750);

  // Декоративные элементы
  if (mode === 'angry') {
    ctx.font = '40px system-ui, sans-serif';
    ctx.fillText('🔥', 150, 1600);
    ctx.fillText('🔥', 930, 1600);
  } else {
    ctx.font = '40px system-ui, sans-serif';
    ctx.fillText('✨', 150, 1600);
    ctx.fillText('💫', 930, 1600);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
};

/**
 * Нарисовать скруглённый прямоугольник
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Генерация анимированного видео для сторис (3 секунды)
 * @param {string} diagnosis - текст диагноза
 * @param {string} mode - режим (angry/soft)
 * @returns {Promise<string>} base64 видео без префикса data:
 */
export const generateShareVideo = async (diagnosis, mode) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;  // Меньше для производительности
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    // Настройка MediaRecorder
    let stream;
    try {
      stream = canvas.captureStream(30); // 30 FPS
    } catch {
      // Fallback на статичную картинку
      generateShareImage(diagnosis, mode).then(resolve).catch(reject);
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    };

    recorder.onerror = () => {
      // Fallback на статичную картинку
      generateShareImage(diagnosis, mode).then(resolve).catch(reject);
    };

    // Параметры анимации
    const duration = 3000; // 3 секунды
    const startTime = performance.now();
    let animationFrame;

    const accentColor = mode === 'angry' ? '#ff6b6b' : '#6bffb8';
    const bgStart = mode === 'angry' ? '#1a0505' : '#051a1a';
    const bgMid = mode === 'angry' ? '#2d0a0a' : '#0a2d2d';

    // Разбиваем диагноз на строки
    ctx.font = 'bold 36px system-ui, sans-serif';
    const words = diagnosis.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (ctx.measureText(testLine).width > 600) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Очистка
      ctx.clearRect(0, 0, 720, 1280);

      // Фон
      const gradient = ctx.createLinearGradient(0, 0, 0, 1280);
      gradient.addColorStop(0, bgStart);
      gradient.addColorStop(0.5, bgMid);
      gradient.addColorStop(1, bgStart);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 720, 1280);

      // Пульсирующие круги
      const pulse = Math.sin(elapsed * 0.003) * 0.3 + 0.7;
      ctx.fillStyle = mode === 'angry' ? `rgba(255, 80, 80, ${0.1 * pulse})` : `rgba(80, 255, 180, ${0.1 * pulse})`;
      ctx.beginPath();
      ctx.arc(150, 300, 200 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(600, 1000, 250 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Креветка с покачиванием
      const wobble = Math.sin(elapsed * 0.005) * 10;
      ctx.font = '120px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🦐', 360 + wobble, 280);

      // Заголовок (появляется)
      const titleOpacity = Math.min(progress * 3, 1);
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = titleOpacity;
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.fillText('Креветка судьбы', 360, 400);
      ctx.globalAlpha = 1;

      // Подзаголовок
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '24px system-ui, sans-serif';
      const subtitle = mode === 'angry' ? '🔥 Злая креветка сказала:' : '✨ Мягкая креветка сказала:';
      ctx.fillText(subtitle, 360, 460);

      // Карточка диагноза (выезжает снизу)
      const cardY = 520 + Math.max(0, (1 - progress * 2)) * 200;
      const cardOpacity = Math.min(progress * 2, 1);

      ctx.globalAlpha = cardOpacity;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      roundRect(ctx, 40, cardY, 640, 350, 20);
      ctx.fill();

      ctx.strokeStyle = mode === 'angry' ? 'rgba(255, 80, 80, 0.6)' : 'rgba(80, 255, 180, 0.6)';
      ctx.lineWidth = 2;
      roundRect(ctx, 40, cardY, 640, 350, 20);
      ctx.stroke();

      // Диагноз
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px system-ui, sans-serif';
      const lineHeight = 45;
      const textStartY = cardY + (350 - lines.length * lineHeight) / 2 + 30;
      lines.forEach((line, i) => {
        ctx.fillText(`"${line}"`, 360, textStartY + i * lineHeight);
      });
      ctx.globalAlpha = 1;

      // CTA внизу (пульсирует)
      const ctaPulse = Math.sin(elapsed * 0.008) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * ctaPulse})`;
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText('Узнай свою правду', 360, 1050);

      // Кнопка
      ctx.fillStyle = accentColor;
      roundRect(ctx, 210, 1080, 300, 50, 25);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('Тыкни креветку', 360, 1113);

      // URL
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('vk.com/app54437141', 360, 1200);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        recorder.stop();
      }
    };

    recorder.start();
    animate();

    // Timeout защита
    setTimeout(() => {
      if (recorder.state === 'recording') {
        cancelAnimationFrame(animationFrame);
        recorder.stop();
      }
    }, duration + 500);
  });
};

export default generateShareImage;
