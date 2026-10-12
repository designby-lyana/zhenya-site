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

| Що | Де |
|---|---|
| Роботи портфоліо | `src/content/portfolio/*.json` |
| Альбоми | `src/content/albums/*.json` |
| Категорії (чіпи фільтра) | `src/content/categories/*.json` |
| Усі тексти, ціни, відгуки, контакти | `src/data/site.json` |
| Фото | `public/media/` |
| Стилі (дизайн-система «Блакить + Оливка») | `src/styles/global.css` |
| Поведінка (шапка, фільтр, лайтбокс, герой) | `public/site.js` |
| Поля адмінки | `.pages.yml` |

## Запуск (одноразово)

### 1. GitHub
1. Зареєструвати акаунт на github.com (або увійти).
2. **New repository** → назва `zhenya-site` → **Private** → Create.
3. **Add file → Upload files** → перетягнути вміст цієї папки (без `node_modules` і `dist`) → Commit.

### 2. Перенести фото з Webflow
У репозиторії: **Actions** → «Перенести фото з Webflow» → **Run workflow**.
За хвилину всі 80 фото з'являться в `public/media`. Поки цього не зроблено, сайт показує фото з Webflow.

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
