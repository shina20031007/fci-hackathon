import type { CivicProject } from "@/lib/validation/project";

// Search vocabulary only: these aliases do not add facts to project records.
const aliases = [
  [
    "transit",
    "公交",
    "公共交通",
    "公车",
    "transport collectif",
    "bus",
    "buses",
    "巴士",
    "autobus",
  ],
  ["streetcar", "streetcars", "tram", "有轨电车", "电车", "tramway"],
  ["transportation", "交通", "出行", "transport"],
  ["housing", "homes", "住房", "住宅", "logement", "logements"],
  ["zoning", "分区", "zonage"],
  ["land use", "土地利用", "土地使用", "amenagement"],
  ["infrastructure", "基础设施", "infrastructures"],
  ["environment", "环境", "environnement"],
  ["budget", "预算", "财政"],
  ["public services", "公共服务", "services publics"],
  ["road", "roads", "street", "streets", "道路", "街道", "rue"],
  ["consultation", "consultations", "公众咨询", "咨询"],
  ["parking", "停车", "stationnement"],
  ["cycling", "bike", "bikes", "自行车", "骑行", "velo"],
  ["toronto", "多伦多"],
  ["waterloo", "滑铁卢"],
  ["bathurst", "巴瑟斯特", "巴瑟斯"],
  ["dufferin", "达弗林", "杜弗林"],
  ["eglinton", "埃格林顿", "艾灵顿"],
  ["jane", "简街"],
];
const ignored = new Set(
  "a an the and or of for to in on at is are it with about not no record records recorded show find me i want please project projects plan plans route routes le la les un une des de du et pour sur je cherche projet projets 我 想 想看 看 查找 搜索 找 查询 关于 的 有 哪些 什么 项目 线路 请 帮我".split(
    " ",
  ),
);
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
function words(value: string) {
  return [...segmenter.segment(value)]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment);
}
const groups = aliases.map((group) => group.map(normalize));
type Field = { text: string; words: string[]; weight: number };
const indexes = new WeakMap<CivicProject, Field[]>();
function index(project: CivicProject) {
  const cached = indexes.get(project);
  if (cached) return cached;
  const fields: Field[] = [];
  function add(value: string, weight: number) {
    const text = normalize(value);
    if (text) fields.push({ text, words: words(text), weight });
  }
  add(project.title, 12);
  add(project.municipality, 9);
  add(project.neighbourhood, 8);
  add(project.category, 7);
  add(project.summary, 5);
  add(project.rationale, 4);
  for (const scope of project.scopes) {
    add(scope.label, 9);
    add(scope.description, 2);
  }
  for (const decision of project.decisions) {
    add(decision.explanation, 3);
    add(decision.conditions, 2);
    add(decision.amendment, 2);
  }
  for (const event of project.events) add(event.title, 2);
  for (const feedback of project.feedback) {
    add(feedback.topic, 2);
    add(feedback.summary, 1);
  }
  for (const source of project.sources) add(source.title, 1);
  indexes.set(project, fields);
  return fields;
}

/** One insertion, deletion, substitution or adjacent transposition. */
function smallTypo(a: string, b: string) {
  if (!/^[a-z]{5,}$/.test(a) || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  if (b.length > a.length) return a.slice(i) === b.slice(i + 1);
  return (
    a.slice(i + 1) === b.slice(i + 1) ||
    (a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2))
  );
}
function match(term: string, field: Field) {
  if (field.words.includes(term) || ` ${field.text} `.includes(` ${term} `))
    return 1;
  // Never approximate route numbers, agenda digits or short words.
  if (/\d/u.test(term)) return 0;
  if (/\p{Script=Han}/u.test(term))
    return term.length >= 2 && field.text.includes(term) ? 0.9 : 0;
  if (term.length < 3) return 0;
  if (
    field.words.some((w) => w.startsWith(term) && term.length >= w.length / 2)
  )
    return 0.75;
  return field.words.some((w) => smallTypo(term, w)) ? 0.5 : 0;
}

/** Rank only the supplied records; callers retain publication/access controls. */
export function searchProjects(projects: CivicProject[], query: string) {
  const text = normalize(query.slice(0, 300));
  if (!text) return projects;
  const phraseAliases = groups
    .flat()
    .filter((alias) =>
      /\p{Script=Han}/u.test(alias)
        ? text.includes(alias)
        : ` ${text} `.includes(` ${alias} `),
    );
  const terms = [...new Set([...phraseAliases, ...words(text)])]
    .filter((word) => !ignored.has(word))
    .slice(0, 24);
  if (!terms.length) return [];
  const expanded = terms.map((term) => ({
    term,
    variants: [
      ...new Set([term, ...groups.filter((g) => g.includes(term)).flat()]),
    ],
  }));
  return projects
    .map((project) => {
      const fields = index(project);
      let score = 0;
      for (const { term, variants } of expanded) {
        let best = 0;
        for (const field of fields)
          for (const variant of variants)
            best = Math.max(best, match(variant, field) * field.weight);
        if (/^\d+$/.test(term) && !best) return { project, score: 0 };
        if (best) score += 100 + best;
      }
      return { project, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ project }) => project);
}
