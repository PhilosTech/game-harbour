import { getAiSceneJsonExample } from "@/lib/ai-scene-import";

export const AI_PLAYER_COUNT_MIN = 2;
export const AI_PLAYER_COUNT_MAX = 8;

export type GamePromptHeroSlot = {
  labelRu: string;
  labelEn: string;
  strengthTraitRu: string;
  strengthTraitEn: string;
  strengthValue: number;
  weaknessTraitRu: string;
  weaknessTraitEn: string;
  weaknessValue: number;
};

export type GamePromptContext = {
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  heroSlots: GamePromptHeroSlot[];
  traits: Array<{ labelRu: string; labelEn: string }>;
  traitPointsPerStat: number;
};

export type AiPromptOptions = {
  sceneCount: number;
  durationMinutes: number;
  hostNotes: string;
  storyBrief: string;
  expectedPlayerCount: number;
  uiLocale: string;
};

function pickLabel(
  item: { labelRu: string; labelEn: string },
  locale: string,
): string {
  return locale === "en"
    ? item.labelEn || item.labelRu
    : item.labelRu || item.labelEn;
}

function formatList(
  items: Array<{ labelRu: string; labelEn: string }>,
  locale: string,
): string {
  if (items.length === 0) {
    return locale === "ru"
      ? "(пока не задано — придумай 4–5 универсальных характеристик под сеттинг)"
      : "(not set yet — invent 4–5 universal traits that fit the setting)";
  }

  return items
    .map((item, index) => `${index + 1}. ${pickLabel(item, locale)}`)
    .join("\n");
}

function formatHeroSlots(slots: GamePromptHeroSlot[], locale: string): string {
  return slots
    .map((slot, index) => {
      const role = pickLabel(slot, locale);
      const strength = pickLabel(
        { labelRu: slot.strengthTraitRu, labelEn: slot.strengthTraitEn },
        locale,
      );
      const weakness = pickLabel(
        { labelRu: slot.weaknessTraitRu, labelEn: slot.weaknessTraitEn },
        locale,
      );
      if (locale === "ru") {
        return `${index + 1}. ${role} — сильная сторона: ${strength} (+${slot.strengthValue} к проверкам роли), слабость: ${weakness} (${slot.weaknessValue}, ролевая уязвимость)`;
      }
      return `${index + 1}. ${role} — strength: ${strength} (+${slot.strengthValue} on role checks), weakness: ${weakness} (${slot.weaknessValue}, role flaw)`;
    })
    .join("\n");
}

function clampPlayerCount(count: number): number {
  return Math.min(AI_PLAYER_COUNT_MAX, Math.max(AI_PLAYER_COUNT_MIN, count));
}

function getActStructure(sceneCount: number) {
  const act1 = Math.max(1, Math.round(sceneCount * 0.25));
  const act3 = Math.max(1, Math.round(sceneCount * 0.25));
  const act2 = Math.max(1, sceneCount - act1 - act3);
  return { act1, act2, act3 };
}

function buildStoryBriefBlock(storyBrief: string, isRu: boolean): string {
  const trimmed = storyBrief.trim();
  if (trimmed) {
    return trimmed;
  }
  return isRu
    ? "(не задано — выведи логичную трёхактную дугу из описания игры)"
    : "(not set — infer a clear three-act arc from the game description)";
}

function buildHostNotesBlock(hostNotes: string, isRu: boolean): string {
  const trimmed = hostNotes.trim();
  if (trimmed) {
    return trimmed;
  }
  return isRu
    ? "Тон и финал — на твоё усмотрение по описанию игры."
    : "Tone and ending — follow the game description.";
}

