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
- **Правило N-1:** в каждой сцене tasks должны покрывать минимум **${playerCount - 1}** из ${playerCount} героев. Один герой может пропустить сцену без именного task, но **не две сцены подряд** — каждый должен участвовать в большинстве сцен
- Минимум **1 CHECK или task** на сильную сторону роли (Медицина, Техника, Убеждение и т.д.) за всю партию
- В одной сцене могут действовать несколько героев; не обязательно все сразу
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
- **N-1 rule:** each scene's tasks must cover at least **${playerCount - 1}** of ${playerCount} heroes. One hero may skip a scene without a named task, but **never two scenes in a row** — every hero must participate in most scenes
- At least **1 CHECK or task** per role strength (Medicine, Tech, Persuasion, etc.) across the whole session
- Multiple heroes may share a scene; not everyone every scene
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

function buildMasterNotesRules(isRu: boolean): string {
  if (isRu) {
    return `## Справочник ведущего (masterNotes)

Поле **masterNotes** в корне JSON — глобальная шпаргалка для ведущего на всю партию. Игроки её не видят.

Обязательно включи:
- **NPC** — каждый именованный персонаж: роль, характер, что скрывает, как давит на героев
- **Ресурсы** — ограничения, которые действуют всю игру (провизия, время, деньги, патроны)
- **Тайны** — факты, которые ведущий знает заранее, но игроки узнают постепенно
- **Концовки** — минимум 2 варианта финала с кратким описанием условий

Формат: свободный текст с переносами строк. Лаконично, но информативно — ведущий должен прочитать за 2 минуты и понять всю картину.`;
  }

  return `## Host reference (masterNotes)

The **masterNotes** field at JSON root — a global cheat-sheet for the host, covering the whole session. Players never see it.

Must include:
- **NPCs** — each named character: role, personality, what they hide, how they pressure heroes
- **Resources** — session-wide constraints (food, time, money, ammo)
- **Secrets** — facts the host knows upfront but players discover gradually
- **Endings** — at least 2 possible finales with brief conditions

Format: plain text with line breaks. Concise but complete — host reads it in 2 minutes and grasps the full picture.`;
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

### Структура hostOnlyNotes (для всех сцен)
hostOnlyNotes — трёхслойная заметка ведущему, всегда в таком порядке:
1. **Механика** — кубик, DC, кто бросает, исходы (для CHECK обязательно; для STORY только если есть скрытая проверка)
2. **Тайны и скрытый контекст** — что игроки не знают, что NPC скрывают, какой подтекст у сцены
3. **Подсказки если группа застряла** — 1-2 конкретных хода ведущего чтобы сдвинуть сцену
4. **Последствия и связи вперёд** — что переходит в следующую сцену: осложнение, преимущество, изменение состояния NPC

Минимум для STORY: слои 2, 3, 4. Минимум для CHECK: все четыре.

- **Характеристики** — у каждого игрока 0–${traitMax} на каждую (независимо)
${heroStrengthLine}
- **Картинки** — ведущий загружает вручную; не придумывай URL

### Типы сцен
- **STORY** — сюжет; текст игрокам + tasks
- **CHECK** — бросок кубика

### Задания (tasks) и живая сцена
См. раздел **«Драма, NPC и задания»** ниже — tasks не должны быть скучной рутиной.

### Иллюстрации (illustrationHints)
Короткие **подписи для поиска картинки** ведущим (как имя файла или запрос в стоке), **не** промпт для генерации.

Правила:
- **2–6 слов**, до ~50 символов: «[Место из игры]», «[Предмет из игры]», «NPC [Имя]»
- Название **места, предмета или NPC из сеттинга этой игры** — без визуальных деталей («влажная трава», «туман на рассвете»)
- hintRu и hintEn — одна и та же суть, короткая подпись на каждом языке
- 0–2 на сцену, только если картинка реально нужна
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

### hostOnlyNotes structure (all scenes)
hostOnlyNotes — four layers, always in this order:
1. **Mechanics** — die, DC, who rolls, outcomes (required for CHECK; for STORY only if a hidden check exists)
2. **Secrets and hidden context** — what players don't know, what NPCs hide, the subtext of the scene
3. **Hints if the group is stuck** — 1-2 concrete host moves to push the scene forward
4. **Consequences and forward links** — what carries into the next scene: complication, advantage, changed NPC state

Minimum for STORY: layers 2, 3, 4. Minimum for CHECK: all four.

- **Traits** — 0–${traitMax} per player per trait
${heroStrengthLine}
- **Images** — host uploads manually; no invented URLs

### Scene types
- **STORY** — narrative beat
- **CHECK** — dice moment

### Tasks and scene drama
See **Drama, NPCs, and tasks** below — avoid bland checklist chores.

### Illustration hints (illustrationHints)
Short **search/file labels** for the host (stock photo query or filename), **not** an image-generation prompt.

Rules:
- **2–6 words**, ~50 chars max: "[Place from game]", "[Object from game]", "NPC [Name]"
- Name the **place, object, or NPC from this game's setting** — no visual prose (no "wet grass at dawn", "green vines")
- hintRu and hintEn — same idea, short label in each language
- 0–2 per scene when useful
- Scene background is uploaded separately; illustrationHints are extra in-scene images
- No URLs`;
}

function buildDramaAndTasksRules(isRu: boolean): string {
  if (isRu) {
    return `## Драма, NPC и задания

Игра должна **оживать за столом**: сюрпризы, NPC, реакции, а не «проверьте аптечку» и «попробуйте воду на вкус».

### NPC и мир
- Введи **2–4 именованных NPC** за партию — роли берутся из сеттинга игры (союзник, противник, информатор, наблюдатель и т.п.) — они говорят, лгут, помогают, мешают
- В **contentRu/contentEn** показывай действие: неожиданный звук, сигнал тревоги, внезапный голос, сбой техники, стихия
- В **hostOnlyNotes** — как NPC себя ведёт, что скрывает, чем давит на слабость героя

### Кубик = сюрприз (особенно d4-d8)
В **минимум 1 CHECK** дай **таблицу случайного исхода** в hostOnlyNotes - что произошло после броска. Содержание таблицы - **из сеттинга этой игры**:
\`\`\`
Кубик: d6
Интерпретация: 1 = [плохой исход из сеттинга]; 2 = [осложнение]; 3 = [нейтральный сюрприз]; 4 = [угроза или NPC-противник]; 5 = [пусто / ложная тревога]; 6 = [находка или преимущество]
\`\`\`
Исход **не game over**, но меняет напряжение и разговор.

### Задания (tasks) — что писать
- **Количество:** минимум N-1 именных tasks на сцену (по одному на каждого героя кроме одного) + можно добавить 1–2 групповых
- До ~120 знаков каждый, **императив с выбором или эмоцией**
- **Не дублируй** contentRu и не пиши канцелярию

**Хорошие tasks (принцип, не копировать):**
- «[Роль]: продолжаете план или меняете решение — скажите, почему»
- «[Роль]: задайте NPC вопрос, который его смутит — и смотрите на реакцию»
- «[Роль]: решите, тратить ли последний ресурс сейчас, рискуя остальными»
- «Кто-то из группы: скажите, что сделаете первым, если ситуация выйдет из-под контроля»

**Плохие tasks (избегай):**
- Любая рутина без ставки: «Осмотрите [объект]», «Проверьте [снаряжение]», «Распределите роли»
- Любая рутина без ставки, страха, спора или сюрприза

### Баланс
- Не все tasks только «Герой: …» — добавляй **общие** («Группа: …», «Кто первый …»)
- CHECK почти всегда имеет 1 task — **реакция на исход броска**, не повтор проверки
- STORY тоже может иметь task — короткий выбор или реплика NPC

### Таблица заметок игроков (Развилка / Концовка)
В Game Harbour у каждого игрока есть таблица сцен × 2 строки: **«Развилка»** и **«Концовка»**. Ведущий заполняет её вручную в ходе игры — это накопительный трекер решений и итогов.

В **hostOnlyNotes** ключевых сцен укажи ведущему конкретную инструкцию:
\`\`\`
[Таблица] Развилка: запиши каждому игроку «углубились» или «отступили» — это повлияет на финал.
[Таблица] Концовка: запиши имя NPC которому игрок доверился — в финале это станет его уязвимостью.
\`\`\`
- **Развилка** — что именно записать и почему это важно для дальнейшего сюжета
- **Концовка** — конкретная деталь о герое, которую ведущий фиксирует для финальной сцены
- В финальной сцене обязательно сошлись на данных из таблицы: «Те кто записал X — получают преимущество / осложнение»
- Не в каждой сцене — только в 1–3 поворотных моментах за партию`;
  }

  return `## Drama, NPCs, and tasks

The table should feel **alive**: surprises, NPCs, reactions — not "check the med kit" or "taste the water".

### NPCs and the world
- Introduce **2–4 named NPCs** per session — roles come from the game's setting (ally, antagonist, informant, observer, etc.) — they talk, lie, help, obstruct
- In **contentRu/contentEn**, show action: an unexpected sound, an alarm signal, a sudden voice, equipment failure, an environmental threat
- In **hostOnlyNotes**, note how each NPC behaves, what they hide, how they press a hero flaw

### Dice = surprise (especially d4-d8)
In **at least 1 CHECK**, add a **random outcome table** in hostOnlyNotes - what happened after the roll. Table content must come from **this game's setting**:
\`\`\`
Die: d6
Interpretation: 1 = [bad outcome from setting]; 2 = [complication]; 3 = [neutral surprise]; 4 = [threat or NPC-antagonist]; 5 = [nothing / false alarm]; 6 = [find or advantage]
\`\`\`
Not game over, but tension and dialogue shift.

### Tasks — what to write
- **Count:** minimum N-1 named tasks per scene (one per hero except one) + 1–2 group tasks optional
- ~120 chars each, **imperative with a choice or emotion**
- Do **not** repeat scene body text or write admin chores

**Good tasks (principle, do not copy):**
- "[Role]: keep the plan or change the decision — say why"
- "[Role]: ask the NPC a question that will make them uncomfortable — watch the reaction"
- "[Role]: decide whether to spend the last resource now, risking the others"
- "Someone in the group: say what you do first if the situation goes out of control"

**Bad tasks (avoid):**
- Any routine with no stake: "Inspect [object]", "Check [equipment]", "Assign roles"
- Any routine with no stake, fear, argument, or surprise

### Balance
- Not every task is "Hero: …" — add **group** tasks ("Group: …", "Whoever moves first …")
- CHECK scenes almost always have 1 task — **react to the roll**, do not repeat the check
- STORY scenes may have a task — a short choice or NPC line

### Player notes table (Branching / Ending)
Game Harbour gives each player a table: scenes × 2 rows — **"Branching"** and **"Ending"**. The host fills it live during play — it's a cumulative tracker of decisions and outcomes.

In hostOnlyNotes of key scenes, give the host a specific instruction:
\`\`\`
[Table] Branching: write "went deeper" or "retreated" for each player — this affects the finale.
[Table] Ending: write the NPC name each player trusted — in the finale this becomes their vulnerability.
\`\`\`
- **Branching** — what exactly to record and why it matters for the plot ahead
- **Ending** — a specific hero detail the host captures for the final scene
- The finale must reference the table data: "Players who recorded X get an advantage / complication"
- Not every scene — only 1–3 turning points per session`;
}

