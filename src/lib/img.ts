// Перетворює шлях до фото (/media/…) на src + srcset.
// Якщо легкі копії вже зроблені (scripts/optimize-images.mjs) — віддає їх.
// Якщо фото ще не перенесене з Webflow — тимчасово показує його з Webflow CDN.
import images from '../data/images.json';
import webflow from '../../scripts/webflow-media.json';

type Variant = { w: number; src: string };
type Entry = { width: number; height: number; variants: Variant[] };

const local = images as Record<string, Entry>;
const remote = webflow as Record<string, string>;

export function img(path: string) {
  const e = local[path];
  if (e && e.variants.length) {
    const last = e.variants[e.variants.length - 1];
    return {
      src: last.src,
      srcset: e.variants.map((v) => `${v.src} ${v.w}w`).join(', '),
      width: e.width,
      height: e.height,
    };
  }
  return { src: remote[path] ?? path, srcset: undefined, width: undefined, height: undefined };
}

// Ключ категорії з того, що зберігає адмінка ("bw", "src/content/categories/bw.json" тощо)
export const catKey = (v: string) => v.split('/').pop()!.replace(/\.json$/, '');

// Латиниця для адрес альбомів: «Ранок удвох» → ranok-udvoh
const MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ie',ж:'zh',з:'z',и:'y',і:'i',ї:'i',й:'i',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',
  ш:'sh',щ:'shch',ь:'',ю:'iu',я:'ia',ʼ:'',"'":'','’':'',
};
export const slugify = (s: string) =>
  s.toLowerCase().split('').map((c) => MAP[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
