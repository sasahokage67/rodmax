import { Language } from './types';
import { RarityType, FishItem } from '../types';

export const RARITY_TRANSLATIONS: Record<Language, Record<RarityType, string>> = {
  ru: {
    COMMON: 'ОБЫЧНЫЙ',
    UNCOMMON: 'НЕОБЫЧНЫЙ',
    RARE: 'РЕДКИЙ',
    EPIC: 'ЭПИЧЕСКИЙ',
    MYTHIC: 'МИФИЧЕСКИЙ',
    SECRET: 'СЕКРЕТНЫЙ',
    GODLY: 'БОЖЕСТВЕННЫЙ',
    ARCANE: 'АРКАННЫЙ'
  },
  en: {
    COMMON: 'COMMON',
    UNCOMMON: 'UNCOMMON',
    RARE: 'RARE',
    EPIC: 'EPIC',
    MYTHIC: 'MYTHIC',
    SECRET: 'SECRET',
    GODLY: 'GODLY',
    ARCANE: 'ARCANE'
  }
};

export const FISH_TRANSLATIONS: Record<string, { name: Record<Language, string>; description: Record<Language, string> }> = {
  boot: {
    name: {
      ru: 'СТАРЫЙ САПОГ',
      en: 'OLD LEATHER BOOT'
    },
    description: {
      ru: 'Утонувший резиновый сапог незадачливого рыболова. Есть нельзя, но старьевщики скупают на утилизацию.',
      en: 'Sunken boot of an unlucky angler. Inedible, but scrap scavengers purchase it for recycling.'
    }
  },
  salmon: {
    name: {
      ru: 'СЕРЕБРИСТЫЙ ЛОСОСЬ',
      en: 'SILVER CHASM SALMON'
    },
    description: {
      ru: 'Быстрая океаническая рыба с переливающейся чешуей. Активно сопротивляется при поклевке.',
      en: 'Swift oceanic game fish with iridescent scales. Energetically resists during the strike.'
    }
  },
  goldfish: {
    name: {
      ru: 'ПУЗАТЫЙ ЗОЛОТОЙ КАРАСЬ',
      en: 'FAT GOLDEN CARP'
    },
    description: {
      ru: 'Необычайно крупная золотая рыба с фиолетовым мерцанием. Удивительно выносливый боец.',
      en: 'Unusually massive golden fish with violet luminescence. Surprisingly resilient fighter.'
    }
  },
  anglerfish: {
    name: {
      ru: 'ГЛУБИННЫЙ УДИЛЬЩИК',
      en: 'ABYSSAL ANGLERFISH'
    },
    description: {
      ru: 'Обитатель полуночных океанических впадин. Алый биолюминесцентный фонарь гипнотизирует добычу.',
      en: 'Resident of midnight ocean trenches. Crimson bioluminescent lure hypnotizes prey in total darkness.'
    }
  },
  megalodon: {
    name: {
      ru: 'ДОИСТОРИЧЕСКИЙ МЕГАЛОДОН',
      en: 'PREHISTORIC MEGALODON'
    },
    description: {
      ru: 'Древний мифический сверххищник морей. Невероятно стремительный колосс, мгновенно рвущий леску при малейшей ошибке.',
      en: 'Ancient mythical apex predator of the seas. Lightning-fast colossus that instantly snaps line upon slightest hesitation.'
    }
  },
  sea_serpent: {
    name: {
      ru: 'ЛЕВИАФАН БЕЗДНЫ',
      en: 'ABYSSAL LEVIATHAN'
    },
    description: {
      ru: 'Тайная сущность, спящая под океанической корой. Шанс поклевки ровно 2.0%. Легендарная глубоководная добыча.',
      en: 'Secret entity slumbering beneath oceanic tectonic crust. Bite chance exactly 2.0%. Legendary deep-sea trophy.'
    }
  },
  celestial_whale: {
    name: {
      ru: 'СОЛНЕЧНЫЙ НЕБЕСНЫЙ КИТ',
      en: 'SOLAR CELESTIAL WHALE'
    },
    description: {
      ru: 'Божественный белый левиафан с ореолом солнечных рун. Редчайший шанс 0.8%. Всплывает лишь во время затмений.',
      en: 'Godly white leviathan haloed by solar runes. Ultra-rare 0.8% bite chance. Surfaces solely during solar eclipses.'
    }
  },
  arcane_jellyfish: {
    name: {
      ru: 'АРКАННАЯ НЕОНОВАЯ МЕДУЗА',
      en: 'ARCANE NEON JELLYFISH'
    },
    description: {
      ru: 'ВЕРХОВНЫЙ ТРОФЕЙ ВСЕЛЕННОЙ (0.2%). Заряжена чистой арканной плазмой первородного океана. Самый дорогой и редчайший улов в RODMAX.',
      en: 'SUPREME TROPHY OF THE UNIVERSE (0.2%). Charged with pure arcane plasma from the primordial sea. The rarest and highest value catch in RODMAX.'
    }
  }
};

