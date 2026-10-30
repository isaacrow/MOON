/**
 * MARC Generator Service
 * Generates complete MARC21 records from BIBFRAME data
 * Handles deep nested properties, authority objects, and edge cases
 */

export function generateMARC(work: any, instance: any): string {
  const fields: string[] = [];

  // --- Helper to add fields safely ---
  const addField = (tag: string, ind1: string, ind2: string, subfields: [string, string][]) => {
    const validSubfields = subfields.filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== '');
    if (validSubfields.length > 0) {
      const subfieldString = validSubfields.map(([code, val]) => `$${code}${val}`).join('');
      fields.push(`=${tag}  ${ind1}${ind2}${subfieldString}`);
    }
  };

  // --- Helper to extract label safely ---
  const extractLabel = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node.trim();
    if (Array.isArray(node)) {
      for (const item of node) {
        const lbl = extractLabel(item);
        if (lbl) return lbl;
      }
      return '';
    }
    if (typeof node === 'object') {
      const val =
        node['rdfs:label'] ||
        node['label'] ||
        node['name'] ||
        node['primaryName'] ||
        node['preferredName'] ||
        node['rdf:value'] ||
        node['@value'] ||
        node['bf:mainTitle'] ||
        node['mainTitle'] ||
        node['title'] ||
        '';
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (typeof val === 'object') return extractLabel(val);
      if (node['@id'] && typeof node['@id'] === 'string' && !node['@id'].startsWith('_:')) {
        const last = node['@id'].split('/').pop();
        if (last && !last.startsWith('n') && !last.startsWith('Q')) {
          return decodeURIComponent(last).replace(/_/g, ' ');
        }
      }
    }
    return '';
  };

  // --- Helper to extract URI safely ---
  const extractUri = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string' && (node.startsWith('http://') || node.startsWith('https://'))) return node.trim();
    if (typeof node === 'object') {
      if (typeof node['@id'] === 'string' && node['@id'].startsWith('http')) return node['@id'].trim();
      if (typeof node.uri === 'string' && node.uri.startsWith('http')) return node.uri.trim();
    }
    return '';
  };

  // --- Helper to extract title safely ---
  const extractTitle = (titleNode: any): { main: string; subtitle: string; partNumber: string; partName: string } => {
    if (!titleNode) return { main: '', subtitle: '', partNumber: '', partName: '' };
    if (typeof titleNode === 'string') return { main: titleNode.trim(), subtitle: '', partNumber: '', partName: '' };
    if (Array.isArray(titleNode)) {
      for (const item of titleNode) {
        const res = extractTitle(item);
        if (res.main) return res;
      }
      return { main: '', subtitle: '', partNumber: '', partName: '' };
    }
    const main =
      extractLabel(titleNode['bf:mainTitle']) ||
      extractLabel(titleNode.mainTitle) ||
      extractLabel(titleNode['rdfs:label']) ||
      extractLabel(titleNode.label) ||
      '';

    const subtitle =
      extractLabel(titleNode['bf:subtitle']) ||
      extractLabel(titleNode.subtitle) ||
      '';

    const partNumber = String(titleNode['bf:partNumber'] || titleNode.partNumber || '');
    const partName = String(titleNode['bf:partName'] || titleNode.partName || '');

    return { main, subtitle, partNumber, partName };
  };

  // --- Language mapping dictionary ---
  const LANG_CODE_MAP: Record<string, string> = {
    arabic: 'ara',
    ar: 'ara',
    'العربية': 'ara',
    english: 'eng',
    en: 'eng',
    'الإنجليزية': 'eng',
    french: 'fre',
    fr: 'fre',
    german: 'ger',
    de: 'ger',
    spanish: 'spa',
    es: 'spa',
    persian: 'per',
    farsi: 'per',
    fa: 'per',
    'الفارسية': 'per',
    turkish: 'tur',
    tr: 'tur',
    'التركية': 'tur',
    kurdish: 'kur',
    ku: 'kur',
    'الكردية': 'kur',
    urdu: 'urd',
    ur: 'urd',
    'الأردية': 'urd',
    hebrew: 'heb',
    he: 'heb',
    'العبرية': 'heb',
    italian: 'ita',
    it: 'ita',
    russian: 'rus',
    ru: 'rus',
    chinese: 'chi',
    zh: 'chi',
    japanese: 'jpn',
    ja: 'jpn',
    latin: 'lat',
    la: 'lat',
    syriac: 'syr',
    syr: 'syr',
    'السريانية': 'syr',
  };

  // --- LDR: Leader ---
  fields.push('=LDR  00000nam a2200000 i 4500');

  // --- 001: Control Number ---
  const controlId = instance?.['@id'] || work?.['@id'] || '';
  if (controlId) {
    const controlNumber = controlId.split('/').pop() || controlId;
    fields.push(`=001  ${controlNumber}`);
  }

  // --- 008: Fixed Length Data ---
  const date = new Date().toISOString().slice(2, 8).replace(/-/g, ''); // YYMMDD
  const pubDate = instance?.['bf:provisionActivity']?.[0]?.['bf:date'] || instance?.['provisionActivity']?.[0]?.date || '2024';

  // Extract language codes and labels
  const rawLang = work?.['bf:language'] ?? work?.['language'];
  const langArray = Array.isArray(rawLang) ? rawLang : (rawLang ? [rawLang] : []);
  let primaryLangCode = 'eng';
  const langCodes: string[] = [];
  const langLabels: string[] = [];

  langArray.forEach((l: any) => {
    let code = '';
    const uri = extractUri(l);
    const label = extractLabel(l);
    if (uri && uri.includes('/languages/')) {
      code = uri.split('/languages/').pop()?.split('/')[0]?.split('#')[0] || '';
    } else if (typeof l === 'string' && l.length === 3) {
      code = l.toLowerCase();
    }
    if (!code && label) {
      const lower = label.trim().toLowerCase();
      code = LANG_CODE_MAP[lower] || (lower.length === 3 ? lower : '');
    }
    if (code) {
      code = code.slice(0, 3).toLowerCase();
      if (!langCodes.includes(code)) langCodes.push(code);
    }
    if (label && !langLabels.includes(label)) {
      langLabels.push(label);
    }
  });

  if (langCodes.length > 0) {
    primaryLangCode = langCodes[0];
  }

  fields.push(`=008  ${date}s${String(pubDate).slice(0, 4).padEnd(4, ' ')}    ir      o     000 0 ${primaryLangCode.padEnd(3, ' ')} d`);

  // --- 020: ISBN ---
  const identifiers = Array.isArray(instance?.['bf:identifiedBy']) 
    ? instance['bf:identifiedBy'] 
    : instance?.['bf:identifiedBy'] 
    ? [instance['bf:identifiedBy']] 
    : Array.isArray(instance?.['identifiedBy'])
    ? instance['identifiedBy']
    : [];

  const isbn = identifiers.find((id: any) => 
    id?.['@type'] === 'bf:Isbn' || id?.['@type']?.includes?.('Isbn') || id?.type === 'isbn'
  );
  if (isbn) {
    const isbnValue = extractLabel(isbn);
    if (isbnValue) addField('020', ' ', ' ', [['a', isbnValue]]);
  }

  // --- 040: Cataloging Source ---
  addField('040', ' ', ' ', [
    ['a', 'MOON'],
    ['b', primaryLangCode],
    ['c', 'MOON'],
    ['e', 'rda']
  ]);

  // --- 041: Language Code ---
  if (langCodes.length > 0) {
    addField('041', '0', ' ', langCodes.map(c => ['a', c]));
  }

  // --- 050 / 082 / 084: Classification ---
  const classifications = Array.isArray(work?.['bf:classification'])
    ? work['bf:classification']
    : work?.['bf:classification']
    ? [work['bf:classification']]
    : Array.isArray(work?.['classification'])
    ? work['classification']
    : work?.['classification']
    ? [work['classification']]
    : [];

  classifications.forEach((cls: any) => {
    const portion = cls?.['bf:classificationPortion'] || cls?.classificationPortion || cls?.portion || (typeof cls === 'string' ? cls : extractLabel(cls));
    if (!portion) return;
    const typeStr = String(cls?.['@type'] || '');
    const source = String(cls?.['bf:source']?.['@id'] || cls?.source || '').toLowerCase();
    const edition = cls?.['bf:edition'] || cls?.edition || '';

    if (typeStr.includes('Ddc') || source.includes('ddc') || source.includes('dewey')) {
      const subfields: [string, string][] = [['a', String(portion)]];
      if (edition) subfields.push(['2', String(edition)]);
      addField('082', '0', '4', subfields);
    } else if (typeStr.includes('Lcc') || source.includes('lcc')) {
      addField('050', '0', '0', [['a', String(portion)]]);
    } else {
      const subfields: [string, string][] = [['a', String(portion)]];
      if (source) subfields.push(['2', source]);
      addField('084', ' ', ' ', subfields);
    }
  });

  // --- 100 / 700: Contributions (Authors & Contributors) ---
  const contributions = Array.isArray(work?.['bf:contribution']) 
    ? work['bf:contribution'] 
    : work?.['bf:contribution'] 
    ? [work['bf:contribution']] 
    : Array.isArray(work?.['contribution'])
    ? work['contribution']
    : work?.['contribution']
    ? [work['contribution']]
    : [];

  let hasPrimary = false;
  contributions.forEach((contrib: any, idx: number) => {
    const agentNode = contrib?.['bf:agent'] || contrib?.agent;
    const name = extractLabel(agentNode);
    if (!name) return;
    const uri = extractUri(agentNode);
    const roleNode = contrib?.['bf:role'] || contrib?.role;
    const roleLabel = extractLabel(roleNode) || (typeof roleNode === 'string' ? roleNode : 'author');
    const isPrimary = !hasPrimary && (contrib?.['@type']?.includes('PrimaryContribution') || idx === 0 || roleLabel === 'aut' || roleLabel === 'author');

    const subfields: [string, string][] = [['a', name]];
    if (roleLabel) subfields.push(['e', roleLabel]);
    if (uri) subfields.push(['0', uri]);

    if (isPrimary && !hasPrimary) {
      addField('100', '1', ' ', subfields);
      hasPrimary = true;
    } else {
      addField('700', '1', ' ', subfields);
    }
  });

  // --- 245: Title Statement ---
  const titleField = work?.['bf:title'] ?? work?.['title'] ?? instance?.['bf:title'] ?? instance?.['title'];
  const { main: mainTitle, subtitle, partNumber, partName } = extractTitle(titleField);
  const responsibilityStatement = instance?.['bf:responsibilityStatement'] || instance?.responsibilityStatement || '';

  if (mainTitle) {
    const subfields: [string, string][] = [['a', mainTitle]];
    if (subtitle) subfields.push(['b', subtitle]);
    if (partNumber) subfields.push(['n', partNumber]);
    if (partName) subfields.push(['p', partName]);
    if (responsibilityStatement) subfields.push(['c', responsibilityStatement]);
    addField('245', hasPrimary ? '1' : '0', '0', subfields);
  }

  // --- 250: Edition Statement ---
  const edition = instance?.['bf:editionStatement'] || instance?.editionStatement;
  if (edition) {
    const editionValue = extractLabel(edition);
    if (editionValue) addField('250', ' ', ' ', [['a', editionValue]]);
  }

  // --- 264: Production/Publication/Distribution/Manufacture ---
  const provisionActivities = Array.isArray(instance?.['bf:provisionActivity']) 
    ? instance['bf:provisionActivity'] 
    : instance?.['bf:provisionActivity'] 
    ? [instance['bf:provisionActivity']] 
    : Array.isArray(instance?.['provisionActivity'])
    ? instance['provisionActivity']
    : [];

  provisionActivities.forEach((provision: any) => {
    const place = extractLabel(provision?.['bf:place'] || provision?.place);
    const agent = extractLabel(provision?.['bf:agent'] || provision?.agent);
    const pubD = provision?.['bf:date'] || provision?.date || '';

    let ind2 = '1'; // Publication
    const pType = provision?.['@type'] || '';
    if (pType.includes('Distribution')) ind2 = '2';
    if (pType.includes('Manufacture')) ind2 = '3';
    if (pType.includes('Production')) ind2 = '0';

    const subfields: [string, string][] = [];
    if (place) subfields.push(['a', place]);
    if (agent) subfields.push(['b', agent]);
    if (pubD) subfields.push(['c', String(pubD)]);

    if (subfields.length > 0) {
      addField('264', ' ', ind2, subfields);
    }
  });

  // --- 300: Physical Description ---
  const extent = extractLabel(instance?.['bf:extent'] || instance?.extent);
  const dimensions = extractLabel(instance?.['bf:dimensions'] || instance?.dimensions);
  const illustrations = extractLabel(instance?.['bf:illustrativeContent'] || instance?.illustrativeContent);

  const physicalSubfields: [string, string][] = [];
  if (extent) physicalSubfields.push(['a', extent]);
  if (illustrations) physicalSubfields.push(['b', illustrations]);
  if (dimensions) physicalSubfields.push(['c', dimensions]);

  if (physicalSubfields.length > 0) {
    addField('300', ' ', ' ', physicalSubfields);
  }

  // --- 336: Content Type ---
  const rawContent = work?.['bf:content'] ?? work?.['content'];
  const contentItems = Array.isArray(rawContent) ? rawContent : (rawContent ? [rawContent] : []);
  if (contentItems.length > 0) {
    contentItems.forEach((c: any) => {
      const label = extractLabel(c) || 'text';
      const uri = extractUri(c);
      const subfields: [string, string][] = [['a', label]];
      if (label === 'text') subfields.push(['b', 'txt']);
      else if (label.includes('image')) subfields.push(['b', 'sti']);
      else if (label.includes('audio') || label.includes('spoken')) subfields.push(['b', 'snd']);
      else if (label.includes('video')) subfields.push(['b', 'vdo']);
      subfields.push(['2', 'rdacontent']);
      if (uri) subfields.push(['0', uri]);
      addField('336', ' ', ' ', subfields);
    });
  } else {
    addField('336', ' ', ' ', [['a', 'text'], ['b', 'txt'], ['2', 'rdacontent']]);
  }

  // --- 337: Media Type ---
  const rawMedia = instance?.['bf:media'] ?? instance?.['media'];
  const mediaItems = Array.isArray(rawMedia) ? rawMedia : (rawMedia ? [rawMedia] : []);
  if (mediaItems.length > 0) {
    mediaItems.forEach((m: any) => {
      const label = extractLabel(m) || 'unmediated';
      const uri = extractUri(m);
      const subfields: [string, string][] = [['a', label], ['b', label === 'unmediated' ? 'n' : 'c'], ['2', 'rdamedia']];
      if (uri) subfields.push(['0', uri]);
      addField('337', ' ', ' ', subfields);
    });
  } else {
    addField('337', ' ', ' ', [['a', 'unmediated'], ['b', 'n'], ['2', 'rdamedia']]);
  }

  // --- 338: Carrier Type ---
  const rawCarrier = instance?.['bf:carrier'] ?? instance?.['carrier'];
  const carrierItems = Array.isArray(rawCarrier) ? rawCarrier : (rawCarrier ? [rawCarrier] : []);
  if (carrierItems.length > 0) {
    carrierItems.forEach((c: any) => {
      const label = extractLabel(c) || 'volume';
      const uri = extractUri(c);
      const subfields: [string, string][] = [['a', label], ['b', label === 'volume' ? 'nc' : 'cr'], ['2', 'rdacarrier']];
      if (uri) subfields.push(['0', uri]);
      addField('338', ' ', ' ', subfields);
    });
  } else {
    addField('338', ' ', ' ', [['a', 'volume'], ['b', 'nc'], ['2', 'rdacarrier']]);
  }

  // --- 490: Series Statement ---
  const seriesStatement = instance?.['bf:seriesStatement'] || instance?.seriesStatement;
  if (seriesStatement) {
    const seriesValue = extractLabel(seriesStatement);
    if (seriesValue) addField('490', '0', ' ', [['a', seriesValue]]);
  }

  // --- 500: General Notes ---
  const notes = Array.isArray(instance?.['bf:note']) 
    ? instance['bf:note'] 
    : instance?.['bf:note'] 
    ? [instance['bf:note']] 
    : Array.isArray(instance?.['note'])
    ? instance['note']
    : [];

  notes.forEach((note: any) => {
    const noteValue = extractLabel(note);
    if (noteValue) addField('500', ' ', ' ', [['a', noteValue]]);
  });

  // --- 520: Summary/Abstract ---
  const summaries = Array.isArray(work?.['bf:summary']) 
    ? work['bf:summary'] 
    : work?.['bf:summary'] 
    ? [work['bf:summary']] 
    : Array.isArray(work?.['summary'])
    ? work['summary']
    : [];

  summaries.forEach((summary: any) => {
    const summaryValue = extractLabel(summary);
    if (summaryValue) addField('520', ' ', ' ', [['a', summaryValue]]);
  });

  // --- 546: Language Note ---
  if (langLabels.length > 0) {
    addField('546', ' ', ' ', [['a', langLabels.join('; ')]]);
  }

  // --- 600 / 610 / 650 / 651: Subject Added Entries ---
  const subjects = Array.isArray(work?.['bf:subject']) 
    ? work['bf:subject'] 
    : work?.['bf:subject'] 
    ? [work['bf:subject']] 
    : Array.isArray(work?.['subject'])
    ? work['subject']
    : work?.['subject']
    ? [work['subject']]
    : [];

  subjects.forEach((subj: any) => {
    const label = extractLabel(subj);
    if (!label) return;
    const uri = extractUri(subj);
    const desc = (subj?.description || subj?.desc || '').toLowerCase();
    const typeStr = String(subj?.['@type'] || '');

    const isPerson = 
      typeStr.includes('Person') || 
      desc.includes('person') || 
      desc.includes('given name') || 
      desc.includes('male') ||
      desc.includes('female') ||
      desc.includes('human') ||
      desc.includes('author') ||
      desc.includes('scholar') ||
      subj?.source === 'VIAF';

    const isOrg = typeStr.includes('Organization') || desc.includes('organization') || desc.includes('company');
    const isPlace = typeStr.includes('Place') || desc.includes('country') || desc.includes('city') || desc.includes('place');

    const subfields: [string, string][] = [['a', label]];
    if (uri) subfields.push(['0', uri]);
    if (subj?.source === 'Wikidata') subfields.push(['2', 'wikidata']);
    else if (subj?.source === 'FAST') subfields.push(['2', 'fast']);

    if (isPerson) {
      addField('600', '1', uri ? '7' : '0', subfields);
    } else if (isOrg) {
      addField('610', '2', uri ? '7' : '0', subfields);
    } else if (isPlace) {
      addField('651', ' ', uri ? '7' : '0', subfields);
    } else {
      addField('650', ' ', uri ? '7' : '0', subfields);
    }
  });

  // --- 655: Index Term - Genre/Form ---
  const genres = Array.isArray(work?.['bf:genreForm']) 
    ? work['bf:genreForm'] 
    : work?.['bf:genreForm'] 
    ? [work['bf:genreForm']] 
    : Array.isArray(work?.['genreForm'])
    ? work['genreForm']
    : [];

  genres.forEach((genre: any) => {
    const genreValue = extractLabel(genre);
    if (genreValue) addField('655', ' ', '7', [['a', genreValue], ['2', 'lcgft']]);
  });

  // --- 856: Electronic Location and Access ---
  const electronicLocators = Array.isArray(instance?.['bf:electronicLocator']) 
    ? instance['bf:electronicLocator'] 
    : instance?.['bf:electronicLocator'] 
    ? [instance['bf:electronicLocator']] 
    : Array.isArray(instance?.['electronicLocator'])
    ? instance['electronicLocator']
    : [];

  electronicLocators.forEach((locator: any) => {
    const uri = extractUri(locator) || extractLabel(locator);
    if (uri && uri.startsWith('http')) addField('856', '4', '0', [['u', uri]]);
  });

  return fields.join('\n');
}

/**
 * Download MARC record as .mrc file
 */
export function downloadMARCFile(work: any, instance: any, filename: string = 'record.mrc') {
  const marcString = generateMARC(work, instance);
  const blob = new Blob([marcString], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validate MARC record completeness
 */
export function validateMARC(work: any, instance: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!work?.['bf:title'] && !work?.['title'] && !instance?.['bf:title'] && !instance?.['title']) {
    errors.push('Missing title (245 field)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Alias export for compatibility
 */
export const generateMARCFromBibframe = generateMARC;