function buildPlayersAndHeroesSection(
  isRu: boolean,
  heroSlots: GamePromptHeroSlot[],
  expectedPlayerCount: number,
): string {
  const hasHeroes = heroSlots.length > 0;
  const playerCount = hasHeroes
    ? heroSlots.length
    : clampPlayerCount(expectedPlayerCount);

  if (isRu) {
    if (hasHeroes) {
      return `## Игроки и герои

В шаблоне задано **${playerCount}** слотов героев (фиксированные роли):

${formatHeroSlots(heroSlots, "ru")}

Правила вовлечённости:
- Каждый герой — **минимум в 2 сценах** (task, CHECK или явный момент в hostOnlyNotes)
- Минимум **1 CHECK или task** на сильную сторону роли (Медицина, Техника, Убеждение и т.д.)
- В одной сцене могут действовать 2+ героя; не обязательно все сразу
- Пиши tasks с именем роли («Журналист: …»), но сцена не должна ломаться, если ведущий позже переименует слот
- Партия в Game Harbour: **${AI_PLAYER_COUNT_MIN}–${AI_PLAYER_COUNT_MAX}** игроков; сейчас ориентир — **${playerCount}**`;
    }

    return `## Игроки (герои ещё не заданы)

Слотов героев в шаблоне **нет**. Партия в Game Harbour: **${AI_PLAYER_COUNT_MIN}–${AI_PLAYER_COUNT_MAX}** игроков.
Ориентир для сюжета: **${playerCount}** участников (масштабируй сложность и число NPC под эту цифру).

Правила без имён героев:
- **Не выдумывай** фиксированные имена типа «Врач Алекс» — используй функции: «медик группы», «технарь», «переговорщик»
- В **tasks** — «Участник с лучшей Наблюдательностью…», «Один из группы…», «Тот, кто берёт на себя риск…»
- В **hostOnlyNotes** — кому подойдёт момент по характеристикам
- Сюжет должен работать и для **2**, и для **${playerCount}** игроков: без сцен «только если ровно трое»
- Если ведущий **позже добавит** слоты героев — сцены останутся играбельными (роли наложатся на функции)

Ведущий может добавить героев после генерации сцен — не привязывай сюжет к единственному носителю навыка.`;
  }

  if (hasHeroes) {
    return `## Players and heroes

The template defines **${playerCount}** hero slots (fixed roles):

${formatHeroSlots(heroSlots, "en")}

Involvement rules:
- Every hero — **at least 2 scenes** (task, CHECK, or clear beat in hostOnlyNotes)
- At least **1 CHECK or task** per role strength (Medicine, Tech, Persuasion, etc.)
- 2+ heroes may share a scene; not everyone every scene
- Use role names in tasks ("Journalist: …"); scenes must still work if the host renames a slot later
- Game Harbour supports **${AI_PLAYER_COUNT_MIN}–${AI_PLAYER_COUNT_MAX}** players; target **${playerCount}** for this draft`;
  }

  return `## Players (no hero slots yet)

**No hero slots** in the template. Game Harbour supports **${AI_PLAYER_COUNT_MIN}–${AI_PLAYER_COUNT_MAX}** players.
Target **${playerCount}** participants for pacing (scale NPC load accordingly).

Rules without named heroes:
- Do **not** invent fixed character names — use functions: "the medic", "the engineer", "the negotiator"
- In **tasks** — "Whoever has the best Observation…", "One of the group…"
- In **hostOnlyNotes** — who fits the moment by trait
- Story must work for **2** and for **${playerCount}** players — no "only works with exactly three"
- If the host **adds hero slots later**, scenes stay playable (roles map onto functions)

Do not tie the plot to a single skill carrier.`;
}