export const AVATAR_TRANSLATIONS: Record<string, { name: Record<Language, string>; role: Record<Language, string> }> = {
  cyber_angler: {
    name: { ru: 'Кибер-Водолаз', en: 'Cyber-Diver' },
    role: { ru: 'ЛЕГЕНДАРНЫЙ ГЛУБИННИК', en: 'LEGENDARY DEEP-DIVER' }
  },
  neon_predator: {
    name: { ru: 'Био-Хищник Неона', en: 'Neon Bio-Predator' },
    role: { ru: 'КИБЕР-МУТАНТ', en: 'CYBER MUTANT' }
  },
  arcane_jellyfish: {
    name: { ru: 'Неоновая Медуза', en: 'Neon Jellyfish' },
    role: { ru: 'ВЫСШИЙ АРКЕЙН', en: 'SUPREME ARCANE' }
  },
  celestial_whale: {
    name: { ru: 'Небесный Кит', en: 'Celestial Whale' },
    role: { ru: 'БОЖЕСТВЕННЫЙ ТИР', en: 'GODLY TIER' }
  },
  sea_serpent: {
    name: { ru: 'Морской Змей', en: 'Sea Serpent' },
    role: { ru: 'СЕКРЕТ БЕЗДНЫ', en: 'ABYSS SECRET' }
  },
  megalodon: {
    name: { ru: 'Древний Мегалодон', en: 'Ancient Megalodon' },
    role: { ru: 'МИФИЧЕСКИЙ СВЕРХХИЩНИК', en: 'MYTHIC APEX PREDATOR' }
  },
  anglerfish: {
    name: { ru: 'Глубоководный Удильщик', en: 'Deepsea Anglerfish' },
    role: { ru: 'ЭПИЧЕСКИЙ ОХОТНИК ТЕМНОТЫ', en: 'EPIC DARK HUNTER' }
  },
  goldfish: {
    name: { ru: 'Золотая Рыбка', en: 'Golden Fish' },
    role: { ru: 'РЕДКИЙ ТРОФЕЙ', en: 'RARE TROPHY' }
  },
  salmon: {
    name: { ru: 'Глубинный Лосось', en: 'Chasm Salmon' },
    role: { ru: 'НЕОБЫЧНЫЙ ЛОВЕЦ', en: 'UNCOMMON RUNNER' }
  },
  boot: {
    name: { ru: 'Легендарный Сапог', en: 'Legendary Boot' },
    role: { ru: 'КЛАССИКА РЫБАЛКИ', en: 'ANGLER CLASSIC' }
  }
};

export const getAvatarName = (id: string, defaultName: string, lang: Language): string => {
  return AVATAR_TRANSLATIONS[id]?.name[lang] || defaultName;
};

export const getAvatarRole = (id: string, defaultRole: string, lang: Language): string => {
  return AVATAR_TRANSLATIONS[id]?.role[lang] || defaultRole;
};

export const getFishName = (fish: FishItem | { id: string; name?: string }, lang: Language): string => {
  const trans = FISH_TRANSLATIONS[fish.id];
  if (trans) return trans.name[lang];
  return fish.name || fish.id;
};

export const getFishDescription = (fish: FishItem | { id: string; description?: string }, lang: Language): string => {
  const trans = FISH_TRANSLATIONS[fish.id];
  if (trans) return trans.description[lang];
  return ('description' in fish && fish.description) || '';
};

export const getRarityName = (rarity: RarityType, lang: Language): string => {
  return RARITY_TRANSLATIONS[lang]?.[rarity] || rarity;
};

