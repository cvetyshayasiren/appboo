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
| Pixel Metronome | Ретро-метроном с чиптюн-звуками и ритмическими паттернами | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/Pixel%20Metronome/) |
| WeatherGotchi | Карманный погодный питомец с живой погодой и пиксельной графикой | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/WeatherGotchi/) |
| WikiRand | Случайные статьи из Википедии по разделам | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/WikiRand/) |
| Обогреватель | Пиксельная новелла: греем батареи в панельке до приезда ремонтной бригады | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/heater/) |
| NumConverter | Конвертер систем счисления с механическими барабанами | [Открыть](https://cvetyshayasiren.github.io/appboo/apps/NumConverter/) |

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

## Каталог приложений

<!-- catalog:start -->
| | Приложение | Описание |
|---|---|---|
| <img src="https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Melody%20Machine/meta/icon.svg" width="32"> | [8-bit Melody Machine](https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Melody%20Machine/src/index.html) | Рандомный чиптюн |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Melody%20Machine%20v2/meta/icon.svg" width="32"> | [8-bit Melody Machine v2](https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Melody%20Machine%20v2/src/index.html) | Рандомный чиптюн v2 |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Music%20Maker/meta/icon.svg" width="32"> | [8-bit Music Maker](https://cvetyshayasiren.github.io/appboo/apps/8-bit%20Music%20Maker/src/index.html) | Редактор 8-bit музыки |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/color%20lab/meta/icon.svg" width="32"> | [Color Lab](https://cvetyshayasiren.github.io/appboo/apps/color%20lab/src/index.html) | Лаборатория цвета: конвертация HEX/RGB/HSL, генератор цветовых гармоний и проверка контраста WCAG. |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/CRT%C2%B7VIEW/meta/icon.svg" width="32"> | [CRT·VIEW](https://cvetyshayasiren.github.io/appboo/apps/CRT%C2%B7VIEW/src/index.html) | Просмотрщик изображений с эффектами |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/emoji-picker/meta/icon.svg" width="32"> | [Эмодзиатор](https://cvetyshayasiren.github.io/appboo/apps/emoji-picker/src/index.html) | Пикер эмодзи |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/FFMPEGo/meta/icon.svg" width="32"> | [FFMPEGo](https://cvetyshayasiren.github.io/appboo/apps/FFMPEGo/src/index.html) | Браузерный конвертер на ffmpeg.wasm. Всё работает локально в браузере |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/fractal%20book/meta/icon.svg" width="32"> | [ФРАКТАЛБУК](https://cvetyshayasiren.github.io/appboo/apps/fractal%20book/src/index.html) | Старинная магическая книга живых фракталов |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/heater/meta/icon.svg" width="32"> | [Обогреватель](https://cvetyshayasiren.github.io/appboo/apps/heater/src/index.html) | Пиксельная визуальная новелла: бегайте по квартирам панельного дома, стучите по остывающим батареям и берегите тепло до приезда ремонтной бригады. |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/keyboardNotes/meta/icon.svg" width="32"> | [Клавиатурные заметки](https://cvetyshayasiren.github.io/appboo/apps/keyboardNotes/src/index.html) | Заметки поверх раскладки |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/kolagen/meta/icon.svg" width="32"> | [KOLaGEN](https://cvetyshayasiren.github.io/appboo/apps/kolagen/src/index.html) | Генератор кольев |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/lostWorlds/meta/icon.svg" width="32"> | [Lost Worlds](https://cvetyshayasiren.github.io/appboo/apps/lostWorlds/src/index.html) | Полароид-архив несуществующих миров: процедурные пиксельные снимки случайных миров с редактором параметров, локами, сидами, ссылками, историей снимков, экспортом PNG и эмбиент-звуком. |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/lostWorlds2/meta/icon.svg" width="32"> | [Lost Worlds v2](https://cvetyshayasiren.github.io/appboo/apps/lostWorlds2/src/index.html) | Вторая версия полароид-архива несуществующих миров: система редкостей из 10 уровней — от обычной до сингулярности, частицы у редких снимков, анимация проявки полароида и обновлённый звук. |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/memory%20game/meta/icon.svg" width="32"> | [Мгновенная память](https://cvetyshayasiren.github.io/appboo/apps/memory%20game/src/index.html) | пиксель·ASCII консоль |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/NumConverter/meta/icon.svg" width="32"> | [NumConverter](https://cvetyshayasiren.github.io/appboo/apps/NumConverter/src/index.html) | Механический конвертер систем счисления от 2 до 36 с барабанами-одометрами и тремя темами оформления. |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/PIXEL%20LAB/meta/icon.svg" width="32"> | [PIXEL LAB](https://cvetyshayasiren.github.io/appboo/apps/PIXEL%20LAB/src/index.html) | Пиксель-арт редактор |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/Pixel%20Metronome/meta/icon.svg" width="32"> | [Pixel Metronome](https://cvetyshayasiren.github.io/appboo/apps/Pixel%20Metronome/src/index.html) | Пиксельный метроном с чиптюн-звуками и ритмическими паттернами |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/PixelForge/meta/icon.svg" width="32"> | [PixelForge](https://cvetyshayasiren.github.io/appboo/apps/PixelForge/src/index.html) | Студия пиксель-арта и цветовых палитр |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/pokegame/meta/icon.svg" width="32"> | [Покемоны Пороховых](https://cvetyshayasiren.github.io/appboo/apps/pokegame/src/index.html) | Лови, сражайся, собирай |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/pokegen/meta/icon.svg" width="32"> | [Покеген](https://cvetyshayasiren.github.io/appboo/apps/pokegen/src/index.html) | Генератор покевайба |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/scroll/meta/icon.svg" width="32"> | [СКРОЛЛ](https://cvetyshayasiren.github.io/appboo/apps/scroll/src/index.html) | Это соцсеть, которая проверяет, что ты реально видишь в ленте. Посты бесконечны и каждый запуск уникален. Скоро тебе напишет незнакомец… |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/Standard%20Model/meta/icon.svg" width="32"> | [Стандартная модель](https://cvetyshayasiren.github.io/appboo/apps/Standard%20Model/src/index.html) | Интерактивная карта элементарных частиц |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/Standard%20Model%20v2/meta/icon.svg" width="32"> | [Стандартная модель v2](https://cvetyshayasiren.github.io/appboo/apps/Standard%20Model%20v2/src/index.html) | Интерактивная карта элементарных частиц |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/STYLE%20LAB/meta/icon.svg" width="32"> | [STYLE LAB](https://cvetyshayasiren.github.io/appboo/apps/STYLE%20LAB/src/index.html) | Интерактивный стенд: один тестовый экран — четырнадцать визуальных стилей. Чистые HTML/CSS/JS |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/wars%20graffiti/meta/icon.svg" width="32"> | [Граффити-войны](https://cvetyshayasiren.github.io/appboo/apps/wars%20graffiti/src/index.html) | Город поделён на районы. Команды А Б закрашивают всё подряд. Ты — уличный художник: перекрывай чужие теги своим и верни стены городу. Смена длится 3 минуты — обгони обе команды. |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/weather%20warden/meta/icon.svg" width="32"> | [Погодный страж](https://cvetyshayasiren.github.io/appboo/apps/weather%20warden/src/index.html) | Хранитель погоды над маленьким островом |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/WeatherGotchi/meta/icon.svg" width="32"> | [WeatherGotchi](https://cvetyshayasiren.github.io/appboo/apps/WeatherGotchi/src/index.html) | Карманный погодный питомец: тамагочи с живой погодой и пиксельной графикой. |
| <img src="https://cvetyshayasiren.github.io/appboo/apps/WikiRand/meta/icon.svg" width="32"> | [WikiRand](https://cvetyshayasiren.github.io/appboo/apps/WikiRand/src/index.html) | Случайные статьи из Википедии по разделам: наука, искусство или своя тема. |
<!-- catalog:end -->