function buildPlatformRules(
  isRu: boolean,
  traitMax: number,
  hasHeroes: boolean,
): string {
  const heroStrengthLine = hasHeroes
    ? isRu
      ? "- **Сильная сторона героя** — фиксированный бонус роли (см. слоты), добавляется ведущим к уместным проверкам"
      : "- **Hero strength** — fixed role bonus (see slots); host adds it to fitting checks"
    : isRu
      ? "- **Роли героев** — пока не заданы; в CHECK указывай характеристики, не имена"
      : "- **Hero roles** — not set yet; in CHECK refer to traits, not character names";

  if (isRu) {
    return `## Платформа Game Harbour (важно)

Игра ведётся ведущим вручную. В движке есть:
- **Сцены** — ведущий показывает текст и задания по кнопке
- **Кубики** — ведущий выбирает из **d4, d6, d8, d10, d12, d20**; бросок видят все с 3D-анимацией. **Чередуй кубики** по смыслу сцены, не ставь везде d20

### Кубики — когда какой (варьируй в CHECK-сценах)
| Кубик | Типичное применение |
| d20 | Главные проверки навыка: **d20 + характеристика** vs DC |
| d12 | Редкий исход, нестабильная ситуация |
| d10 | Степень/уровень: погода, шум, сила течения (1–10) |
| d8 | Средний риск: обход, качество находки, реакция NPC |
| d6 | Быстрый шанс, мелкая удача, количество |
| d4 | Мелкая деталь, краткий импульс |

Также уместны **чистые броски без характеристики** — укажи в hostOnlyNotes.

### Проверки (тип CHECK)
**А) Навык:** d20 + характеристика (+ бонус роли при уместности) vs DC (8–18).
**Б) Шкала:** d4–d12 без характеристики; для шкалы пиши **«Интерпретация»**, а не «Успех/Провал».

В **contentRu/contentEn** — только ситуация.
В **hostOnlyNotes** для CHECK:
\`\`\`
Кубик: d[4|6|8|10|12|20]
Проверка: [характеристика или «без характеристики»], DC [число] (если применимо)
Кто бросает: [роль / любой игрок / группа]
Успех: … / Провал: …  (или Интерпретация: 1–3 / 4–7 / 8–10 для шкалы)
\`\`\`

За партию — **минимум 3 разных кубика** в CHECK-сценах.

- **Характеристики** — у каждого игрока 0–${traitMax} на каждую (независимо)
${heroStrengthLine}
- **Картинки** — ведущий загружает вручную; не придумывай URL

### Типы сцен
- **STORY** — сюжет; текст игрокам + tasks
- **CHECK** — бросок кубика
- **NOTE** — **только шпаргалка ведущему**. contentRu/contentEn = **""** (пусто). Вся суть — в **hostOnlyNotes** (минимум 4 пункта: NPC, ресурсы, тайны, концовки). **NOTE всегда последняя сцена в массиве** — не в середине!

### Задания (tasks) и живая сцена
См. раздел **«Драма, NPC и задания»** ниже — tasks не должны быть скучной рутиной.

### Иллюстрации (illustrationHints)
Короткие **подписи для поиска картинки** ведущим (как имя файла или запрос в стоке), **не** промпт для генерации.

Правила:
- **2–6 слов**, до ~50 символов: «Порт Манауса», «Река Амазонки», «Дикая Амазонка», «NPC Руис»
- Название **места, предмета или NPC** — без деталей («влажная трава», «туман на рассвете», «зелёные лианы»)
- hintRu и hintEn — одна и та же суть, короткая подпись на каждом языке
- 0–2 на сцену, только если картинка реально нужна; для NOTE обычно не нужны
- Фон сцены ведущий загружает отдельно; illustrationHints — доп. картинки внутри сцены
- Без URL`;
  }

  return `## Game Harbour platform (important)

The host runs the session manually:
- **Scenes** — host reveals text and tasks step by step
- **Dice** — **d4, d6, d8, d10, d12, d20**; 3D roll for everyone. **Vary dice**; not only d20

### Dice — when to use which
| Die | Typical use |
| d20 | Skill: **d20 + trait** vs DC |
| d12 | Unusual / unstable moment |
| d10 | Degree: weather, noise, current (1–10) |
| d8 | Medium risk |
| d6 | Quick chance, quantity |
| d4 | Small detail |

### Checks (CHECK)
**A) Skill:** d20 + trait (+ role bonus when fitting) vs DC.
**B) Scale:** d4–d12 without trait; use **Interpretation**, not Success/Failure labels.

**contentRu/contentEn** — situation only.
**hostOnlyNotes** for CHECK — include Die, Check, Who rolls, outcomes.

At least **3 different die types** across CHECK scenes.

- **Traits** — 0–${traitMax} per player per trait
${heroStrengthLine}
- **Images** — host uploads manually; no invented URLs

### Scene types
- **STORY** — narrative beat
- **CHECK** — dice moment
- **NOTE** — host-only. contentRu/contentEn = **""**. All content in **hostOnlyNotes** (min 4 bullets: NPCs, resources, secrets, endings). **NOTE must be the last scene in the array** — never in the middle!

### Tasks and scene drama
See **Drama, NPCs, and tasks** below — avoid bland checklist chores.

### Illustration hints (illustrationHints)
Short **search/file labels** for the host (stock photo query or filename), **not** an image-generation prompt.

Rules:
- **2–6 words**, ~50 chars max: "Manaus port", "Amazon river", "Wild Amazon", "NPC Ruiz"
- Name the **place, object, or NPC** — no visual prose (no "wet grass at dawn", "green vines")
- hintRu and hintEn — same idea, short label in each language
- 0–2 per scene when useful; skip for NOTE
- Scene background is uploaded separately; illustrationHints are extra in-scene images
- No URLs`;
}

