# 🎨 AppBoo

Сборник веб-приложений, опубликованных на GitHub Pages. Можно сразу открыть каталог и пользоваться приложениями в браузере — локальный сервер и установка не нужны.

**[Открыть AppBoo — основной каталог](https://cvetyshayasiren.github.io/appboo/)**

## Каталог приложений

Все ссылки ведут непосредственно на соответствующие приложения.

| Приложение | Описание | Открыть |
|---|---|---|
| Клавиатурные заметки | Заметки поверх раскладки | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/keyboardNotes/) |
| Покемоны Пороховых | Лови, сражайся, собирай | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/pokegame/) |
| Покеген | Генератор покевайба | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/pokegen/) |
| KOLaGEN | Генератор кольев | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/kolagen/) |
| 8-bit Music Maker | Редактор 8-bit музыки | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Music%20Maker/) |
| 8-bit Melody Machine | Рандомный чиптюн | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Melody%20Machine/) |
| 8-bit Melody Machine v2 | Рандомный чиптюн v2 | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Melody%20Machine%20v2/) |
| СКРОЛЛ | Лента, которая проверяет, что ты реально видишь | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/scroll/) |
| Мгновенная память | Пиксель·ASCII консоль | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/memory%20game/) |
| Граффити-войны | Перекрывай чужие теги, верни стены городу | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/wars%20graffiti/) |
| PIXEL LAB | Пиксель-арт редактор | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/PIXEL%20LAB/) |
| CRT·VIEW | Просмотрщик изображений с эффектами | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/CRT%C2%B7VIEW/) |
| ФРАКТАЛБУК | Книга живых фракталов | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/fractal%20book/) |
| Стандартная модель | Карта элементарных частиц | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/Standard%20Model/) |
| Стандартная модель v2 | Карта элементарных частиц, вторая версия | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/Standard%20Model%20v2/) |
| PixelForge | Студия пиксель-арта и палитр | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/PixelForge/) |
| Погодный страж | Хранитель погоды над маленьким островом | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/weather%20warden/) |
| STYLE LAB | Один экран — четырнадцать визуальных стилей | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/STYLE%20LAB/) |
| FFMPEGo | Браузерный конвертер на ffmpeg.wasm | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/FFMPEGo/) |
| Эмодзиатор | Пикер эмодзи | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/emoji-picker/) |
| Color Lab | Инструменты для работы с цветом | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/color%20lab/) |

## Как устроен проект

Каждое приложение находится в отдельной папке внутри `apps/`. Общий каталог собирает список из `apps/apps.json`, а карточки приложений используют собственные файлы `meta.json`.

## Структура проекта

```
appboo/
├── index.html            каталог и плеер
├── template_meta.json    шаблон метаданных
└── apps/
    ├── apps.json         список приложений, старые → новые
    └── <app>/
        ├── index.html
        ├── meta.json
        └── icon.svg
```

### Формат meta.json

```json
{
  "title": "Название",
  "description": "Короткое описание",
  "info": "Дополнительная информация",
  "icon": "icon.svg",
  "color": "#86C26B",
  "ai": "ChatGPT",
  "platform": "both",
  "tags": ["game", "tool"]
}
```

Значение `platform`: `desktop`, `mobile` или `both`.
