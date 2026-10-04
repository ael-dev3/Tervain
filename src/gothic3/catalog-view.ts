import { NativeCatalog } from './catalog';
import type { NativeInfo } from './catalog';

export const catalog = new NativeCatalog();

function text(parent: HTMLElement, value: string, tag = 'p', className?: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function source(parent: HTMLElement, record: { source: { archive: string; path: string; sha256: string } }): void {
  text(parent, record.source.archive + ' · ' + record.source.path + ' · SHA-256 ' + record.source.sha256, 'p', 'source');
}

function infoRecord(parent: HTMLElement, info: NativeInfo): void {
  const details = document.createElement('details');
  const title = document.createElement('summary');
  const first = info.commands.find((command) => command.command.toLowerCase() === 'description') ??
    info.commands.find((command) => command.command.toLowerCase() === 'say' && command.entity1 === 'player');
  title.textContent = first?.text ? catalog.text(first.text) || info.id : info.id;
  details.append(title);
  const condition = info.conditionType === null ? 'Unresolved condition' : catalog.enums.infoConditionType[String(info.conditionType)] ?? String(info.conditionType);
  text(details, condition + (info.quest ? ' · ' + info.quest : '') + (info.parent ? ' · parent ' + info.parent : ''), 'p', 'record-meta');
  for (const command of info.commands) {
    if (!command.command) continue;
    const kind = command.command.toLowerCase();
    if (kind === 'description') continue;
    if (kind === 'say' || kind === 'showsubtitle') {
      const line = catalog.text(command.text);
      text(details, (kind === 'say' ? (command.entity1 === 'player' ? 'Hero' : command.entity1 === 'npc' ? info.owner : command.entity1) + ': ' : '') + line, 'p', 'dialogue-line');
    } else {
      const operands = [command.entity1, command.entity2, command.id1, command.id2, command.text].filter(Boolean);
      text(details, 'Original action · ' + command.command + (operands.length ? ' (' + operands.join(', ') + ')' : ''), 'p', 'record-meta');
    }
  }
  source(details, info);
  parent.append(details);
}

export async function showOriginalDialogue(parent: HTMLElement, owner: string): Promise<void> {
  const view = document.createElement('section');
  parent.append(view);
  text(view, 'Reading original dialogue…');
  try {
    await catalog.load();
    if (!view.isConnected) return;
    view.replaceChildren();
    const infos = catalog.forOwner(owner);
    if (!infos.length) { text(view, 'No original dialogue records have this owner name.'); return; }
    text(view, 'Original dialogue', 'h3');
    text(view, infos.length + ' source records · ' + catalog.language + '. These records include conditional conversations; their availability and actions are still being rebuilt.');
    for (const info of infos) infoRecord(view, info);
  } catch (error) {
    if (view.isConnected) { view.replaceChildren(); text(view, 'Original dialogue could not load: ' + String(error), 'p', 'warnings'); }
  }
}

export async function showQuestCatalog(parent: HTMLElement): Promise<void> {
  const view = document.createElement('section');
  parent.append(view);
  text(view, 'Reading original quest catalog…');
  try {
    await catalog.load();
    if (!view.isConnected) return;
    view.replaceChildren();
    text(view, catalog.quests.length + ' original quests · ' + catalog.infos.length + ' dialogue records. Quest progress is not enabled yet.');
    const controls = document.createElement('div');
    controls.className = 'catalog-controls';
    const search = document.createElement('input');
    search.type = 'search'; search.value = 'Ardea'; search.placeholder = 'Search original quests';
    search.setAttribute('aria-label', 'Search original quests');
    const languages = document.createElement('select');
    languages.setAttribute('aria-label', 'Original text language');
    for (const language of catalog.languages) languages.add(new Option(language, language, false, language === catalog.language));
    controls.append(search, languages);
    view.append(controls);
    const counter = text(view, '', 'p', 'record-meta');
    const results = document.createElement('div');
    view.append(results);
    let request = 0;
    const render = (): void => {
      const query = search.value.trim().toLocaleLowerCase();
      const quests = catalog.quests.filter((quest) => [quest.id, quest.folder, catalog.text(quest.logTopic)].some((value) => value.toLocaleLowerCase().includes(query)));
      counter.textContent = quests.length + ' matching quests · ' + catalog.language;
      results.replaceChildren();
      let count = 0;
      const more = document.createElement('button');
      more.textContent = 'Show more quests';
      const append = (): void => {
        more.remove();
        const end = Math.min(count + 50, quests.length);
        while (count < end) {
          const quest = quests[count++];
          if (!quest) continue;
          const details = document.createElement('details');
          text(details, catalog.text(quest.logTopic) || quest.id, 'summary');
          text(details, quest.id + ' · ' + quest.folder, 'p', 'record-meta');
          if (quest.logText) text(details, catalog.text(quest.logText));
          if (quest.prereqs.length) text(details, 'Original prerequisites: ' + quest.prereqs.join(', '));
          if (quest.deliveryTargets.length) text(details, 'Original targets: ' + quest.deliveryTargets.map((target) => target.entity + ' × ' + (target.amount ?? '?')).join(', '));
          text(details, 'Source ExperiencePoints field: ' + (quest.rewards.experience ?? 'unresolved') + '. The original XP script derives the actual gain; viewing this record grants no reward.');
          source(details, quest);
          results.append(details);
        }
        if (count < quests.length) results.append(more);
      };
      more.onclick = append;
      append();
    };
    search.oninput = render;
    languages.onchange = async () => {
      const token = ++request;
      languages.disabled = true;
      try { await catalog.setLanguage(languages.value); if (token === request && view.isConnected) render(); }
      catch (error) { if (view.isConnected) counter.textContent = String(error); }
      finally { if (token === request) languages.disabled = false; }
    };
    render();
  } catch (error) {
    if (view.isConnected) { view.replaceChildren(); text(view, 'Original quest catalog could not load: ' + String(error), 'p', 'warnings'); }
  }
}
