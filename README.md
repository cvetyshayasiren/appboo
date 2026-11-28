# 🎨 AppBoo

Сборник веб-приложений, опубликованных на GitHub Pages. Можно сразу открыть каталог и пользоваться приложениями в браузере — локальный сервер и установка не нужны.

**[Открыть AppBoo — основной каталог](https://cvetyshayasiren.github.io/appboo/)**

Конвенции, контракт и пайплайны разработки — в [CONTRIBUTING.md](CONTRIBUTING.md).
Инструкция для ИИ-агентов по выкладке приложений — в [AGENTS.md](AGENTS.md).

## Как устроен проект

Каждое приложение живёт в отдельной папке внутри `apps/`. Плеер (`index.html` в
корне) читает единый `catalog.json` — один запрос вместо реестра и
`meta/meta.json` каждого приложения; точка входа приложения — `src/index.html`.
Каталог собирается нормализатором из `meta.json` и хранит дату добавления
каждого приложения (`added`). Плеер — «терпимый читатель»: кривые данные
не ломают каталог.

## Структура проекта

```
appboo/
├── index.html                  # плеер (каталог)
├── manifest.webmanifest        # PWA-манифест плеера
├── appboo-icon.svg
├── catalog.json                # каталог: записи {id, added, ...meta}, старые → новые
├── README.md
├── CONTRIBUTING.md             # конвенции, контракты, пайплайны
├── AGENTS.md                   # инструкция для ИИ-агентов: выкладка приложений
├── docs/
│   └── meta.template.json      # шаблон метаданных (строгий JSON)
├── scripts/
│   ├── validate.mjs            # проверка контракта: MUST → exit 1, SHOULD → warnings
│   ├── normalize.mjs           # идемпотентная нормализация + генерация catalog.json
│   └── backfill-dates.mjs      # разовый бэкфилл дат добавления (миграция 2026-11)
└── apps/
    └── <app>/
        ├── src/                # только код приложения
        │   ├── index.html      # точка входа (MUST)
        │   └── ...             # любые файлы/папки приложения
        └── meta/               # листинг для плеера (опционально)
            ├── meta.json
            ├── icon.svg
            └── screenshots/
                ├── screenshot-1.webp
                └── screenshot-2.webp
```

### Формат meta.json

Все пути — относительно папки `meta/`. Полный шаблон — `docs/meta.template.json`;
допуски и дефолты каждого поля — в [CONTRIBUTING.md](CONTRIBUTING.md).

```json
{
  "title": "Название",
  "description": "Короткое описание",
  "info": "Дополнительная информация",
  "icon": "icon.svg",
  "color": "#86C26B",
  "ai": "ChatGPT",
  "platform": "both",
  "tags": ["game", "tool"],
  "languages": ["ru"],
  "screenshots": ["screenshots/screenshot-1.webp", "screenshots/screenshot-2.webp"]
}
```

Значение `platform`: `desktop`, `mobile` или `both`. Значения `languages` —
коды ISO 639-1 в нижнем регистре.

`catalog.json` генерируется скриптом `scripts/normalize.mjs` из `meta.json`
приложений (добавляются `id` и `added` — дата регистрации); руками его не
редактируют. Плеер показывает из `added` только дату: `2026-11-17`.