function buildDramaAndTasksRules(isRu: boolean): string {
  if (isRu) {
    return `## Драма, NPC и задания

Игра должна **оживать за столом**: сюрпризы, NPC, реакции, а не «проверьте аптечку» и «попробуйте воду на вкус».

### NPC и мир
- Введи **2–4 именованных NPC** за партию (торговец, конкурент, проводник, раненый старатель) — они говорят, лгут, помогают, мешают
- В **contentRu/contentEn** показывай действие: шорох в кустах, свист с берега, внезапный голос, сбой мотора, ливень
- В **hostOnlyNotes** — как NPC себя ведёт, что скрывает, чем давит на слабость героя

### Кубик = сюрприз (особенно d4–d8)
В **минимум 1 CHECK** дай **таблицу случайного исхода** в hostOnlyNotes — что «выскочило» после броска:
\`\`\`
Кубик: d6
Интерпретация: 1 = кролик/капибара сбегает; 2 = змея шипит; 3 = агрессивная собака; 4 = человек конкурентов; 5 = пусто; 6 = находка (ключ, обрывок карты)
\`\`\`
Пример сцены: в кустах шевелится — бросок → кролик или собака или шпион. Исход **не game over**, но меняет напряжение и разговор.

### Задания (tasks) — что писать
- 0–3 на сцену, до ~120 знаков, **императив с выбором или эмоцией**
- **Не дублируй** contentRu и не пиши канцелярию

**Хорошие tasks:**
- «Подойдите к шороху или обходите — скажите, почему»
- «Журналист: вытяните у Руиса одну правду, пока льёт дождь»
- «Врач: решите, лечить ли раненого врага, рискуя временем»
- «Кто-то из группы: опишите, что сделаете, если из кустов выскочит собака»

**Плохие tasks (избегай):**
- «Проверьте аптечку», «Попробуйте воду», «Осмотрите развилку», «Распределите роли»
- Любая рутина без ставки, страха, спора или сюрприза

### Баланс
- Не все tasks только «Герой: …» — добавляй **общие** («Группа: …», «Кто первый …»)
- CHECK почти всегда имеет 1 task — **реакция на исход броска**, не повтор проверки
- STORY тоже может иметь task — короткий выбор или реплика NPC`;
  }

  return `## Drama, NPCs, and tasks

The table should feel **alive**: surprises, NPCs, reactions — not "check the med kit" or "taste the water".

### NPCs and the world
- Introduce **2–4 named NPCs** per session (trader, rival, guide, wounded prospector) — they talk, lie, help, obstruct
- In **contentRu/contentEn**, show action: rustling bushes, a whistle from the bank, a sudden voice, engine failure, rain
- In **hostOnlyNotes**, note how each NPC behaves, what they hide, how they press a hero flaw

### Dice = surprise (especially d4–d8)
In **at least 1 CHECK**, add a **random outcome table** in hostOnlyNotes — what "popped out" after the roll:
\`\`\`
Die: d6
Interpretation: 1 = rabbit/capybara flees; 2 = snake hisses; 3 = aggressive dog; 4 = rival scout; 5 = nothing; 6 = find (key, map scrap)
\`\`\`
Example: something stirs in the bushes — roll → rabbit, dog, or spy. Not game over, but tension and dialogue shift.

### Tasks — what to write
- 0–3 per scene, ~120 chars, **imperative with a choice or emotion**
- Do **not** repeat scene body text or write admin chores

**Good tasks:**
- "Approach the rustling or go around — say why"
- "Journalist: pull one truth from Ruiz while the rain hammers down"
- "Doctor: decide whether to treat a wounded rival at the cost of time"
- "Someone in the group: say what you do if a dog bursts from the bushes"

**Bad tasks (avoid):**
- "Check the med kit", "Taste the water", "Inspect the fork", "Assign roles"
- Any routine with no stake, fear, argument, or surprise

### Balance
- Not every task is "Hero: …" — add **group** tasks ("Group: …", "Whoever moves first …")
- CHECK scenes almost always have 1 task — **react to the roll**, do not repeat the check
- STORY scenes may have a task — a short choice or NPC line`;
}

