export function numericReferences(codepoints) {
  return {
    decimal: codepoints.map((cp) => `&#${cp};`).join(''),
    hex: codepoints.map((cp) => `&#x${cp.toString(16).toUpperCase()};`).join(''),
  };
}

export function buildEntityEntries(source, unicodeNames, korean) {
  const grouped = new Map();
  const preferred = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&nbsp;', '&copy;', '&reg;', '&trade;', '&hearts;'];
  for (const [name, value] of Object.entries(source)) {
    if (!name.endsWith(';')) continue;
    if (String.fromCodePoint(...value.codepoints) !== value.characters) throw new Error(`Invalid source ${name}`);
    const id = value.codepoints.map((cp) => cp.toString(16)).join('-');
    if (!grouped.has(id)) {
      grouped.set(id, { id, character: value.characters, codepoints: value.codepoints, names: [] });
    }
    grouped.get(id).names.push(name);
  }
  return [...grouped.values()].map((entry) => {
    entry.names.sort((a, b) => {
      const ai = preferred.indexOf(a), bi = preferred.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
    });
    const englishName = entry.codepoints.map((cp) => unicodeNames.get(cp) || `U+${cp.toString(16).toUpperCase()}`).join(' + ');
    const words = [...new Set(entry.names.flatMap((name) => korean[name] ?? []))];
    const cp = entry.codepoints[0];
    const category = /ARROW|HARPOON/.test(englishName) ? '화살표'
      : /SPACE|JOINER|ZERO WIDTH|TABULATION|LINE FEED|SOFT HYPHEN/.test(englishName) ? '공백·제어 문자'
      : /GREEK/.test(englishName) ? '그리스 문자'
      : /LATIN/.test(englishName) ? '라틴 문자'
      : /CYRILLIC/.test(englishName) ? '키릴 문자'
      : cp >= 0x2200 && cp <= 0x22ff || cp >= 0x2a00 && cp <= 0x2aff ? '수학 기호'
      : cp >= 0x1d400 && cp <= 0x1d7ff ? '수학 영문자'
      : /DOLLAR|CENT|POUND|CURRENCY|YEN|EURO/.test(englishName) ? '통화 기호'
      : '기호·문장 부호';
    return { ...entry, ...numericReferences(entry.codepoints), englishName,
      koreanName: words[0] ?? '', keywords: words, category };
  }).sort((a, b) => {
    const ai = preferred.findIndex((name) => a.names.includes(name));
    const bi = preferred.findIndex((name) => b.names.includes(name));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      || a.codepoints[0] - b.codepoints[0] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}