export const TRANSLATIONS = {
  ru: {
    // Navbar
    'nav.brandSubtitle': 'ГЛУБОКОВОДНЫЙ АРКАДНЫЙ СИМУЛЯТОР',
    'nav.home': 'ГЛАВНАЯ',
    'nav.profile': 'ПРОФИЛЬ',
    'nav.register': 'РЕГИСТРАЦИЯ',
    'nav.fishing': 'РЫБАЛКА',
    'nav.guest': '[ ГОСТЬ: БЕЗ БАЛАНСА ]',
    'nav.guestTooltip': 'Создайте аккаунт, чтобы копить монеты и сохранять улов',
    'nav.bestiary': 'БЕСТИАРИЙ',
    'nav.soundOn': 'Выключить звук',
    'nav.soundOff': 'Включить звук',

    // Landing Page
    'landing.seasonBadge': 'СЕЗОН 1: ШТОРМ БЕЗДНЫ // 60 FPS',
    'landing.heroTitle': 'RODMAX',
    'landing.heroSubtitle': 'РЫБАЛКА С КАМЕРОЙ. ВЗМАХИ РУКАМИ В БРАУЗЕРЕ.',
    'landing.heroTagline': 'РЕАЛЬНОЕ УПРАВЛЕНИЕ ЖЕСТАМИ ЧЕРЕЗ ВЕБ-КАМЕРУ',
    'landing.heroDesc': 'Полноценный симулятор глубоководной рыбалки прямо в браузере с трекингом жестов рук через веб-камеру. Забрасывай удилище жестом лайка 👍, подсекай резким рывком при поклевке и держи палец над рыбой в реальном времени!',
    'landing.ctaPlay': 'ИГРАТЬ С КАМЕРОЙ',
    'landing.ctaGuide': 'КАК ИГРАТЬ? (ГАЙД)',
    'landing.ctaBestiary': 'БЕСТИАРИЙ РЫБ',
    'landing.ctaRegister': 'СОЗДАТЬ АККАУНТ',
    'landing.statSpecies': '8 ВИДОВ РЫБ',
    'landing.statSpeciesSub': 'ОТ САПОГА ДО АРКЕЙНА',
    'landing.statFps': '60 FPS ОПТИКА',
    'landing.statFpsSub': 'МГНОВЕННЫЙ ОТКЛИК',
    'landing.statRarity': '0.2% РЕДКОСТЬ',
    'landing.statRaritySub': 'НЕОНОВАЯ МЕДУЗА',
    'landing.statBrowser': '100% В БРАУЗЕРЕ',
    'landing.statBrowserSub': 'БЕЗ УСТАНОВКИ',
    'landing.previewHeading': 'ПРЕВЬЮ ИГРОВОГО ПРОЦЕССА В 1080P',
    'landing.previewSub': 'Реальные записи вываживания и видео уникальных поимок',
    'landing.previewClip1': 'ВЫВАЖИВАНИЕ ОТ 1-ГО ЛИЦА',
    'landing.previewClip1Desc': 'Плавная анимация катушки и 60 FPS физика воды',
    'landing.previewClip2': 'ПОИМКА НЕБЕСНОГО КИТА',
    'landing.previewClip2Desc': 'Божественный тир улова (GODLY 0.8%)',
    'landing.previewClip3': 'БИТВА С ЛЕВИАФАНОМ',
    'landing.previewClip3Desc': 'Секретный босс из глубоководной бездны (2.0%)',
    'landing.gearTitle': 'ФИРМЕННОЕ СНАРЯЖЕНИЕ: ТИТАНОВАЯ УДОЧКА RODMAX TITAN-X',
    'landing.gearDesc': 'Усиленный титановый бланк с высокочувствительным оптоволоконным кончиком. Катушка с неоновым редуктором и динамическим сопротивлением для борьбы с глубоководными чудовищами.',
    'landing.gearParam1': 'Длина',
    'landing.gearParam2': 'Тест лески',
    'landing.gearParam3': 'Натяжение',
    'landing.gearParam4': 'Датчик',
    'landing.gearParam4Val': 'Оптический (веб-камера)',
    'landing.bestiarySectionTitle': 'РЕЙТИНГ И РЕДКОСТЬ ОКЕАНИЧЕСКИХ СУЩЕСТВ',
    'landing.bestiarySectionSub': 'Все 8 видов океана с точными шансами поклевки',
    'landing.bestiaryOpenBtn': 'ОТКРЫТЬ ПОЛНЫЙ БЕСТИАРИЙ',
    'landing.howTitle': 'КАК РАБОТАЕТ УПРАВЛЕНИЕ ЖЕСТАМИ',
    'landing.step1Title': '1. ЗАБРОС ЛЕСКИ (👍)',
    'landing.step1Desc': 'Покажите жест «лайк» (👍) перед веб-камерой и удерживайте 0.3 сек или кликните кнопку.',
    'landing.step2Title': '2. МОЛНИЕНОСНАЯ ПОДСЕЧКА',
    'landing.step2Desc': 'При появлении надписи «КЛЮЕТ!» резко подвиньте палец в камеру (окно реакции 1.1 сек).',
    'landing.step3Title': '3. ОПТИЧЕСКОЕ ВЫВАЖИВАНИЕ',
    'landing.step3Desc': 'Ведите указательным пальцем точно за рыбой. Следите за прицелом ☝️ в видоискателе.',
    'landing.step4Title': '4. ПОБЕДА И ТРОФЕЙ',
    'landing.step4Desc': 'Когда шкала заполнится до 100%, рыба поймана! Смотрите анимацию подъема добычи и забирайте трофей.',

    // Guide Modal
    'guide.title': 'РУКОВОДСТВО: ОПТИЧЕСКОЕ УПРАВЛЕНИЕ ЖЕСТАМИ В RODMAX',
    'guide.subtitle': 'Все механики, правила и секреты вываживания рыбы через веб-камеру',
    'guide.step1Header': 'ШАГ 1: ПОДГОТОВКА И ЗАБРОС',
    'guide.step1Text': 'Включите камеру. Держите руку на расстоянии 50–80 см от объектива. Сожмите кулак и поднимите большой палец вверх (👍) на 0.3 сек для старта.',
    'guide.step2Header': 'ШАГ 2: ОЖИДАНИЕ И ЗАПРЕТ ФАЛЬСТАРТА',
    'guide.step2Text': 'Не шевелите рукой во время ожидания! Любой резкий рывок расценивается как фальстарт (штраф 2 секунды).',
    'guide.step3Header': 'ШАГ 3: ПОДСЕЧКА (ОКНО 1.1 СЕК)',
    'guide.step3Text': 'Как только зазвучит зуммер и появится «КЛЮЕТ!», сделайте резкое движение пальцем в камеру.',
    'guide.step4Header': 'ШАГ 4: ВЫВАЖИВАНИЕ (ТРЕКИНГ ПАЛЬЦА)',
    'guide.step4Text': 'Держите кончик указательного пальца на рыбе. Если палец сойдет с рыбы более чем на 2.5 сек суммарно — леска оборвется.',
    'guide.step5Header': 'ШАГ 5: ТРОФЕЙ И НАГРАДЫ',
    'guide.step5Text': 'При достижении 100% шкалы рыба гарантированно поймана. Любуйтесь кинематографичным подъемом улова и получайте монеты и опыт в садок!',
    'guide.close': 'ПОНЯТНО, В БОЙ!',

    // Fishing Game
    'fishing.readyTitle': 'ПОКАЖИТЕ ЖЕСТ «ЛАЙК» (👍) ДЛЯ СТАРТА',
    'fishing.holdTitle': 'УДЕРЖИВАЙТЕ ЛАЙК: {progress}%',
    'fishing.casting': 'ЗАБРОС УДОЧКИ!',
    'fishing.wrongGesture': 'НЕ ТОТ ЖЕСТ! ПОКАЖИТЕ ИМЕННО ЛАЙК 👍',
    'fishing.wrongGestureTip': '✋ Обнаружена рука/ладонь! Сожмите кулак и поднимите большой палец вверх 👍',
    'fishing.holdTime': 'Удерживайте 0.3 сек',
    'fishing.orClick': 'Или кликните кнопку ниже',
    'fishing.castBtn': '[ ЗАБРОСИТЬ УДОЧКУ ]',
    'fishing.reticleTip': '☝️ УПРАВЛЕНИЕ ОПТИЧЕСКИМ ПРИЦЕЛОМ ПАЛЬЦА ПЕРЕД ВЕБ-КАМЕРОЙ',
    'fishing.foulAlert': 'ФАЛЬСТАРТ! РАННИЙ РЫВОК СПУГНУЛ РЫБУ!',
    'fishing.foulSub': 'Штрафной кулдаун: замрите и не двигайте рукой 2 секунды...',
    'fishing.waitingTitle': 'ОЖИДАНИЕ ПОКЛЕВКИ...',
    'fishing.waitingSub': 'Замрите! Не дергайте рукой до поклевки (иначе штраф за фальстарт).',
    'fishing.biteAlert': 'КЛЮЕТ! РЕЗКО ДЕРНИТЕ ПАЛЬЦЕМ!',
    'fishing.biteWindow': 'ОКНО РЕАКЦИИ: {time} СЕК',
    'fishing.strikeBtn': '[ РЕЗКО ПОДСЕЧЬ СЕЙЧАС ]',
    'fishing.reelingActive': 'ВЫВАЖИВАНИЕ: ДЕРЖИТЕ ПАЛЕЦ НА РЫБЕ!',
    'fishing.reelingOff': '⚠️ ПАЛЕЦ ВНЕ РЫБЫ! СРЫВ ЧЕРЕЗ: {time}с',
    'fishing.landingTitle': 'РЫБА У БОРТА! ПРИМИТЕ УЛОВ!',
    'fishing.landingSub': 'Дерните пальцем или кликните [ПРИНЯТЬ] за {time}с!',
    'fishing.acceptCatchBtn': '[ ПРИНЯТЬ УЛОВ СЕЙЧАС ]',
    'fishing.lostTitle': 'РЫБА СОРВАЛАСЬ!',
    'fishing.successTitle': 'НОВЫЙ ТРОФЕЙ ПОЙМАН!',
    'fishing.weight': 'ВЕС',
    'fishing.price': 'ЦЕНА',
    'fishing.exp': 'ОПЫТ',
    'fishing.saveToProfile': 'СОХРАНИТЬ В ПРОФИЛЬ',
    'fishing.continue': 'ПРОДОЛЖИТЬ РЫБАЛКУ',
    'fishing.webcamTitle': 'ВЕБ-КАМЕРА',
    'fishing.webcamActive': '60 FPS',
    'fishing.webcamConnecting': 'ЗАПУСК...',
    'fishing.webcamOff': 'ОТКЛ',
    'fishing.webcamThumbsUp': '👍 ЛАЙК',
    'fishing.webcamWrong': '⚠️ НЕ ЛАЙК',
    'fishing.webcamWrongBadge': 'НЕ ТОТ ЖЕСТ',
    'fishing.hudCast': '[ЗАБРОС] Жест «Лайк» (👍) в камеру (0.3с) или кнопка мышью',
    'fishing.hudStrike': '[ПОДСЕЧКА] Резко подвиньте палец в камеру (окно 1.1 сек)',
    'fishing.hudFoul': '[ОШИБКА] Рывок раньше поклевки = фальстарт (штраф 2 сек)',
    'fishing.hudReel': '[ВЫВАЖИВАНИЕ] Держите указательный палец на рыбе (срыв при потере 2.5с)',
    'fishing.hudAccept': '[ТРОФЕЙ] При 100% шкалы добыча гарантированно поймана и вываживается на борт!',
    'fishing.tension': 'НАТЯЖЕНИЕ ЛЕСКИ',
    'fishing.tensionLow': 'ОБРЫВ ПРИ 0%',
    'fishing.tensionHigh': 'ПОТЕРЯ ПРИ 2.5с',
    'fishing.depth': 'ГЛУБИНА',
    'fishing.distance': 'ДИСТАНЦИЯ',

    // Auth / Profile Page
    'auth.titleRegister': 'РЕГИСТРАЦИЯ АККАУНТА',
    'auth.titleLogin': 'ВХОД В ЛИЧНЫЙ КАБИНЕТ',
    'auth.subtitleRegister': 'СОЗДАЙ ПРОФИЛЬ ДЛЯ СОХРАНЕНИЯ УЛОВА И ИНВЕНТАРЯ',
    'auth.subtitleLogin': 'ВВЕДИ СВОИ ДАННЫЕ ДЛЯ ЗАГРУЗКИ САДКА И БАЛАНСА',
    'auth.tabCreate': 'СОЗДАТЬ АККАУНТ',
    'auth.tabLogin': 'ВОЙТИ В СУЩЕСТВУЮЩИЙ',
    'auth.guestBadge': 'ГОСТЕВОЙ РЕЖИМ',
    'auth.benefitsTitle': 'ПРЕИМУЩЕСТВА РЕГИСТРАЦИИ:',
    'auth.accessTitle': 'ДОСТУП К ПРОФИЛЮ:',
    'auth.benefitsDesc': 'Только у зарегистрированных рыболовов работает Личный кабинет и постоянный Инвентарь, где подсчитывается каждый выловленный экземпляр, накапливаются монеты и ведутся рекорды!',
    'auth.accessDesc': 'Войдите под своим позывным и паролем (от 8 символов), чтобы восстановить весь ваш пойманный улов, уровень и баланс монет.',
    'auth.errEngOnly': 'РАЗРЕШЕНЫ ТОЛЬКО АНГЛИЙСКИЕ БУКВЫ, ЦИФРЫ, ТОЧКИ И ПОДЧЕРКИВАНИЯ (_)',
    'auth.errCallsignEmpty': 'ВВЕДИТЕ ПОЗЫВНОЙ (НИКНЕЙМ)',
    'auth.errCallsignShort': 'НИКНЕЙМ ДОЛЖЕН БЫТЬ НЕ МЕНЕЕ 3 СИМВОЛОВ',
    'auth.errPassShort': 'ПАРОЛЬ ДОЛЖЕН СОДЕРЖАТЬ НЕ МЕНЕЕ 8 СИМВОЛОВ (СЕЙЧАС: {count})',
    'auth.errRegister': 'ОШИБКА РЕГИСТРАЦИИ',
    'auth.errLogin': 'ОШИБКА ВХОДА',
    'auth.callsignLabel': 'ПОЗЫВНОЙ (НИКНЕЙМ В ИГРЕ)',
    'auth.callsignHint': 'ENG ONLY: A-Z, 0-9, ., _',
    'auth.passwordLabel': 'ПАРОЛЬ ДОСТУПА',
    'auth.passMinSuccess': '✓ МИНИМУМ 8 СИМВОЛОВ ВЫПОЛНЕН',
    'auth.passMinReq': '{count}/8 МИН. СИМВОЛОВ',
    'auth.passPlaceholder': 'Минимум 8 символов (например, 12345678)',
    'auth.passBadge': '[≥ 8 СИМВ]',
    'auth.submitRegister': 'СОЗДАТЬ АККАУНТ И ОТКРЫТЬ КАБИНЕТ',
    'auth.submitLogin': 'ВОЙТИ В СВОЙ АККАУНТ',
    'auth.playGuest': 'ИГРАТЬ БЕЗ РЕГИСТРАЦИИ',
    'auth.haveAccount': 'Уже есть созданный аккаунт?',
    'auth.loginLink': 'Войти в существующий',
    'auth.newHere': 'Впервые на RODMAX?',
    'auth.registerLink': 'Зарегистрировать новый профиль',
    'auth.changeAvatar': 'СМЕНИТЬ',
    'auth.changeAvatarTip': 'Нажмите, чтобы сменить аватар',
    'auth.chooseAvatar': 'Выбрать аватар',
    'auth.levelBadge': 'УРОВЕНЬ {lvl}',
    'auth.rankAbyss': 'ВЛАДЫКА БЕЗДНЫ',
    'auth.rankOcean': 'МАСТЕР ОКЕАНА',
    'auth.rankVeteran': 'ОПЫТНЫЙ РЫБОЛОВ',
    'auth.rankNovice': 'НАЧИНАЮЩИЙ ЛОВЕЦ',
    'auth.expProgress': 'ПРОГРЕСС ОПЫТА (EXP)',
    'auth.lvlShort': 'УР. {lvl}',
    'auth.toNextLevel': 'ДО СЛЕДУЮЩЕГО УРОВНЯ: {exp} EXP',
    'auth.btnFishing': 'НА РЫБАЛКУ',
    'auth.btnLogout': 'ВЫЙТИ',
    'auth.switchProfile': 'Сменить профиль',
    'auth.metricCoins': 'БАЛАНС МОНЕТ',
    'auth.metricCatches': 'ВСЕГО ВЫЛОВЛЕНО',
    'auth.metricBasket': 'В САДКЕ СЕЙЧАС',
    'auth.metricBasketVal': 'ЦЕННОСТЬ САДКА',
    'auth.unitsPcs': 'ШТ',
    'auth.unitsKg': 'кг',
    'auth.invTitle': 'ИНВЕНТАРЬ И УЧЕТ ТРОФЕЕВ',
    'auth.invSpeciesCount': '(Открыто видов: {caught} из {total})',
    'auth.invSub': 'ЗДЕСЬ УЧТЕН КАЖДЫЙ ВЫЛОВЛЕННЫЙ ВИД, СЧЕТЧИК ПОИМОК И ЖИВОЙ САДОК',
    'auth.sellAllBasket': 'ПРОДАТЬ ВЕСЬ САДОК (+{val} C)',
    'auth.modeLabel': 'РЕЖИМ:',
    'auth.modeInBasket': 'В САДКЕ ({count} ШТ)',
    'auth.modeBestiary': 'БЕСТИАРИЙ ({count})',
    'auth.modeFull': 'ВЕСЬ ОКЕАН ({count})',
    'auth.filterAll': 'ВСЕ',
    'auth.emptyBasketRarity': 'НЕТ РЫБ ВЫБРАННОЙ РЕДКОСТИ В САДКЕ!',
    'auth.emptyBasket': 'САДОК СЕЙЧАС ПУСТ!',
    'auth.emptyBasketRarityDesc': 'Попробуйте сбросить фильтр редкости на «ВСЕ», чтобы увидеть весь улов.',
    'auth.emptyBasketDesc': 'Все пойманные рыбы уже проданы, либо вы еще не выловили свежий улов. Отправляйтесь на рыбалку или посмотрите Бестиарий!',
    'auth.openBestiary': 'ОТКРЫТЬ БЕСТИАРИЙ',
    'auth.emptyCategory': 'НЕТ РЫБ В ВЫБРАННОЙ КАТЕГОРИИ БЕСТИАРИЯ!',
    'auth.emptyCategoryDesc': 'Попробуйте сбросить фильтр редкости или отправляйтесь на глубоководный заброс!',
    'auth.weightLabel': 'Вес особи:',
    'auth.sellPriceLabel': 'Стоимость продажи:',
    'auth.caughtAtLabel': 'Выловлена:',
    'auth.sellBtn': 'ПРОДАТЬ (+{val} C)',
    'auth.recordWeight': 'Рекордный вес:',
    'auth.inBasketNow': 'В садке сейчас:',
    'auth.caughtLifetime': 'ПОЙМАНО: x{count}',
    'auth.notCaughtBadge': 'НЕ ПОЙМАНО',
    'auth.sellAllOfFish': 'ПРОДАТЬ ВСЕ {count} ШТ (+{val} C)',
    'auth.statusDiscovered': 'ОТКРЫТО В БЕСТИАРИИ',
    'auth.statusUndiscovered': 'ВИД ЕЩЕ НЕ ВЫЛОВЛЕН',
    'auth.modalAvatarTitle': 'ВЫБОР АВАТАРА РЫБОЛОВА',
    'auth.modalAvatarSub': 'Выберите глубоководного персонажа или трофейную рыбу для своего профиля',
    'auth.modalAvatarSaved': 'АКТИВНЫЙ АВАТАР СОХРАНЯЕТСЯ В ПРОФИЛЬ',
    'auth.modalClose': 'ЗАКРЫТЬ',

    // Bestiary Modal
    'bestiary.modalTitle': 'БЕСТИАРИЙ ГЛУБИН И ЭНЦИКЛОПЕДИЯ РЫБ',
    'bestiary.modalSubtitle': 'Все 8 видов океана с точными процентами шанса вылова и 1080p видео поимки',
    'bestiary.caught': 'ПОЙМАН',
    'bestiary.notCaught': 'НЕ ВЫЛОВЛЕН',
    'bestiary.chance': 'ШАНС',
    'bestiary.biteRate': 'ШАНС ПОКЛЕВКИ',
    'bestiary.weight': 'Вес',
    'bestiary.basePrice': 'Базовая цена',
    'bestiary.catchRate': 'Шанс вылова',
    'bestiary.caughtByYou': 'Поймано вами',
    'bestiary.times': 'раз',
    'bestiary.kg': 'кг'
  },

  en: {
    // Navbar
    'nav.brandSubtitle': 'DEEPWATER ARCADE SIMULATOR',
    'nav.home': 'HOME',
    'nav.profile': 'PROFILE',
    'nav.register': 'REGISTER',
    'nav.fishing': 'FISHING',
    'nav.guest': '[ GUEST: NO WALLET ]',
    'nav.guestTooltip': 'Create an account to accumulate coins and persist your catches',
    'nav.bestiary': 'BESTIARY',
    'nav.soundOn': 'Mute sound',
    'nav.soundOff': 'Unmute sound',

    // Landing Page
    'landing.seasonBadge': 'SEASON 1: ABYSS STORM // 60 FPS',
    'landing.heroTitle': 'RODMAX',
    'landing.heroSubtitle': 'WEBCAM FISHING. GESTURE CONTROLS IN BROWSER.',
    'landing.heroTagline': 'REAL-TIME OPTICAL HAND TRACKING VIA WEBCAM',
    'landing.heroDesc': 'Full-fledged deepwater arcade fishing simulator right in your browser with real-time optical hand tracking. Cast your rod with a thumbs-up gesture 👍, hook on rapid strike, and balance line tension with your fingertip in real-time!',
    'landing.ctaPlay': 'PLAY WITH CAMERA',
    'landing.ctaGuide': 'HOW TO PLAY (GUIDE)',
    'landing.ctaBestiary': 'VIEW BESTIARY',
    'landing.ctaRegister': 'CREATE ACCOUNT',
    'landing.statSpecies': '8 SPECIES',
    'landing.statSpeciesSub': 'FROM BOOT TO ARCANE',
    'landing.statFps': '60 FPS OPTICS',
    'landing.statFpsSub': 'INSTANT REACTION',
    'landing.statRarity': '0.2% RARITY',
    'landing.statRaritySub': 'NEON JELLYFISH',
    'landing.statBrowser': '100% BROWSER',
    'landing.statBrowserSub': 'ZERO INSTALLATION',
    'landing.previewHeading': '1080P GAMEPLAY SHOWCASE',
    'landing.previewSub': 'Real battle footage and showcase of ultra-rare species',
    'landing.previewClip1': 'FIRST-PERSON REELING',
    'landing.previewClip1Desc': 'Smooth reel mechanics and 60 FPS water physics',
    'landing.previewClip2': 'CELESTIAL WHALE CATCH',
    'landing.previewClip2Desc': 'Godly tier legendary beast (GODLY 0.8%)',
    'landing.previewClip3': 'BATTLE WITH THE LEVIATHAN',
    'landing.previewClip3Desc': 'Secret boss from the deepest trenches (2.0%)',
    'landing.gearTitle': 'SIGNATURE GEAR: RODMAX TITAN-X ROD',
    'landing.gearDesc': 'Reinforced titanium blank with ultra-responsive fiber-optic tip. High-torque neon reduction reel engineered to conquer deepest leviathans.',
    'landing.gearParam1': 'Length',
    'landing.gearParam2': 'Line Test',
    'landing.gearParam3': 'Tension',
    'landing.gearParam4': 'Sensor',
    'landing.gearParam4Val': 'Optical (Webcam)',
    'landing.bestiarySectionTitle': 'OCEAN SPECIES & RARITY TIERS',
    'landing.bestiarySectionSub': 'All 8 ocean creatures with exact bite probabilities',
    'landing.bestiaryOpenBtn': 'OPEN FULL BESTIARY',
    'landing.howTitle': 'HOW OPTICAL GESTURE CONTROL WORKS',
    'landing.step1Title': '1. OPTICAL CAST (👍)',
    'landing.step1Desc': 'Show a thumbs-up (👍) gesture before your webcam and hold for 0.3s or click the button.',
    'landing.step2Title': '2. LIGHTNING STRIKE',
    'landing.step2Desc': 'When «FISH ON!» flashes, rapidly thrust your fingertip forward (1.1s reaction window).',
    'landing.step3Title': '3. PRECISION REELING',
    'landing.step3Desc': 'Steer your index finger over the moving fish. Track the reticle ☝️ in your viewfinder.',
    'landing.step4Title': '4. VICTORY & TROPHY',
    'landing.step4Desc': 'When the bar reaches 100%, the fish is caught! Watch the hauling animation and claim your trophy.',

    // Guide Modal
    'guide.title': 'MANUAL: OPTICAL GESTURE CONTROL IN RODMAX',
    'guide.subtitle': 'All mechanics, rules, and secrets of webcam deepwater fishing',
    'guide.step1Header': 'STEP 1: POSITIONING & CAST',
    'guide.step1Text': 'Enable webcam. Position hand 50–80 cm from the lens. Curl fingers into a fist and raise your thumb (👍) for 0.3s to cast.',
    'guide.step2Header': 'STEP 2: WAITING & FALSE START PENALTY',
    'guide.step2Text': 'Stay still while waiting! Any sudden jerk before the bite is flagged as a false start (2-second penalty).',
    'guide.step3Header': 'STEP 3: STRIKE (1.1s WINDOW)',
    'guide.step3Text': 'As soon as the buzzer rings and «FISH ON!» appears, rapidly thrust your finger toward the camera.',
    'guide.step4Header': 'STEP 4: REELING (FINGERTIP TRACKING)',
    'guide.step4Text': 'Keep your index fingertip centered over the swimming fish. Off-target for >2.5s cumulative will snap the line.',
    'guide.step5Header': 'STEP 5: TROPHY & REWARDS',
    'guide.step5Text': 'Reaching 100% progress secures the catch. Enjoy the haul animation and receive coins and EXP in your basket!',
    'guide.close': 'GOT IT, LET\'S FISH!',

    // Fishing Game
    'fishing.readyTitle': 'SHOW THUMBS-UP GESTURE (👍) TO START',
    'fishing.holdTitle': 'HOLD THUMBS-UP: {progress}%',
    'fishing.casting': 'CASTING LINE!',
    'fishing.wrongGesture': 'WRONG GESTURE! SHOW THUMBS-UP 👍',
    'fishing.wrongGestureTip': '✋ Hand detected! Curl fingers into a fist and raise your thumb 👍',
    'fishing.holdTime': 'Hold for 0.3 sec',
    'fishing.orClick': 'Or click the button below',
    'fishing.castBtn': '[ CAST LINE ]',
    'fishing.reticleTip': '☝️ OPTICAL FINGERTIP TRACKING IN FRONT OF WEBCAM',
    'fishing.foulAlert': 'FALSE START! PREMATURE MOTION SCARED THE FISH!',
    'fishing.foulSub': 'Penalty cooldown: freeze and keep your hand still for 2 seconds...',
    'fishing.waitingTitle': 'WAITING FOR BITE...',
    'fishing.waitingSub': 'Stay still! Do not twitch your hand before bite (or trigger false start).',
    'fishing.biteAlert': 'FISH ON! RAPIDLY THRUST FINGER!',
    'fishing.biteWindow': 'REACTION WINDOW: {time} SEC',
    'fishing.strikeBtn': '[ RAPID STRIKE NOW ]',
    'fishing.reelingActive': 'REELING: KEEP FINGER OVER FISH!',
    'fishing.reelingOff': '⚠️ FINGER OFF FISH! SNAPPING IN: {time}s',
    'fishing.landingTitle': 'FISH AT THE SURFACE! LAND IT!',
    'fishing.landingSub': 'Twitch finger or click [LAND CATCH] within {time}s!',
    'fishing.acceptCatchBtn': '[ LAND CATCH NOW ]',
    'fishing.lostTitle': 'FISH ESCAPED!',
    'fishing.successTitle': 'NEW TROPHY CAUGHT!',
    'fishing.weight': 'WEIGHT',
    'fishing.price': 'PRICE',
    'fishing.exp': 'EXP',
    'fishing.saveToProfile': 'SAVE TO PROFILE',
    'fishing.continue': 'CONTINUE FISHING',
    'fishing.webcamTitle': 'WEBCAM',
    'fishing.webcamActive': '60 FPS',
    'fishing.webcamConnecting': 'STARTING...',
    'fishing.webcamOff': 'OFF',
    'fishing.webcamThumbsUp': '👍 THUMBS UP',
    'fishing.webcamWrong': '⚠️ WRONG GESTURE',
    'fishing.webcamWrongBadge': 'WRONG GESTURE',
    'fishing.hudCast': '[CAST] Thumbs-up gesture (👍) in camera (0.3s) or mouse button',
    'fishing.hudStrike': '[STRIKE] Rapid finger thrust towards camera (1.1s window)',
    'fishing.hudFoul': '[PENALTY] Motion before bite = false start (2s freeze)',
    'fishing.hudReel': '[REELING] Guide index finger over swimming fish (snap if lost 2.5s)',
    'fishing.hudAccept': '[TROPHY] At 100% progress the fish is caught and hauled aboard!',
    'fishing.tension': 'LINE TENSION',
    'fishing.tensionLow': 'SNAP AT 0%',
    'fishing.tensionHigh': 'LOSS AT 2.5s',
    'fishing.depth': 'DEPTH',
    'fishing.distance': 'DISTANCE',

    // Auth / Profile Page
    'auth.titleRegister': 'ACCOUNT REGISTRATION',
    'auth.titleLogin': 'ACCOUNT LOGIN',
    'auth.subtitleRegister': 'CREATE PROFILE TO SAVE CATCHES AND INVENTORY',
    'auth.subtitleLogin': 'ENTER CREDENTIALS TO LOAD BASKET AND BALANCE',
    'auth.tabCreate': 'CREATE ACCOUNT',
    'auth.tabLogin': 'LOG IN TO EXISTING',
    'auth.guestBadge': 'GUEST MODE',
    'auth.benefitsTitle': 'REGISTRATION BENEFITS:',
    'auth.accessTitle': 'PROFILE ACCESS:',
    'auth.benefitsDesc': 'Only registered anglers have permanent profile saving, fish counters, persistent coins and bestiary records!',
    'auth.accessDesc': 'Log in with your callsign and password (min 8 chars) to restore all your catches, level and coins balance.',
    'auth.errEngOnly': 'ONLY ENGLISH LETTERS, DIGITS, DOTS AND UNDERSCORES (_) ARE ALLOWED',
    'auth.errCallsignEmpty': 'ENTER CALLSIGN (NICKNAME)',
    'auth.errCallsignShort': 'CALLSIGN MUST BE AT LEAST 3 CHARACTERS',
    'auth.errPassShort': 'PASSWORD MUST BE AT LEAST 8 CHARACTERS (CURRENT: {count})',
    'auth.errRegister': 'REGISTRATION FAILED',
    'auth.errLogin': 'LOGIN FAILED',
    'auth.callsignLabel': 'CALLSIGN (IN-GAME NICKNAME)',
    'auth.callsignHint': 'ENG ONLY: A-Z, 0-9, ., _',
    'auth.passwordLabel': 'ACCESS PASSWORD',
    'auth.passMinSuccess': '✓ MINIMUM 8 CHARACTERS MET',
    'auth.passMinReq': '{count}/8 MIN CHARACTERS',
    'auth.passPlaceholder': 'Minimum 8 characters (e.g., 12345678)',
    'auth.passBadge': '[≥ 8 CHARS]',
    'auth.submitRegister': 'CREATE ACCOUNT & ACCESS PROFILE',
    'auth.submitLogin': 'LOG IN TO ACCOUNT',
    'auth.playGuest': 'PLAY WITHOUT REGISTRATION',
    'auth.haveAccount': 'Already have an account?',
    'auth.loginLink': 'Log in to existing',
    'auth.newHere': 'First time on RODMAX?',
    'auth.registerLink': 'Register new profile',
    'auth.changeAvatar': 'CHANGE',
    'auth.changeAvatarTip': 'Click to change avatar',
    'auth.chooseAvatar': 'Choose avatar',
    'auth.levelBadge': 'LEVEL {lvl}',
    'auth.rankAbyss': 'ABYSS OVERLORD',
    'auth.rankOcean': 'OCEAN MASTER',
    'auth.rankVeteran': 'VETERAN ANGLER',
    'auth.rankNovice': 'NOVICE ANGLER',
    'auth.expProgress': 'EXP PROGRESS',
    'auth.lvlShort': 'LVL {lvl}',
    'auth.toNextLevel': 'TO NEXT LEVEL: {exp} EXP',
    'auth.btnFishing': 'GO FISHING',
    'auth.btnLogout': 'LOG OUT',
    'auth.switchProfile': 'Switch profile',
    'auth.metricCoins': 'COINS BALANCE',
    'auth.metricCatches': 'TOTAL CATCHES',
    'auth.metricBasket': 'LIVE IN BASKET',
    'auth.metricBasketVal': 'BASKET VALUE',
    'auth.unitsPcs': 'PCS',
    'auth.unitsKg': 'kg',
    'auth.invTitle': 'INVENTORY & TROPHY RECORDS',
    'auth.invSpeciesCount': '(Species discovered: {caught} of {total})',
    'auth.invSub': 'LIFETIME SPECIES RECORDS, CATCH COUNTERS, AND LIVE BASKET',
    'auth.sellAllBasket': 'SELL ENTIRE BASKET (+{val} C)',
    'auth.modeLabel': 'MODE:',
    'auth.modeInBasket': 'IN BASKET ({count} PCS)',
    'auth.modeBestiary': 'BESTIARY ({count})',
    'auth.modeFull': 'FULL OCEAN ({count})',
    'auth.filterAll': 'ALL',
    'auth.emptyBasketRarity': 'NO FISH OF SELECTED RARITY IN BASKET!',
    'auth.emptyBasket': 'BASKET IS CURRENTLY EMPTY!',
    'auth.emptyBasketRarityDesc': 'Try resetting the rarity filter to «ALL» to see all catches.',
    'auth.emptyBasketDesc': 'All caught fish were sold or you haven’t made a fresh catch yet. Go fishing or inspect the Bestiary!',
    'auth.openBestiary': 'OPEN BESTIARY',
    'auth.emptyCategory': 'NO FISH IN SELECTED BESTIARY CATEGORY!',
    'auth.emptyCategoryDesc': 'Try resetting the rarity filter or head out for a deep-sea cast!',
    'auth.weightLabel': 'Specimen weight:',
    'auth.sellPriceLabel': 'Sell value:',
    'auth.caughtAtLabel': 'Caught at:',
    'auth.sellBtn': 'SELL (+{val} C)',
    'auth.recordWeight': 'Record weight:',
    'auth.inBasketNow': 'In basket now:',
    'auth.caughtLifetime': 'CAUGHT: x{count}',
    'auth.notCaughtBadge': 'NOT CAUGHT',
    'auth.sellAllOfFish': 'SELL ALL {count} PCS (+{val} C)',
    'auth.statusDiscovered': 'RECORDED IN BESTIARY',
    'auth.statusUndiscovered': 'SPECIES UNDISCOVERED',
    'auth.modalAvatarTitle': 'SELECT ANGLER AVATAR',
    'auth.modalAvatarSub': 'Select a deepwater character or trophy fish for your profile',
    'auth.modalAvatarSaved': 'ACTIVE AVATAR IS PERSISTED TO PROFILE',
    'auth.modalClose': 'CLOSE',

    // Bestiary Modal
    'bestiary.modalTitle': 'ABYSSAL BESTIARY & FISH ENCYCLOPEDIA',
    'bestiary.modalSubtitle': 'All 8 ocean species with exact bite rates and 1080p catch videos',
    'bestiary.caught': 'CAUGHT',
    'bestiary.notCaught': 'UNDISCOVERED',
    'bestiary.chance': 'CHANCE',
    'bestiary.biteRate': 'BITE PROBABILITY',
    'bestiary.weight': 'Weight',
    'bestiary.basePrice': 'Base price',
    'bestiary.catchRate': 'Catch rate',
    'bestiary.caughtByYou': 'Caught by you',
    'bestiary.times': 'times',
    'bestiary.kg': 'kg'
  }
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS['ru'];