function buildWritingRules(isRu: boolean): string {
  if (isRu) {
    return `## Стиль текста

- Живая короткая проза, не отчёт
- Первая STORY — атмосферное вступление
- Предпоследняя сцена — сильная финальная STORY (последняя — NOTE)
- 3–6 предложений на STORY/CHECK
- contentRu и contentEn — один смысл, естественный язык
- Не пиши «команда должна решить» — показывай сцену`;
  }

  return `## Writing style

- Vivid short prose, not a report
- First STORY — atmospheric opening
- Second-to-last scene — strong finale STORY (last is NOTE)
- 3–6 sentences per STORY/CHECK
- Natural bilingual wording
- Show the scene, not engine instructions`;
}

function buildStructureRules(
  isRu: boolean,
  sceneCount: number,
  durationMinutes: number,
): string {
  const { act1, act2 } = getActStructure(sceneCount);
  const minutesPerScene = Math.round(durationMinutes / sceneCount);
  const noteIndex = sceneCount;
  const lastStoryIndex = sceneCount - 1;

  if (isRu) {
    return `## Структура партии

- **${sceneCount}** сцен, ~**${durationMinutes}** мин (~${minutesPerScene} мин/сцена)
- Акт 1: сцены 1–${act1} | Акт 2: ${act1 + 1}–${act1 + act2} | Акт 3: ${act1 + act2 + 1}–${sceneCount - 1} (без NOTE)
- **Ровно 1 NOTE** — **последняя** сцена (#${noteIndex}). Предпоследняя (#${lastStoryIndex}) — **финальная STORY**
- **2–4 CHECK** с разными характеристиками и **≥3 типами кубиков**
- JSON — линейный; ветки ведущий озвучивает устно`;
  }

  return `## Session structure

- **${sceneCount}** scenes, ~**${durationMinutes}** min
- Act 1: 1–${act1} | Act 2: ${act1 + 1}–${act1 + act2} | Act 3: ${act1 + act2 + 1}–${sceneCount - 1} (excluding NOTE)
- **Exactly 1 NOTE** — **last** scene (#${noteIndex}). Scene #${lastStoryIndex} — **finale STORY**
- **2–4 CHECK** scenes, **≥3 die types**
- Linear JSON; host branches verbally`;
}

function buildSelfCheckSection(
  isRu: boolean,
  sceneCount: number,
  hasHeroes: boolean,
  heroCount: number,
): string {
  const heroChecks = hasHeroes
    ? isRu
      ? `- [ ] Каждый из **${heroCount}** героев — минимум 2 сцены и 1 момент сильной стороны`
      : `- [ ] Each of **${heroCount}** heroes — 2+ scenes and 1 strength moment`
    : isRu
      ? "- [ ] Нет жёстких имён; tasks работают для 2–8 игроков"
      : "- [ ] No fixed names; tasks work for 2–8 players";

  if (isRu) {
    return `## Самопроверка перед ответом (обязательно)

Перед выводом JSON мысленно проверь каждый пункт. Если что-то не так — **исправь**, потом отвечай.

- [ ] Ровно **${sceneCount}** сцен в массиве scenes
- [ ] **1 NOTE** — последняя сцена; **hostOnlyNotes** заполнен (NPC, ресурсы, тайны, концовки), не пустой
- [ ] NOTE: contentRu и contentEn = ""
- [ ] Предпоследняя сцена — STORY-финал, не CHECK и не NOTE
- [ ] **2–4 CHECK**; в каждой CHECK есть блок «Кубик:» в hostOnlyNotes
- [ ] В CHECK использованы **≥3 разных кубика** (не только d20)
- [ ] Все STORY/CHECK имеют contentRu **и** contentEn (не пустые)
${heroChecks}
- [ ] tasks живые (выбор, NPC, реакция) — нет рутины «проверьте аптечку»
- [ ] ≥1 CHECK с таблицей сюрприза (d4–d8/d6: кусты, зверь, NPC)
- [ ] tasks не копируют текст сцены
- [ ] sceneKey уникальны, латиница
- [ ] imageUrl везде "" ; illustrationHints — короткие подписи (2–6 слов), не описания картинки
- [ ] Только JSON, без текста и markdown снаружи`;
  }

  return `## Self-check before answering (mandatory)

Verify each item. Fix issues, then output JSON.

- [ ] Exactly **${sceneCount}** scenes in the array
- [ ] **1 NOTE** — last scene; **hostOnlyNotes** filled (NPCs, resources, secrets, endings), not empty
- [ ] NOTE: contentRu and contentEn = ""
- [ ] Second-to-last scene — STORY finale
- [ ] **2–4 CHECK** scenes; each has "Die:" in hostOnlyNotes
- [ ] **≥3 different die types** across CHECK scenes
- [ ] All STORY/CHECK have both contentRu and contentEn
${heroChecks}
- [ ] tasks are vivid (choice, NPC, reaction) — no "check the med kit" chores
- [ ] ≥1 CHECK has a surprise table (d4–d8/d6: bushes, animal, NPC)
- [ ] tasks do not repeat scene body
- [ ] Unique sceneKeys
- [ ] imageUrl "" ; illustrationHints are short labels (2–6 words), not image prompts
- [ ] JSON only, no surrounding text`;
}

