/**
 * Система батлов — сравнение диагнозов с друзьями
 */
import bridge from '@vkontakte/vk-bridge';
import { APP_URL } from '../constants';

/**
 * Генерация уникального ID батла
 */
const generateBattleId = () => {
  return Math.random().toString(36).substring(2, 10);
};

/**
 * Создать батл и пригласить друга
 */
export const createBattle = async (diagnosis, mode, userName = 'Аноним') => {
  const battleId = generateBattleId();
  const battleData = {
    id: battleId,
    creator: userName,
    creatorDiagnosis: diagnosis,
    creatorMode: mode,
    createdAt: Date.now(),
  };

  // Сохраняем батл в storage
  try {
    await bridge.send('VKWebAppStorageSet', {
      key: `battle_${battleId}`,
      value: JSON.stringify(battleData)
    });
  } catch { /* ignore */ }

  return battleData;
};

/**
 * Поделиться батлом с другом
 */
export const shareBattle = async (diagnosis, mode) => {
  const modeEmoji = mode === 'angry' ? '🔥' : '✨';
  const modeText = mode === 'angry' ? 'Злая' : 'Мягкая';

  const message = `${modeEmoji} ${modeText} креветка поставила мне диагноз:\n\n"${diagnosis}"\n\n🆚 Сможешь получить жёстче?\n\n${APP_URL}`;

  try {
    await bridge.send('VKWebAppShare', {
      link: APP_URL,
      comment: message
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Генерация картинки для батла
 */
export const generateBattleImage = async (myDiagnosis, myMode) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // Фон
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(0.5, '#1a0a2d');
  gradient.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // VS в центре
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 200px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.1;
  ctx.fillText('VS', 540, 1000);
  ctx.globalAlpha = 1;

  // Заголовок
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('🦐 БАТЛ КРЕВЕТОК 🦐', 540, 200);

  // Мой диагноз
  ctx.fillStyle = myMode === 'angry' ? '#ff6b6b' : '#6bffb8';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(myMode === 'angry' ? '🔥 МОЙ ДИАГНОЗ' : '✨ МОЙ ДИАГНОЗ', 540, 400);

  // Карточка диагноза
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  roundRect(ctx, 60, 450, 960, 300, 20);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px system-ui, sans-serif';
  wrapText(ctx, `"${myDiagnosis}"`, 540, 550, 880, 50);

  // Пустая карточка для друга
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 10]);
  roundRect(ctx, 60, 1100, 960, 300, 20);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('❓ ТВОЙ ДИАГНОЗ ❓', 540, 1280);

  // CTA
  ctx.fillStyle = '#ff6b6b';
  roundRect(ctx, 290, 1500, 500, 80, 40);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('Принять вызов!', 540, 1552);

  // URL
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('vk.com/app54437141', 540, 1750);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
};

/**
 * Поделиться батлом в историю
 */
export const shareBattleStory = async (diagnosis, mode) => {
  try {
    const imageBlob = await generateBattleImage(diagnosis, mode);
    await bridge.send('VKWebAppShowStoryBox', {
      background_type: 'image',
      blob: imageBlob,
      attachment: {
        text: 'Принять вызов!',
        type: 'url',
        url: APP_URL
      }
    });
    return true;
  } catch {
    return false;
  }
};

// Helpers
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

export default { createBattle, shareBattle, shareBattleStory, generateBattleImage };