function buildWritingRules(isRu: boolean): string {
  if (isRu) {
    return `## Стиль текста

- Живая короткая проза, не отчёт
- Первая STORY — атмосферное вступление
- Последняя сцена — сильный финал STORY
- **600–900 символов** на contentRu и столько же на contentEn (считай сам перед выводом)
- contentRu и contentEn — один смысл, естественный язык
- Не пиши «команда должна решить» — показывай сцену

### Согласованность сюжета
- Каждый NPC из masterNotes должен появиться минимум в **2 сценах** (введение + развитие или развязка)
- Сюжетные нити (предательство, скрытый мотив, соперничество и т.д.) должны **проходить через все три акта** — не обрываться после одной сцены
- Если в акте 1 появился NPC — в акте 2 или 3 он должен **сделать что-то важное**, не просто упоминаться
- Ресурсы из masterNotes должны **ощущаться**: если провизия кончается — сцена должна это показывать

### Черты героев и характеристики
- В hostOnlyNotes каждой сцены **явно укажи**, чья сильная сторона или слабость здесь работает
- Слабость героя — не просто ярлык: покажи **момент**, когда она создаёт реальную проблему или выбор
- Пример: «[Слабость героя]: если он действует первым без проверки — [конкретное последствие из сеттинга]»
- **Общие характеристики:** за партию должна быть задействована **минимум половина** из заданных характеристик — каждая хотя бы в одной CHECK или task
- В tasks добавляй отсылки к характеристикам: «Тот у кого выше [характеристика]…», «Участник с лучшим [характеристика]…», «Кто готов потратить [характеристика]…»

### Препятствия и конфликты
- Препятствие в сцене — не всегда NPC: **погода, рельеф, нехватка ресурса, моральный выбор, время**
- Минимум **1 сцена без NPC-антагониста** — где давит среда или обстоятельства, а не человек
- В CHECK — исход влияет на **следующую сцену**: провал добавляет осложнение, успех даёт преимущество`;
  }

  return `## Writing style

- Vivid short prose, not a report
- First STORY — atmospheric opening
- Last scene — strong STORY finale
- **600–900 characters** for contentRu and the same for contentEn (count before outputting)
- Natural bilingual wording
- Show the scene, not engine instructions

### Story consistency
- Every NPC from masterNotes must appear in at least **2 scenes** (introduction + development or resolution)
- Plot threads (betrayal, hidden motive, rivalry, etc.) must **run through all three acts** — no thread dropped after one scene
- An NPC introduced in act 1 must **do something significant** in act 2 or 3, not just be mentioned
- Resources from masterNotes must **feel real**: if food is running low, a scene should show it

### Hero traits and shared traits
- In each scene's hostOnlyNotes, **explicitly name** whose strength or flaw is active here
- A hero's flaw is not just a label: show the **moment** it creates a real problem or choice
- Example: "[Hero's flaw]: if they act first without a check — [specific consequence from the setting]"
- **Shared traits:** across the session, at least **half of the listed traits** must be used — each in at least one CHECK or task
- In tasks, reference traits by name: "Whoever has higher [trait]…", "The one with the best [trait]…", "Who is willing to spend [trait]…"

### Obstacles and conflict
- An obstacle is not always an NPC: **weather, terrain, scarce resources, moral choice, time pressure**
- At least **1 scene with no NPC antagonist** — environment or circumstance is the pressure
- In CHECK — the outcome affects the **next scene**: failure adds a complication, success grants an advantage`;
}