export function buildAiScenePrompt(
  game: GamePromptContext,
  options: AiPromptOptions,
): string {
  const isRu = options.uiLocale === "ru";
  const title = isRu
    ? game.titleRu || game.titleEn
    : game.titleEn || game.titleRu;
  const description = isRu
    ? game.descriptionRu || game.descriptionEn
    : game.descriptionEn || game.descriptionRu;
  const traitMax = game.traitPointsPerStat;
  const example = getAiSceneJsonExample();
  const hasHeroes = game.heroSlots.length > 0;
  const heroCount = hasHeroes ? game.heroSlots.length : 0;
  const expectedPlayerCount = clampPlayerCount(
    hasHeroes ? game.heroSlots.length : options.expectedPlayerCount,
  );

  const sharedTail = isRu
    ? `## Формат ответа

Верни **только** один валидный JSON-объект. Без markdown, без текста до или после.

\`\`\`json
${example}
\`\`\`

Технические правила:
- sceneKey: латиница, цифры, _ и -
- STORY/CHECK: contentRu и contentEn обязательны и непустые
- NOTE: contentRu/contentEn = ""; hostOnlyNotes обязателен и развёрнут
- NOTE — всегда последний элемент массива scenes
- imageUrl: ""
- illustrationHints: короткие подписи для поиска, до ~50 символов
- Без магии (если ведущий не указал иное)`
    : `## Response format

Return **only** one valid JSON object. No markdown, no text outside.

\`\`\`json
${example}
\`\`\`

Technical rules:
- sceneKey: latin, digits, _ and -
- STORY/CHECK: non-empty contentRu and contentEn
- NOTE: empty content fields; rich hostOnlyNotes required
- NOTE — always the last item in scenes[]
- imageUrl: ""
- illustrationHints: short search labels, ~50 chars max
- No magic unless host overrides`;

  const body = isRu
    ? `Ты — сценарист настольных сюжетных игр для ведущего (НЕ классический D&D). Придумай сцены для шаблона в Game Harbour.

## Уже задано ведущим

**Название:** ${title}

**Описание:**
${description}

**Сюжет и акценты:**
${buildStoryBriefBlock(options.storyBrief, true)}

${buildPlayersAndHeroesSection(true, game.heroSlots, expectedPlayerCount)}

**Общие характеристики** (0–${traitMax} у каждого игрока на каждую):
${formatList(game.traits, "ru")}

${buildPlatformRules(true, traitMax, hasHeroes)}

${buildStructureRules(true, options.sceneCount, options.durationMinutes)}

${buildWritingRules(true)}

${buildDramaAndTasksRules(true)}

## Пожелания ведущего

${buildHostNotesBlock(options.hostNotes, true)}

${buildSelfCheckSection(true, options.sceneCount, hasHeroes, heroCount)}

${sharedTail}`
    : `You write narrative tabletop scenes for Game Harbour (NOT classic D&D).

## Set by the host

**Title:** ${title}

**Description:**
${description}

**Story focus:**
${buildStoryBriefBlock(options.storyBrief, false)}

${buildPlayersAndHeroesSection(false, game.heroSlots, expectedPlayerCount)}

**Shared traits** (0–${traitMax} per player per trait):
${formatList(game.traits, "en")}

${buildPlatformRules(false, traitMax, hasHeroes)}

${buildStructureRules(false, options.sceneCount, options.durationMinutes)}

${buildWritingRules(false)}

${buildDramaAndTasksRules(false)}

## Host wishes

${buildHostNotesBlock(options.hostNotes, false)}

${buildSelfCheckSection(false, options.sceneCount, hasHeroes, heroCount)}

${sharedTail}`;

  return body;
}
