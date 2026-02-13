import { APP_URL } from '../constants';

/**
 * Нарисовать текст с тенью
 */
const drawTextWithShadow = (ctx, text, x, y, shadowColor = 'rgba(0,0,0,0.5)') => {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText(text, x, y);
  ctx.restore();
};

/**
 * Скруглённый прямоугольник
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
 * Перенос текста по строкам
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Генерация картинки для шеринга в историю VK.
 * Возвращает data URI (data:image/jpeg;base64,...) — готовый для VKWebAppShowStoryBox.
 *
 * Используем:
 * - canvas 540x960 (не 1080x1920) — экономит память на мобилках
 * - toDataURL вместо toBlob+FileReader — синхронно, не зависает
 * - JPEG 85% — в 5-10 раз меньше PNG
 * - никаких внешних картинок (crossOrigin taints canvas)
 */
export const generateShareImage = (diagnosis, mode) => {
  const W = 540;
  const H = 960;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Фон — градиент
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
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
  ctx.fillRect(0, 0, W, H);

  // Декоративные круги
  const accentRgba = mode === 'angry' ? 'rgba(255, 80, 80, 0.1)' : 'rgba(80, 255, 180, 0.1)';
  ctx.fillStyle = accentRgba;
  ctx.beginPath(); ctx.arc(100, 200, 150, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(450, 750, 200, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = 'center';

  // Креветка — эмодзи (никаких внешних картинок!)
  ctx.font = '100px system-ui, sans-serif';
  ctx.fillText('\u{1F990}', W / 2, 180);

  // Заголовок
  const titleColor = mode === 'angry' ? '#ff6b6b' : '#6bffb8';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  drawTextWithShadow(ctx, '\u041A\u0440\u0435\u0432\u0435\u0442\u043A\u0430 \u0441\u0443\u0434\u044C\u0431\u044B', W / 2, 250,
    mode === 'angry' ? 'rgba(255,50,50,0.5)' : 'rgba(50,255,150,0.5)');

  // Подзаголовок
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '18px system-ui, sans-serif';
  const subtitle = mode === 'angry'
    ? '\u{1F525} \u0417\u043B\u0430\u044F \u043A\u0440\u0435\u0432\u0435\u0442\u043A\u0430 \u0441\u043A\u0430\u0437\u0430\u043B\u0430:'
    : '\u2728 \u041C\u044F\u0433\u043A\u0430\u044F \u043A\u0440\u0435\u0432\u0435\u0442\u043A\u0430 \u0441\u043A\u0430\u0437\u0430\u043B\u0430:';
  ctx.fillText(subtitle, W / 2, 290);

  // Карточка диагноза
  const cardY = 320;
  const cardPad = 30;
  const cardW = W - cardPad * 2;
  const cardH = 280;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, cardPad, cardY, cardW, cardH, 16);
  ctx.fill();

  ctx.strokeStyle = mode === 'angry' ? 'rgba(255, 80, 80, 0.5)' : 'rgba(80, 255, 180, 0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardPad, cardY, cardW, cardH, 16);
  ctx.stroke();

  // Текст диагноза
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  const lines = wrapText(ctx, '\u00AB' + diagnosis + '\u00BB', cardW - 40);
  const lineH = 34;
  const textY = cardY + (cardH - lines.length * lineH) / 2 + 20;
  lines.forEach((line, i) => {
    drawTextWithShadow(ctx, line, W / 2, textY + i * lineH);
  });

  // CTA
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('\u0423\u0437\u043D\u0430\u0439 \u0441\u0432\u043E\u044E \u043F\u0440\u0430\u0432\u0434\u0443', W / 2, 680);

  // Кнопка
  const btnW = 200;
  const btnH = 36;
  const btnX = (W - btnW) / 2;
  const btnY = 700;
  ctx.fillStyle = mode === 'angry' ? '#ff6b6b' : '#6bffb8';
  roundRect(ctx, btnX, btnY, btnW, btnH, 18);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('\u0422\u044B\u043A\u043D\u0438 \u043A\u0440\u0435\u0432\u0435\u0442\u043A\u0443', W / 2, btnY + 24);

  // URL
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('vk.com/app54437141', W / 2, 880);

  // Декор
  ctx.font = '20px system-ui, sans-serif';
  if (mode === 'angry') {
    ctx.fillText('\u{1F525}', 75, 800);
    ctx.fillText('\u{1F525}', 465, 800);
  } else {
    ctx.fillText('\u2728', 75, 800);
    ctx.fillText('\u{1F4AB}', 465, 800);
  }

  // toDataURL — синхронный, надёжный, возвращает полный data URI
  return canvas.toDataURL('image/jpeg', 0.85);
};

/**
 * Генерация видео для сторис — заглушка, возвращает картинку.
 * Видеогенерация через canvas.captureStream ненадёжна на мобилках.
 */
export const generateShareVideo = (diagnosis, mode) => {
  return generateShareImage(diagnosis, mode);
};

export default generateShareImage;