function buildStructureRules(
  isRu: boolean,
  sceneCount: number,
  durationMinutes: number,
): string {
  const { act1, act2 } = getActStructure(sceneCount);
  const minutesPerScene = Math.round(durationMinutes / sceneCount);

  if (isRu) {
    return `## Структура партии

- **${sceneCount}** сцен, ~**${durationMinutes}** мин (~${minutesPerScene} мин/сцена)
- Акт 1: сцены 1–${act1} | Акт 2: ${act1 + 1}–${act1 + act2} | Акт 3: ${act1 + act2 + 1}–${sceneCount}
- Последняя сцена (#${sceneCount}) — **финальная STORY** (не CHECK)
- **2–4 CHECK** с разными характеристиками и **≥3 типами кубиков**
- JSON — линейный; ветки ведущий озвучивает устно`;
  }

  return `## Session structure

- **${sceneCount}** scenes, ~**${durationMinutes}** min
- Act 1: 1–${act1} | Act 2: ${act1 + 1}–${act1 + act2} | Act 3: ${act1 + act2 + 1}–${sceneCount}
- Last scene (#${sceneCount}) — **finale STORY** (not CHECK)
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
      ? `- [ ] В каждой сцене tasks покрывают минимум **${heroCount - 1}** из ${heroCount} героев (правило N-1)
- [ ] Ни один герой не пропускает именной task **две сцены подряд**
- [ ] Каждый герой получил минимум **1 момент сильной стороны** за партию`
      : `- [ ] Each scene's tasks cover at least **${heroCount - 1}** of ${heroCount} heroes (N-1 rule)
- [ ] No hero skips a named task **two scenes in a row**
- [ ] Every hero gets at least **1 strength moment** across the session`
    : isRu
      ? "- [ ] Нет жёстких имён; tasks работают для 2–8 игроков"
      : "- [ ] No fixed names; tasks work for 2–8 players";

  if (isRu) {
    return `## Самопроверка перед ответом (обязательно)

Перед выводом JSON мысленно проверь каждый пункт. Если что-то не так — **исправь**, потом отвечай.

- [ ] **masterNotes** заполнен: NPC (имя, роль, тайна), ресурсы, глобальные тайны, минимум 2 концовки
- [ ] Ровно **${sceneCount}** сцен в массиве scenes
- [ ] Последняя сцена (#${sceneCount}) — STORY-финал, не CHECK
- [ ] **2–4 CHECK**; в каждой CHECK есть блок «Кубик:» в hostOnlyNotes
- [ ] В CHECK использованы **≥3 разных кубика** (не только d20)
- [ ] Все сцены имеют contentRu **и** contentEn (не пустые)
${heroChecks}
- [ ] tasks живые (выбор, NPC, реакция) — нет рутины «проверьте аптечку»
- [ ] ≥1 CHECK с таблицей сюрприза (d4–d8/d6: исходы из сеттинга этой игры)
- [ ] tasks не копируют текст сцены
- [ ] hostOnlyNotes каждой сцены содержит: тайны/контекст + подсказки если застряли + последствия вперёд (+ механика для CHECK)
- [ ] В 1–3 ключевых сценах есть подсказка [Таблица] для Развилки и Концовки
- [ ] contentRu каждой сцены **600–900 символов** (не меньше, не больше)
- [ ] Каждый NPC из masterNotes появляется минимум в 2 сценах
- [ ] Минимум половина общих характеристик задействована в CHECK или tasks
- [ ] Нет расовых стереотипов, реальной политики, графического насилия
- [ ] sceneKey уникальны, латиница
- [ ] imageUrl везде "" ; illustrationHints — короткие подписи (2–6 слов), не описания картинки
- [ ] Только JSON, без текста и markdown снаружи`;
  }

  return `## Self-check before answering (mandatory)

Verify each item. Fix issues, then output JSON.

- [ ] **masterNotes** filled: NPCs (name, role, secret), resources, global secrets, at least 2 endings
- [ ] Exactly **${sceneCount}** scenes in the array
- [ ] Last scene (#${sceneCount}) — STORY finale, not CHECK
- [ ] **2–4 CHECK** scenes; each has "Die:" in hostOnlyNotes
- [ ] **≥3 different die types** across CHECK scenes
- [ ] All scenes have both contentRu and contentEn (non-empty)
${heroChecks}
- [ ] tasks are vivid (choice, NPC, reaction) — no "check the med kit" chores
- [ ] ≥1 CHECK has a surprise table (d4–d8/d6: outcomes from this game's setting)
- [ ] tasks do not repeat scene body
- [ ] hostOnlyNotes for each scene contains: secrets/context + hints if stuck + forward consequences (+ mechanics for CHECK)
- [ ] 1–3 key scenes have a [Table] hint for Branching and Ending
- [ ] contentRu of each scene is **600–900 characters** (not shorter, not longer)
- [ ] Every NPC from masterNotes appears in at least 2 scenes
- [ ] At least half of the shared traits used in CHECK or tasks
- [ ] No racial stereotypes, real-world politics, or graphic violence
- [ ] Unique sceneKeys
- [ ] imageUrl "" ; illustrationHints are short labels (2–6 words), not image prompts
- [ ] JSON only, no surrounding text`;
}

function buildContentRestrictions(isRu: boolean): string {
  if (isRu) {
    return `## Ограничения контента

- **Без магии и мистики** — никаких заклинаний, демонов, паранормального, сверхъестественных сил. Конфликты строятся на людях, технике, среде и случае. В sci-fi или фэнтези-сеттинге допустимы: неизвестные организмы, аномальные условия среды, необъяснённые явления — но без мистической подоплёки и без монстров-антагонистов
- **Без расовых, этнических и национальных стереотипов** — NPC определяются ролью и характером, не происхождением
- **Без реальной политики и религии** — конфликты строятся на личных мотивах, деньгах, власти, тайнах
- **Без жестокого насилия в тексте игроков** (contentRu/contentEn) — напряжение через угрозу и выбор, не через описание крови
- **Без сексуального контента, пошлости и грубой лексики**
- **Без пропаганды** — ни одна сторона конфликта не подаётся как однозначно правая или неправая
- Тёмные темы (смерть, предательство, жадность) — допустимы, если служат драме и выбору, а не шоку
- Принцип: игра комфортна для любой аудитории`;
  }

  return `## Content restrictions

- **No magic or mysticism** — no spells, demons, paranormal, or supernatural forces. Conflict is built on people, technology, environment, and chance. In sci-fi or fantasy settings, the following are allowed: unknown organisms, anomalous environmental conditions, unexplained phenomena — but without mystical underpinning and without monster antagonists
- **No racial, ethnic, or national stereotypes** — NPCs are defined by role and personality, not origin
- **No real-world politics or religion** — conflict is built on personal motives, money, power, secrets
- **No graphic violence in player-facing text** (contentRu/contentEn) — tension through threat and choice, not gore
- **No sexual content, vulgarity, or crude language**
- **No propaganda** — no side in the conflict is framed as simply right or wrong
- Dark themes (death, betrayal, greed) — acceptable when they serve drama and choice, not shock
- Principle: the game must be comfortable for any audience`;
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

> **ВАЖНО:** пример ниже показывает **только структуру JSON**. Все плейсхолдеры в квадратных скобках — это заглушки формата. Имена персонажей, локации, события и детали сеттинга ты **обязан брать исключительно из описания игры выше**. Никакого Амазонки, джунглей или других игр — только то, что указал ведущий. Количество tasks в примере — это иллюстрация структуры, не фиксированное число. **Количество tasks в каждой сцене = N-1 из раздела «Игроки и герои» (минимум именных tasks на сцену).**

\`\`\`json
${example}
\`\`\`

Технические правила:
- **masterNotes** — строка в корне JSON (не внутри scenes); NPC, ресурсы, тайны, концовки
- sceneKey: латиница, цифры, _ и -
- STORY/CHECK: contentRu и contentEn обязательны и непустые
- imageUrl: ""
- illustrationHints: короткие подписи для поиска, до ~50 символов`
    : `## Response format

Return **only** one valid JSON object. No markdown, no text outside.

> **IMPORTANT:** the example below shows **only the JSON structure**. All placeholders in square brackets are format stubs. Character names, locations, events, and setting details **must come exclusively from the game description above**. Do not copy or invent settings — use only what the host provided. The example has 5 tasks per scene — that is N-1 for 6 heroes. **Adjust task count to the actual N-1 from the "Players and heroes" section.**

\`\`\`json
${example}
\`\`\`

Technical rules:
- **masterNotes** — string at root level (not inside scenes); NPCs, resources, secrets, endings
- sceneKey: latin, digits, _ and -
- STORY/CHECK: non-empty contentRu and contentEn
- imageUrl: ""
- illustrationHints: short search labels, ~50 chars max`;

  const body = isRu
    ? `Ты — сценарист настольных сюжетных игр для ведущего (НЕ классический D&D). Придумай сцены и справочник ведущего для шаблона в Game Harbour.

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

${buildMasterNotesRules(true)}

${buildStructureRules(true, options.sceneCount, options.durationMinutes)}

${buildWritingRules(true)}

${buildDramaAndTasksRules(true)}

${buildContentRestrictions(true)}

## Пожелания ведущего

${buildHostNotesBlock(options.hostNotes, true)}

${buildSelfCheckSection(true, options.sceneCount, hasHeroes, heroCount)}

${sharedTail}`
    : `You write narrative tabletop scenes and a host reference for Game Harbour (NOT classic D&D).

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

${buildMasterNotesRules(false)}

${buildStructureRules(false, options.sceneCount, options.durationMinutes)}

${buildWritingRules(false)}

${buildDramaAndTasksRules(false)}

${buildContentRestrictions(false)}

## Host wishes

${buildHostNotesBlock(options.hostNotes, false)}

${buildSelfCheckSection(false, options.sceneCount, hasHeroes, heroCount)}

${sharedTail}`;

  return body;
}
