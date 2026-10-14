// Підготовка фото перед завантаженням: зменшуємо до розумного розміру прямо в браузері.
// Женя може кидати фото хоч по 20 МБ — на сайт піде копія до 2560 px по довшій стороні (~1 МБ).
// Легкі копії під різні екрани (WebP 480/960/1600) сайт робить сам під час збірки.

const MAX = 2560;
const QUALITY = 0.88;

export class PhotoError extends Error {}

export function baseName(name) {
  return String(name || 'foto')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

export async function prepareImage(file) {
  const isVideo = /^video\//.test(file.type) || /\.(mov|mp4|m4v|avi)$/i.test(file.name);
  if (isVideo) throw new PhotoError('Це відео. Сюди підходять лише фото.');

  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      bmp = await createImageBitmap(file);
    } catch {
      bmp = null;
    }
  }
  if (!bmp) {
    if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
      throw new PhotoError('Фото у форматі HEIC цей браузер не відкриває. Надішліть його з телефона або збережіть як JPG.');
    }
    throw new PhotoError('Цей файл не відкривається як фото.');
  }
  const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  let blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
  } else {
    // старіші iPhone/iPad
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', QUALITY));
  }
  bmp.close?.();
  if (!blob) throw new PhotoError('Не вдалося підготувати фото. Спробуйте інше.');
  return { blob, width: w, height: h, name: latin(baseName(file.name)) + '.jpg' };
}

// Назви файлів латиницею, щоб адреси були простими.
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
};
export function latin(s) {
  return (
    s
      .split('')
      .map((c) => MAP[c] ?? c)
      .join('')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'foto'
  );
}
