# Сайт Євгенії Бичкової

Портфоліо фотографки. Код — [Astro](https://astro.build), хостинг — Cloudflare Pages (безкоштовно), адмінка — [Pages CMS](https://pagescms.org) (безкоштовно).

## Як це працює

```
Женя змінює щось в адмінці (pagescms.org)
        ↓ зберігає у GitHub
Cloudflare Pages бачить зміну і перебудовує сайт (1–2 хв)
        ↓
Оновлений сайт на домені
```

## Що де лежить

Дизайн і вся поведінка — **дослівно з Webflow**: ті самі класи, стилі й ваші скрипти (плівка портфоліо, вайбовий екран, стопка відгуків, віконце «Напишіть Жені», меню на телефоні тощо). Змінено лише джерело даних — тепер це адмінка.

| Що | Де |
|---|---|
| Роботи портфоліо | `src/content/portfolio/*.json` |
| Альбоми | `src/content/albums/*.json` |
| Категорії (чіпи фільтра) | `src/content/categories/*.json` |
| Тексти, ціни, відгуки, контакти, фото першого екрана | `src/data/site.json` |
| Фото, відео | `public/media/` |
| Шрифти (Fixel Display, Raleway) | `public/fonts/` |
| Стилі Webflow (дослівно) | `src/webflow/site.css` |
| Ваш кастомний код з Webflow (дослівно, 49 блоків) | `src/webflow/emb/` (головна), `src/webflow/album/` (альбом) |
| Заміна рантайму Webflow: вкладки й перегляд фото | `public/wf/shim.js` |
| Розмітка сторінок | `src/pages/index.astro`, `src/pages/albums/[slug].astro` |
| Поля адмінки | `.pages.yml` |

Вайбовий екран (35 плиток, 5 відео) і фото в картках цін задані в коді, як і у Webflow (`index.astro`, блок `zf`; `src/webflow/emb/40.css`).

## Запуск (одноразово)

### 1. GitHub
1. Зареєструвати акаунт на github.com (або увійти).
2. **New repository** → назва `zhenya-site` → **Private** → Create.
3. **Add file → Upload files** → перетягнути вміст цієї папки (без `node_modules` і `dist`) → Commit.

### 2. Перенести фото з Webflow
У репозиторії: **Actions** → «Перенести фото з Webflow» → **Run workflow**.
За кілька хвилин усі фото, відео й шрифти з'являться в `public/media` і `public/fonts`. Поки цього не зроблено, сайт бере їх з Webflow.

### 3. Cloudflare Pages
1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → вибрати `zhenya-site`.
2. Framework preset: **Astro**. Build command: `npm run build`. Output: `dist`.
3. **Save and Deploy**. Сайт з'явиться на `zhenya-site.pages.dev`.
4. Кожна гілка автоматично отримує власне тестове посилання — ось де перевіряти зміни перед злиттям у `main`.

### 4. Адмінка для Жені
1. Женя реєструє безкоштовний акаунт GitHub (лише для входу).
2. У репозиторії: **Settings → Collaborators** → додати її.
3. Женя відкриває app.pagescms.org → **Sign in with GitHub** → вибирає `zhenya-site`.
4. Готово: зліва розділи «Портфоліо», «Альбоми», «Категорії», «Тексти сайту».

### 5. Домен
Cloudflare Pages → проєкт → **Custom domains** → додати домен і виконати підказки.
Потім вписати домен у `astro.config.mjs` (поле `site`).

## Для розробки

```bash
npm install
npm run dev      # локально на http://localhost:4321
npm run build    # зібрати в dist/
```

`npm run build` спершу робить легкі WebP-копії фото (480 / 960 / 1600 px) у `public/_img`, тому Жені не треба стискати фото самій.
