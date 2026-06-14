# In Search of El Dorado / В поисках Эльдорадо

First system game for Game Harbour. Expedition for legendary treasure in the Amazon - **grounded realism**, no supernatural.

General rules for building any game: [game-creation.md](./game-creation.md). Plain Russian guide: [shablon-igry.ru.md](./shablon-igry.ru.md).

---

## Pitch

### RU

Группа получает наводку: в труднодоступных джунглях Амазонки, в руинах забытой экспедиции, может находиться золото и драгоценности - «Эльдорадо» коллекционеров, не мифического города. Команда собирает снаряжение, нанимает проводника и уходит в рейс. Им мешают река, болезни, логистика, конкуренты и собственная жадность.

### EN

A credible tip places valuables - collector's «El Dorado», not a magic city - deep in the Amazon, near ruins of a failed expedition. The team gears up, hires a guide, and heads in. River, disease, logistics, rivals, and greed stand in the way.

---

## Tone

| OK                                | Not OK                  |
| --------------------------------- | ----------------------- |
| Jungle, maps, boats, camp         | Magic, curses, monsters |
| Gold, jewels, historical myth     | Supernatural guardians  |
| Rival expedition, locals, weather | Sci-fi tech             |
| Injury, exhaustion, moral choices | Paranormal visions      |

Legends are **human rumors**, payoff is physical treasure (or empty ruin).

---

## Player fantasy

Explorers, journalists, financiers, medic, ex-military - everyday roles with skills. Host assigns or players pick from list.

Suggested skills (host can adjust): Navigation, Survival, Medicine, Persuasion, Observation, Stealth.

---

## Structure (3 acts, ~60-90 min)

### Act 1 - The Briefing / Брифинг

| Scene       | Host beat                                  | Player agency              |
| ----------- | ------------------------------------------ | -------------------------- |
| `briefing`  | Sponsor explains rumor, shows map fragment | Questions, team roles      |
| `gear`      | Budget and loadout                         | Choose equipment tradeoffs |
| `departure` | Boat upriver, heat, first night            | Watch, talk to guide NPC   |

### Act 2 - Into the Green / В зелени

| Scene    | Host beat                  | Player agency                         |
| -------- | -------------------------- | ------------------------------------- |
| `rapids` | Boat damaged               | Repair, portage, skill checks         |
| `trail`  | Jungle march, illness risk | Route choice, care for sick           |
| `camp`   | Rival camp spotted nearby  | Negotiate, sneak, confront            |
| `ruins`  | Stone structures, old camp | Search, map puzzle (real-world logic) |

### Act 3 - What Glitters / Что блестит

| Scene      | Host beat                                  | Player agency        |
| ---------- | ------------------------------------------ | -------------------- |
| `chamber`  | Sealed room, crates                        | Open safely vs force |
| `treasure` | Contents revealed (full, partial, or fake) | Split, hide, report  |
| `exfil`    | Return with loot, rivals, storm            | Ending branches      |

---

## Endings (examples)

| ID                | RU                               | EN                       |
| ----------------- | -------------------------------- | ------------------------ |
| `ending_rich`     | Выход с добычей                  | Exit with treasure       |
| `ending_empty`    | Легенда оказалась пустой         | Legend was empty         |
| `ending_betrayal` | Кто-то из команды исчез с частью | Betrayal split           |
| `ending_lost`     | Экспедиция сорвана, выжили       | Mission failed, survived |

---

## Host-only notes (examples)

- Rival leader name and motive (host picks before session)
- Exact treasure amount (host adjusts tension)
- Weather escalation timeline
- Guide loyalty (neutral until Act 2 events)

Stored in `hostOnlyNotes` per scene in game editor.

---

## Media

| Asset      | Notes                                 |
| ---------- | ------------------------------------- |
| Cover      | Jungle river, golden light, realistic |
| `briefing` | Office or map table                   |
| `rapids`   | River boat                            |
| `ruins`    | Mossy stone, no fantasy glyphs        |
| `chamber`  | Crates, dust, lantern                 |

Upload via Captain's Bridge -> MinIO/R2.

---

## DB seed (MVP)

- `GameTemplate` slug: `el-dorado`
- `titleRu`: В поисках Эльдорадо
- `titleEn`: In Search of El Dorado
- `status`: published
- `hostId`: null (system game)
- Scenes: acts above with `contentRu` / `contentEn`

---

## Success criteria

- [ ] Playable ru/en UI
- [ ] All 3 acts reachable
- [ ] At least 3 distinct endings
- [ ] No supernatural beats in default text
- [ ] Host can run entirely from phone or laptop
