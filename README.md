# 📖 Life Diary — Telegram Mini App
### Пошаговая инструкция запуска с нуля

---

## Что ты получишь в итоге

Telegram Mini App — личный жизненный организатор с ИИ-советником.
Открывается прямо внутри Telegram. **Полностью бесплатно.**

---

## Шаг 1 — Получи бесплатный API ключ Google Gemini

1. Зайди на **https://aistudio.google.com/apikey**
2. Войди через Google аккаунт
3. Нажми **Create API Key**
4. Скопируй ключ — выглядит как `AIzaSy...`

> Полностью бесплатно: 1500 запросов в день, 15 в минуту.
> Для личного использования — более чем достаточно.

---

## Шаг 2 — Создай Telegram бота

1. Открой Telegram, найди **@BotFather**
2. Напиши `/newbot`
3. Введи имя: `Life Diary`
4. Введи username: `life_diary_моё_bot` (уникальный, оканчивается на `bot`)
5. Сохрани **токен бота** который выдаст BotFather

---

## Шаг 3 — Залей код на GitHub

1. Зарегистрируйся на **github.com** (бесплатно)
2. Создай репозиторий: **github.com/new** → имя `life-diary` → Create
3. Установи Git: **git-scm.com/downloads**
4. В терминале в папке с файлами:

```bash
git init
git add .
git commit -m "Life Diary — первый коммит"
git branch -M main
git remote add origin https://github.com/ТВОЙ_НИК/life-diary.git
git push -u origin main
```

> Нет опыта с Git? Загрузи файлы прямо на GitHub через кнопку "uploading an existing file".

---

## Шаг 4 — Задеплой на Vercel

1. **vercel.com** → войди через GitHub
2. **Add New → Project** → найди `life-diary` → **Import**
3. Ничего не меняй → **Deploy**
4. Получишь адрес: `https://life-diary-abc123.vercel.app` — сохрани!

### Добавь Gemini ключ на Vercel

1. В проекте: **Settings → Environment Variables**
2. Name: `GEMINI_API_KEY` / Value: твой ключ `AIzaSy...`
3. **Save** → **Deployments** → **Redeploy**

---

## Шаг 5 — Подключи Mini App к боту

В @BotFather:
1. `/newapp` → выбери бота
2. Название: `Life Diary`
3. URL: твой адрес с Vercel
4. Short name: `lifediary`

Получишь ссылку: `https://t.me/твой_бот/lifediary`

---

## Шаг 6 — Добавь кнопку в бота

В @BotFather:
1. `/mybots` → выбери бота → **Bot Settings → Menu Button**
2. Текст: `📖 Открыть Life Diary`
3. URL: `https://t.me/твой_бот/lifediary`

---

## Проверка

1. Открой бота в Telegram
2. Нажми кнопку `📖 Открыть Life Diary`
3. Приложение откроется на весь экран — пройди онбординг!

---

## Стоимость

| Сервис | Стоимость |
|--------|-----------|
| Telegram бот | Бесплатно |
| GitHub | Бесплатно |
| Vercel | Бесплатно |
| Google Gemini API | Бесплатно (1500 запросов/день) |

**Итого: 0 рублей в месяц** ✅

---

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| Белый экран | Проверь GEMINI_API_KEY в Vercel и сделай Redeploy |
| ИИ не отвечает | Проверь ключ на aistudio.google.com |
| Приложение не открывается | Убедись что URL в BotFather совпадает с Vercel |

---

*Life Diary ✦ — твой личный организатор жизни*
