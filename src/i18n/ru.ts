// src/i18n/ru.ts
/**
 * RU column (design-i18n-notes.md §4, §1.6; DEC-020: RU is the default and canonical
 * language). Lazy chunk: the only importer is the dynamic import in ./locale.ts (R2).
 *
 * Typography law applied verbatim: «» quotes (nested „“); an em dash is always preceded by
 * NO-BREAK SPACE, written as \u00A0 so it survives editors and transport; en dash in
 * ranges; «ё» everywhere; key names, identifiers, paths and source labels stay Latin; ISO
 * dates in both languages; «±24» closed up, «≥ 1» spaced. A number and its unit are joined
 * by NO-BREAK SPACE. Token names are identical to the EN column: the RU column may move an
 * interpolation point (nouns first) but never renames it (R5, §8).
 *
 * Orchestrator corrections against the specialist draft: notes.failNoProvenance demarcates
 * the opaque id with «» (the EN value quotes it; the RU typographic law supplies the
 * quotes); the flag-note tails of notes.formulaWindows / notes.formulaPartTotal are legend
 * annotations, not string content — the values equal the EN bytes.
 */

import type { Dictionary } from './keys';

export const ru = {
  'chrome.titleMain': 'Зимний дворец в браузере',
  'chrome.descriptionMain':
    'Стилизованная 3D-реконструкция Зимнего дворца (Эрмитаж, Санкт-Петербург), ' +
    'освещённая настоящим петербургским небом.',
  'chrome.wordmark': 'Зимний дворец',
  'chrome.notesLink': 'Как это устроено\u00A0→',
  'chrome.travelHint': 'Нажимайте стрелки, чтобы идти · потяните, чтобы осмотреться',
  'chrome.doorEnter': 'Войти',
  'chrome.doorBack': 'Назад',
  'chrome.toggleLabel': 'EN',
  'chrome.toggleAria': 'English',
  'chrome.scrubLabel': 'Петербургское время, ±24\u00A0часа от времени сцены',
  'chrome.scrubHelp':
    'Стрелки\u00A0— шаг в минуту; PageUp и PageDown\u00A0— шаг в час; Home и End\u00A0— ' +
    'границы окна; Escape\u00A0— отмена; N\u00A0— вернуться к текущему моменту.',
  'chrome.sceneHelp':
    'Прокручивайте, перетаскивайте или нажимайте стрелки, чтобы двигаться по маршруту ' +
    'от остановки к остановке.',
  'chrome.canvasLabel': 'Прогулка по Зимнему дворцу',
  'chrome.descriptionNotes':
    'Как генерируется южный фасад Зимнего дворца: замороженная спецификация, числа из ' +
    'источников и принятые значения, набор деталей и проекция бюджета.',
  'chrome.backLink': '←\u00A0Дворцовая площадь',
  'chrome.noscriptNotes':
    'Для чисел нужен JavaScript: при загрузке страница заново запускает решатель фасада.',
  'chrome.seasonLabel': 'Время года сцены',
  'chrome.seasonHelp':
    'Выбор времени года переносит дату сцены, сохраняя время суток; «Сейчас»\u00A0— ' +
    'вернуться к текущему моменту.',
  'chrome.seasonNow': 'Сейчас',
  'chrome.seasonWinter': 'Зима',
  'chrome.seasonSpring': 'Весна',
  'chrome.seasonSummer': 'Лето',
  'chrome.seasonAutumn': 'Осень',
  'chrome.touchRailLabel': 'Движение по маршруту',
  'chrome.touchRailBack': 'Назад',
  'chrome.touchRailForward': 'Вперёд',
  'chrome.travelHintTouch': 'Нажмите «Назад» или «Вперёд», чтобы двигаться.',
  'chrome.sceneUnsupported': 'Для просмотра нужен браузер с поддержкой WebGL2.',
  'chrome.sceneInterrupted': 'Сцена недоступна. Перезагрузите страницу.',
  'chrome.sceneReload': 'Перезагрузить',
  // Линия загрузки (design-load-line.md, R23-ux): стадия под заголовком чёрной карточки —
  // глагол стадии, живая пара байтов, глагол сборки; строка отказа — та же честность
  // (цепочка прервалась, а карточка молчала бы навсегда). Регистр «мы» — как на странице
  // «Как это устроено»; токены — форматированные байты из formatByteProgress.
  'chrome.load.open': 'Загружаем зал',
  'chrome.load.bytes': 'Загружаем зал · {received} из {total}',
  'chrome.load.assemble': 'Собираем зал · {total}',
  'chrome.load.failed': 'Зал не открылся · обновите страницу',
  'index.open': 'Залы',
  'index.title': 'Залы',
  'index.current': 'Текущий зал',

  'caption.s0': 'фасад и свет',
  'caption.s1': 'арка раскрывается',
  'caption.g0': 'темно; площадь позади',
  'caption.gj': 'Поворот на восток: пилястра за пилястрой — сорок метров до дальней двери.',
  'caption.g1': 'сжатие',
  'caption.g2': 'дверь (шлюз)',
  'caption.m0': 'Порог: длинный вид на юг, к портретам героев 1812 года.',
  'caption.m1': 'Западная стена\u00A0— блок портретов в\u00A0золочёных рамах.',
  'caption.m2': 'Фонарь\u00A0— свод и\u00A0переплёты остекления над\u00A0галереей.',
  'caption.m3': 'Монархи\u00A0— торцевая стена: большие портреты над\u00A0малыми.',
  'caption.m4': 'Двери закрыты: за\u00A0дверями\u00A0— Георгиевский зал.',
  'caption.j0': 'взгляд вверх, к свету',
  'caption.j1': 'лестничный марш',
  'caption.j1b':
    'Светильник верхнего марша виден через пролёт: Растрелли освещает поворот заранее.',
  'caption.j2': 'Площадка: лестница раздваивается; марши сойдутся под расписным плафоном.',
  'caption.j2b': 'Верхний ярус окон: невский свет входит высоко и ведёт последний марш.',
  'caption.j3':
    'У самого верха восточный портал встаёт прямо перед глазами: дверь в парадные залы, в золочёной раме между колоннами серого гранита.',
  'caption.j4': 'прибытие; портал (шлюз на лестничной площадке)',

  'notes.title': 'Как устроен южный фасад',
  'notes.intro':
    'Каждое число на этой странице вычисляется при загрузке тем же чистым решателем, ' +
    'который приложение запускает над своей замороженной спецификацией фасада ' +
    '(decisions.md, DEC-004). Это не обмер. Три рода чисел разведены системой типов ' +
    'и помечены здесь:',
  // §3.1: список трёх родов — легенда чипов; слово рода несёт чип, значение — остаток фразы.
  'notes.kindSourced':
    'число несёт ключ атрибуции в ATTRIBUTIONS.md ' + '(«нет строки\u00A0— нет использования»).',
  'notes.kindDeclared':
    'рабочее целевое значение, снятое с фотографий и зарегистрированное ' +
    'в docs/artistic-license.md; на этапе 1 сверяется с обмерными чертежами фасадов и, ' +
    'если чертежи с ним расходятся, исправляется в обоих местах.',
  'notes.kindDerived':
    'вычислено решателем из чисел двух предыдущих родов ' +
    '(docs/design-facade-grammar.md); пересчитывается при каждой загрузке, никогда ' +
    'не регистрируется.',

  'notes.shellHeading': 'Каре',
  'notes.shellIntro':
    'Числа каре\u00A0— такими, как их дают источники. Там, где два источника расходятся, ' +
    'сохраняются оба подсчёта, каждый под своим ключом.',
  'notes.shellNorthLength': 'Длина северного (Невского) фасада',
  'notes.shellWestLength': 'Длина западного (Адмиралтейского) фасада',
  'notes.shellWindowsConservative': 'Окна, нижняя оценка',
  'notes.shellWindowsGenerous': 'Окна, верхняя оценка',
  'notes.shellRoomsConservative': 'Комнаты, нижняя оценка',
  'notes.shellRoomsGenerous': 'Комнаты, верхняя оценка',
  'notes.shellStaircases': 'Лестницы',
  'notes.shellCorniceHeight': 'Высота до карниза',
  'notes.shellTotalHeight': 'Полная высота с кровельным поясом',
  'notes.shellPrincipalFacade': 'Главный фасад, включая скульптуру по линии кровли',
  'notes.shellCorners': 'Углы, включая все выступы',
  'notes.shellRoofStatuary': 'Скульптуры на кровле',

  'notes.decorHeading': 'Окна, декор и ордер',
  'notes.decorIntro':
    'Каталог из источника (Алексеева через wiki-ru) воспроизведён как система модулей ' +
    'и ритм колонн, а не один к одному: числа ниже\u00A0— каталожные, а набор деталей ' +
    'моделирует меньшее стилизованное множество (реестр художественных допущений, ' +
    '«Каталог окон и декора»).',
  'notes.decorWidthModules': 'Модули ширины окон',
  'notes.decorWindowTypes': 'Типы окон',
  'notes.decorSurroundTypes': 'Типы наличников',
  'notes.decorSculpturalTypes': 'Типы скульптурного декора',
  'notes.decorCapitalVarieties': 'Разновидности капителей',
  'notes.decorCartoucheKinds': 'Виды картушей',

  'notes.orderCaption': 'Ордерная система',
  'notes.orderColFact': 'Факт',
  'notes.orderColValue': 'Значение',
  'notes.orderColonnadeTiers': 'Ярусы приставной колоннады',
  'notes.orderArrangement': 'Расстановка колонн',
  'notes.orderCapitalFamily': 'Семейство капителей',
  'notes.orderWallColour': 'Цвет стен',

  'notes.windowRowsCaption': 'Ряды окон, снизу вверх',
  'notes.windowRowsColRow': 'Ряд',
  'notes.windowRowsColTier': 'Ярус',
  'notes.windowRowsColModule': 'Модуль',
  'notes.windowRowsColHeadHeight': 'Принятая отметка верха окна',

  'notes.southHeading': 'Южный фасад\u00A0— Дворцовая площадь, запад → восток',
  'notes.southMainLine': 'Основная линия фасада',
  'notes.southCreaseLine': 'Ломаная линия, включая изломы ризалитов',
  'notes.southDeclaredPitch': 'Принятый рабочий шаг осей',
  'notes.southDerivedPitch': 'Расчётный шаг осей',
  'notes.southDerivedCrease': 'Расчётная ломаная линия',

  'notes.sectionsCaption': 'Секции, запад → восток; примечания\u00A0— из замороженной спецификации',
  'notes.sectionsColSection': 'Секция',
  'notes.sectionsColKind': 'Тип',
  'notes.sectionsColAxes': 'Принятые оси',
  'notes.sectionsColProtrusion': 'Принятый вынос',
  'notes.sectionsColNote': 'Примечание',

  'notes.countWindowAxes': 'Оконные оси',
  'notes.countWindowSlots': 'Оконные слоты',
  'notes.countWindows': 'Окна',
  'notes.countPortalVoidCells': 'Пустые ячейки портала',
  'notes.countColumnShafts': 'Стволы колонн',

  'notes.creaseCallout':
    'Ломаная линия: в спецификации стоит {specCrease}\u00A0м (источник\u00A0— wiki-en, ' +
    '«principal facade», со ссылкой на Budberg, Great Palaces: The Winter Palace, 1969; ' +
    'русскоязычная традиция читает ту же кромку как 210\u00A0м); решатель выводит ' +
    '{derivedCrease}\u00A0м из основной линии и принятых выносов ризалитов. Две длины ' +
    'из источников, скорее всего, измеряют одну и ту же уличную кромку в разных ' +
    'конвенциях источников, а не линию плана против ломаной; принятый ритм осей ' +
    '(7 + 20 + 8 + 20 + 7) и расчётная величина не имеют оцифрованного подтверждения ' +
    '(поиск по литературе закрыт 2026-10-17). Разрешить вопрос могут только обмерные ' +
    'чертежи\u00A0— РГИА ф.\u00A0485, скан из Альбертины или Пилявский через НЭБ,\u00A0— ' +
    'поэтому до тех пор это предупреждение остаётся в силе, а спецификация и реестр ' +
    'художественных допущений («Приближения размеров») будут исправлены, если документы ' +
    'разойдутся.',
  'notes.creaseWarning':
    'расчётная длина ломаной {derived}\u00A0м отличается от принятой {declared}\u00A0м',
  'notes.solverWarning': 'Решатель: {message}',

  'notes.kitHeading': 'Набор деталей',
  'notes.kitIntro':
    'Детали, которые решатель разместил на южном фасаде; слоты набора без размещений ' +
    'опущены. Потолки треугольников\u00A0— максимумы набора на один экземпляр, поэтому ' +
    'итоги по деталям\u00A0— это потолки, а не измеренные количества.',
  'notes.kitColPart': 'Деталь',
  'notes.kitColInstances': 'Экземпляры',
  'notes.kitColCeilingPerInstance': 'Потолок треугольников на экземпляр',
  'notes.kitColPartTotal': 'Итого по детали',
  'notes.kitTotalRow': 'Итого\u00A0— активных деталей: {activeParts}',
  // §3.3: блок ссылок — подвал со своим заголовком; §3.3 метка открытого вопроса; §3.4
  // маржи живут на строках бюджета, в callout остаются потолки и политика.
  'notes.sourcesHeading': 'Источники и документы',
  'notes.openQuestion': 'Открытый вопрос',

  'notes.budgetHeading': 'Проекция бюджета',
  'notes.budgetFacadeDraws': 'Вызовы отрисовки фасада',
  'notes.budgetFrameDraws': 'Вызовы отрисовки за кадр',
  'notes.budgetFrustumTriangles': 'Треугольники в пирамиде видимости',
  'notes.budgetSubmittedCeiling': 'Потолок отправляемых треугольников',
  'notes.budgetJsGzip': 'JavaScript gzip',
  'notes.budgetCallout':
    'Контрактные потолки, проверяемые в CI: вызовов отрисовки за кадр\u00A0— не более ' +
    '{frameDraws}, треугольников в пирамиде видимости\u00A0— не более {frustumTriangles}, ' +
    'JavaScript gzip\u00A0— не более {gzipBytes}\u00A0Б. Превышение устраняют изменением арта ' +
    'или уровня детализации\u00A0— и никогда изменением числа.',
  // §3.4: проекционные числа переехали на строки бюджета приглушёнными суффиксами «запас»;
  // ожидающий замер — прочерк со примечанием рядом.
  'notes.marginSuffix': 'запас\u00A0{margin}',
  'notes.pending': 'ожидает замера в CI',

  'notes.allowanceIntro':
    'Резерв на сцену\u00A0— принятые рабочие оценки того, во что обходится остальной ' +
    'кадр (массинг раунда 7: 12 боксов + плоскость земли; небесный купол; один теневой ' +
    'проход; прочие вызовы отрисовки). Это входные данные проекции, а не измерения.',
  'notes.allowanceCaption': 'Резерв на сцену',
  'notes.allowanceColAllowance': 'Статья',
  'notes.allowanceColValue': 'Значение',
  'notes.allowanceShadowPasses': 'Теневые проходы',
  'notes.allowanceOtherDraws': 'Прочие вызовы отрисовки за кадр',
  'notes.allowanceMassingTriangles': 'Треугольники массинга',
  'notes.allowanceSkyTriangles': 'Треугольники неба',

  'notes.siblingsHeading': 'Соседние фасады\u00A0— не входят в Фазу\u00A01',
  'notes.siblingsIntro':
    'Северный, западный и восточный фасады позже переиспользуют тот же набор деталей. ' +
    'Их числа осей только приняты (реестр художественных допущений, «Число осей ' +
    'фасадов») и хранятся затем, чтобы в тестах сходилась арифметика плана; длины ' +
    'основных линий\u00A0— это числа каре, приведённые выше.',
  'notes.siblingsColFacade': 'Фасад',
  'notes.siblingsColSections': 'Секции\u00A0— тип · принятые оси',
  'notes.siblingsColAxes': 'Принятые оси',
  'notes.siblingsColCharacter': 'Характер',
  'notes.siblingsSectionCell': '{id} ({kind}) {axes}',
  'notes.siblingsAxesCell': '{axes} (±1 на секцию)',

  'notes.formulaWindowAxes': 'Σ declaredAxes по пяти секциям',
  'notes.formulaCreaseLine':
    'основная линия + внутренние изломы ризалитов из принятых выносов (решатель)',
  'notes.formulaPitch': '{length}\u00A0м / {axes} осей',
  'notes.formulaSlots': '{axes} осей × {rows} рядов',
  'notes.formulaWindows': 'windowSlots − portalVoidCells',
  'notes.formulaVoidCells': 'слоты, вытесненные арками входа и портала (решатель)',
  'notes.formulaShafts': 'Σ KIT.shaftCount × instances по деталям-колоннам (решатель)',
  'notes.formulaFrustum': 'набор {kit} + массинг {massing} + небо {sky}',
  'notes.formulaSubmitted': 'frustumTriangles × (1 + {shadowPasses}) за счёт теневых проходов',
  'notes.formulaPartTotal': 'counts.byPart × KIT.triangleCeiling',
  'notes.formulaKitCeiling': 'Σ по размещённым деталям',
  'notes.formulaInstances': 'Σ counts.byPart',
  'notes.formulaActiveParts': 'детали с ≥\u00A01 экземпляром',
  'notes.formulaGzip': 'замер gzip в CI, переданный через allowance.measuredJsGzipBytes',
  'notes.formulaFacadeDraws':
    'projectBudget: инстансированные вызовы отрисовки активных деталей по всем проходам',
  'notes.formulaFrameDraws': 'facadeDrawCalls + прочие вызовы отрисовки ({otherDraws})',

  'notes.failUnregistered': 'не зарегистрировано: {id}',
  'notes.failNoProvenance': 'у отображаемого числа «{id}» нет записи в реестре происхождения',

  'notes.chipSourced': 'источник · {keys}',
  'notes.chipDeclared': 'принято · {licenseTitle}',
  'notes.chipDerived': 'расчёт',
  // §3.1: «голые» слова родов для легенды (чип без данных происхождения).
  'notes.chipWordSourced': 'источник',
  'notes.chipWordDeclared': 'принято',
  'notes.chipWordDerived': 'расчёт',
  'notes.chipTitleKeys': 'ключи: {keys}',
  'notes.chipTitleRegister': 'строка реестра: {licenseTitle}',
  'notes.errorTitle': 'Примечания к фасаду недоступны',
  'notes.errorIntro': 'Спецификация фасада не сходится. {issues}',

  'data.titleGallery': 'Галерея Растрелли\u00A0— путь внутрь',
  'data.title1812': 'Военная галерея 1812\u00A0года\u00A0— через Гербовый зал',
  'data.titleJordan': 'Иорданская лестница\u00A0— подъём',
  'data.titleSquare': 'Дворцовая площадь',
  'data.kindCornerRisalit': 'угловой ризалит',
  'data.kindStretch': 'прясло',
  'data.kindCentralPortal': 'центральный портал',
  'data.arrangementBunchAtCorners': 'пучки на углах',
  'data.arrangementPairAtPortals': 'пары у порталов',
  'data.arrangementPairPiers': 'пары на простенках между группами окон',
  'data.capitalFamily': 'коринфско-композитная (стилизованная, единый архетип)',
  'data.wallColour':
    'бледно-зелёные стены, белые ордер и обрамления\u00A0— решение владельца по палитре ' +
    '(decisions.md)',
  'data.characterSouth':
    'Фасад на Дворцовую площадь: три ризалита, трёхарочный проезд ' +
    '(wiki-ru, visit-petersburg).',
  'data.characterNorth': 'Сплошная колоннада к Неве (visit-petersburg).',
  'data.characterWest':
    'Композиция загородного дворца со стороны Адмиралтейства (visit-petersburg).',
  'data.characterEast': 'Массивные крылья вокруг служебного двора (visit-petersburg).',
  'data.characterShortSouth': 'парадный',
  'data.characterShortNorth': 'речной',
  'data.characterShortWest': 'усадебный',
  'data.characterShortEast': 'служебный',
  'data.southNoteSwCorner':
    'Юго-западный угловой массив: собственный арочный портал с гигантскими колоннами ' +
    'и балконом, пучки колонн на углу; выступает к площади.',
  'data.southNoteWestStretch':
    'Гладкий участок: оконные оси с парами колонн на простенках через каждый ~4-й шаг осей.',
  'data.southNotePortal':
    'Парадный проезд: три въездные арки (вход во двор), гигантские колонны, фронтон ' +
    'с часами и картушем с орлом\u00A0— стрельнинский приём.',
  'data.southNoteEastStretch': 'Зеркало западного участка.',
  'data.southNoteSeCorner':
    'Юго-восточный угловой массив: портал с гигантскими колоннами и картушем; за этим ' +
    'концом поднимается купол дворцовой церкви.',
  'data.siblingNoteNevaCorner': 'Угловой массив со стороны Невы (принято).',
  'data.siblingNoteColonnade': 'Характер сплошной колоннады (visit-petersburg).',
  'data.siblingNoteCentralPavilionPortals':
    'Центральный павильон (принято; арочные порталы во двор).',
  'data.siblingNoteMirrorRun': 'Зеркальный участок (принято).',
  'data.siblingNoteMillionnaya':
    'В сторону Миллионной улицы; массивные корпуса (visit-petersburg).',
  'data.siblingNoteCentralPavilion': 'Центральный павильон (принято).',
  'credits.gallery1812.canvases':
    'Холсты: репродукции портретов Военной галереи (Джордж Доу и мастерская, 1819–1828; ' +
    'Крюгер; Крафт) из общественного достояния, Викисклад.',
} satisfies Dictionary;
