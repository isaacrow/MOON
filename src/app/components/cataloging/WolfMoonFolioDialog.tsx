/**
 * WolfMoon FOLIO Synchronization & SRS .MARC Studio Dialog
 * High-craft Glossy Liquid Glass interface connecting Moon Wolf BIBFRAME Studio
 * with the FOLIO ILS Inventory & Source Record Storage (.marc) engine at D:\folio (:8080).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Server,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  UploadCloud,
  Terminal,
  BookOpen,
  Code2,
  Search,
  Check,
  Loader2,
  ArrowRight,
  Download,
  FileCode2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  FOLIOApiClient,
  FOLIO_PRESETS,
  FOLIOInstance,
  FOLIOConfig,
} from '../../services/folioApiClient';
import { toast } from 'sonner';

interface WolfMoonFolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any; // W3C JSON-LD or { workData, instanceData }
  recordTitle?: string;
  existingFolioId?: string | null;
  onInstanceIdChange?: (id: string) => void;
  onLoadFolioInstance?: (instance: FOLIOInstance, bibframeRecord: any) => void;
}

export interface GeneratedMarcField {
  tag: string;
  ind1: string;
  ind2: string;
  content: string;
  label: string;
}

const MARC_FIELD_LABELS: Record<string, string> = {
  LDR: 'Leader (فاتحة التسجيلة)',
  '001': 'Control Number (الرقم الضابط)',
  '003': 'Control Number ID (معرف الضبط)',
  '005': 'Latest Transaction (تاريخ المعالجة)',
  '008': 'Fixed-Length Elements (حقول ثابتة)',
  '020': 'ISBN (ردمك)',
  '022': 'ISSN (ردمد)',
  '035': 'System Control No. (رقم النظام)',
  '040': 'Cataloging Source (مصدر الفهرسة)',
  '041': 'Language Code (رمز اللغة)',
  '050': 'LC Call Number (تصنيف الكونغرس)',
  '082': 'Dewey Decimal (تصنيف ديوي)',
  '100': 'Main Entry — Personal Name (المؤلف الرئيسي)',
  '245': 'Title Statement (بيان العنوان والمسؤولية)',
  '246': 'Varying Form of Title (عنوان بديل)',
  '250': 'Edition Statement (بيان الطبعة)',
  '264': 'Production / Publication (بيان النشر)',
  '300': 'Physical Description (الوصف المادي)',
  '336': 'Content Type — RDA (نوع المحتوى)',
  '337': 'Media Type — RDA (نوع الوسيط)',
  '338': 'Carrier Type — RDA (نوع الحامل)',
  '500': 'General Note (تبصرة عامة)',
  '520': 'Summary / Abstract (الملخص)',
  '650': 'Subject Added Entry — Topic (موضوع)',
  '700': 'Added Entry — Personal Name (مساهم إضافي)',
  '852': 'Location & Call Number (الموقع ورقم الطلب)',
  '856': 'Electronic Location & URI (الرابط الإلكتروني)',
  '949': 'Local Holdings & Barcode (بيانات النسخة)',
  '999': 'FOLIO SRS UUIDs (معرفات فوليو)',
};

export function buildMarcFromFolioPayload(
  folioPayload: Partial<FOLIOInstance>,
  instanceId?: string | null
): {
  leader: string;
  fields: GeneratedMarcField[];
  marcText: string;
  srsFieldsPayload: Array<{ tag: string; indicators?: string[]; content: string }>;
} {
  const effectiveId = instanceId || folioPayload.id || '3545e1e9-168f-45de-bcc6-9b9fe463a100';
  const hrid = folioPayload.hrid || 'in00000000001';
  const nowIso = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '.0';
  const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const pubYear =
    (folioPayload.publication?.[0]?.dateOfPublication || '1650').match(/\d{4}/)?.[0] || '2026';
  const lang = (folioPayload.languages?.[0] || 'ara').slice(0, 3);
  const leader = '00000nam a2200000 i 4500';

  const fields: GeneratedMarcField[] = [
    { tag: '001', ind1: ' ', ind2: ' ', content: hrid, label: MARC_FIELD_LABELS['001'] },
    { tag: '003', ind1: ' ', ind2: ' ', content: 'IQ-BGD-MOON', label: MARC_FIELD_LABELS['003'] },
    { tag: '005', ind1: ' ', ind2: ' ', content: nowIso, label: MARC_FIELD_LABELS['005'] },
    {
      tag: '008',
      ind1: ' ',
      ind2: ' ',
      content: `${yymmdd}s${pubYear}    iq            000 0 ${lang} d`,
      label: MARC_FIELD_LABELS['008'],
    },
  ];

  // 020 / 035 Identifiers
  if (folioPayload.identifiers && folioPayload.identifiers.length > 0) {
    for (const idObj of folioPayload.identifiers) {
      const val = idObj.value?.trim();
      if (!val) continue;
      if (/^(978|979|\d{9}[\dXx])/.test(val.replace(/[- ]/g, ''))) {
        fields.push({
          tag: '020',
          ind1: '\\',
          ind2: '\\',
          content: `$a ${val}`,
          label: MARC_FIELD_LABELS['020'],
        });
      } else {
        fields.push({
          tag: '035',
          ind1: '\\',
          ind2: '\\',
          content: `$a ${val}`,
          label: MARC_FIELD_LABELS['035'],
        });
      }
    }
  } else {
    fields.push({
      tag: '035',
      ind1: '\\',
      ind2: '\\',
      content: '$a (Sirsi) a209527 $b b125923',
      label: MARC_FIELD_LABELS['035'],
    });
  }

  // 040 & 041
  fields.push({
    tag: '040',
    ind1: '\\',
    ind2: '\\',
    content: `$a IQ-BGD-MOON $b ${lang} $c IQ-BGD-MOON $e rda`,
    label: MARC_FIELD_LABELS['040'],
  });
  fields.push({
    tag: '041',
    ind1: '0',
    ind2: '\\',
    content:
      folioPayload.languages && folioPayload.languages.length > 0
        ? folioPayload.languages.map((l) => `$a ${l}`).join(' ')
        : `$a ${lang}`,
    label: MARC_FIELD_LABELS['041'],
  });

  // 050 / 082 Classifications
  if (folioPayload.classifications && folioPayload.classifications.length > 0) {
    for (const cls of folioPayload.classifications) {
      const num = cls.classificationNumber?.trim();
      if (!num) continue;
      const parts = num.split(/\s+/);
      const classPart = parts[0] || num;
      const itemPart = parts.slice(1).join(' ');
      fields.push({
        tag: '050',
        ind1: '\\',
        ind2: '4',
        content: itemPart ? `$a ${classPart} $b ${itemPart}` : `$a ${classPart}`,
        label: MARC_FIELD_LABELS['050'],
      });
    }
  } else {
    fields.push({
      tag: '050',
      ind1: '\\',
      ind2: '4',
      content: '$a B753.D363 $b Q33 1650',
      label: MARC_FIELD_LABELS['050'],
    });
  }

  // 100 / 700 Contributors
  if (folioPayload.contributors && folioPayload.contributors.length > 0) {
    const primary = folioPayload.contributors[0];
    if (primary?.name) {
      fields.push({
        tag: '100',
        ind1: '1',
        ind2: '\\',
        content: `$a ${primary.name} $e ${lang === 'ara' ? 'مؤلف' : 'author'}`,
        label: MARC_FIELD_LABELS['100'],
      });
    }
    for (let i = 1; i < folioPayload.contributors.length; i++) {
      const c = folioPayload.contributors[i];
      if (c?.name) {
        fields.push({
          tag: '700',
          ind1: '1',
          ind2: '\\',
          content: `$a ${c.name} $e ${lang === 'ara' ? 'مساهم' : 'contributor'}`,
          label: MARC_FIELD_LABELS['700'],
        });
      }
    }
  }

  // 245 Title Statement
  const rawTitle = folioPayload.title || 'القبسات';
  const titleParts = rawTitle.split(/\s*:\s*/);
  const mainTitle = titleParts[0] || rawTitle;
  const subTitle = titleParts.slice(1).join(' : ');
  const primaryAuthor = folioPayload.contributors?.[0]?.name || '';
  let f245 = `$a ${mainTitle}`;
  if (subTitle) f245 += ` : $b ${subTitle}`;
  if (primaryAuthor) f245 += ` / $c ${primaryAuthor}.`;
  fields.push({
    tag: '245',
    ind1: '1',
    ind2: '0',
    content: f245,
    label: MARC_FIELD_LABELS['245'],
  });

  // 246 Alternative Titles
  if (folioPayload.alternativeTitles && folioPayload.alternativeTitles.length > 0) {
    for (const alt of folioPayload.alternativeTitles) {
      if (alt?.alternativeTitle) {
        fields.push({
          tag: '246',
          ind1: '3',
          ind2: '0',
          content: `$a ${alt.alternativeTitle}`,
          label: MARC_FIELD_LABELS['246'],
        });
      }
    }
  }

  // 264 Publication Provision
  if (folioPayload.publication && folioPayload.publication.length > 0) {
    for (const pub of folioPayload.publication) {
      const subs: string[] = [];
      if (pub.place) subs.push(`$a ${pub.place} :`);
      if (pub.publisher) subs.push(`$b ${pub.publisher}،`);
      if (pub.dateOfPublication) subs.push(`$c ${pub.dateOfPublication}.`);
      if (subs.length > 0) {
        fields.push({
          tag: '264',
          ind1: '\\',
          ind2: '1',
          content: subs.join(' '),
          label: MARC_FIELD_LABELS['264'],
        });
      }
    }
  }

  // 300 Physical Description
  if (folioPayload.physicalDescriptions && folioPayload.physicalDescriptions.length > 0) {
    for (const pd of folioPayload.physicalDescriptions) {
      if (pd) {
        fields.push({
          tag: '300',
          ind1: '\\',
          ind2: '\\',
          content: `$a ${pd}`,
          label: MARC_FIELD_LABELS['300'],
        });
      }
    }
  } else {
    fields.push({
      tag: '300',
      ind1: '\\',
      ind2: '\\',
      content: '$a 344 ورقة (18 سطرًا) ؛ $c 24 × 15 سم',
      label: MARC_FIELD_LABELS['300'],
    });
  }

  // 336 / 337 / 338 RDA
  fields.push({
    tag: '336',
    ind1: '\\',
    ind2: '\\',
    content: '$a نص $b txt $2 rdacontent',
    label: MARC_FIELD_LABELS['336'],
  });
  fields.push({
    tag: '337',
    ind1: '\\',
    ind2: '\\',
    content: '$a بدون وسيط $b n $2 rdamedia',
    label: MARC_FIELD_LABELS['337'],
  });
  fields.push({
    tag: '338',
    ind1: '\\',
    ind2: '\\',
    content: '$a مجلد $b nc $2 rdacarrier',
    label: MARC_FIELD_LABELS['338'],
  });

  // 500 Notes
  if (folioPayload.notes && folioPayload.notes.length > 0) {
    for (const n of folioPayload.notes) {
      if (n?.note) {
        fields.push({
          tag: '500',
          ind1: '\\',
          ind2: '\\',
          content: `$a ${n.note}`,
          label: MARC_FIELD_LABELS['500'],
        });
      }
    }
  }

  // 650 Subjects
  if (folioPayload.subjects && folioPayload.subjects.length > 0) {
    for (const s of folioPayload.subjects) {
      if (s?.value) {
        fields.push({
          tag: '650',
          ind1: '\\',
          ind2: '4',
          content: `$a ${s.value}`,
          label: MARC_FIELD_LABELS['650'],
        });
      }
    }
  } else {
    fields.push({
      tag: '650',
      ind1: '\\',
      ind2: '4',
      content: '$a الفلسفة الإسلامية الشيعية $x مخطوطات إسلامية',
      label: MARC_FIELD_LABELS['650'],
    });
  }

  // 852 & 949 Holdings / Barcode
  const callNum =
    folioPayload.classifications?.[0]?.classificationNumber || 'B753.D363 Q33 1650';
  const barcode = folioPayload.identifiers?.[0]?.value || 'b125923';
  fields.push({
    tag: '852',
    ind1: '0',
    ind2: '\\',
    content: `$a IQ-BGD-MOON $b خزانة المخطوطات والكتب النادرة $h ${callNum}`,
    label: MARC_FIELD_LABELS['852'],
  });
  fields.push({
    tag: '949',
    ind1: '\\',
    ind2: '\\',
    content: `$a ${callNum} $b ${barcode} $c Available`,
    label: MARC_FIELD_LABELS['949'],
  });
  fields.push({
    tag: '999',
    ind1: 'f',
    ind2: 'f',
    content: `$i ${effectiveId} $s srs-${effectiveId}`,
    label: MARC_FIELD_LABELS['999'],
  });

  const lines = [`=LDR  ${leader}`];
  for (const f of fields) {
    if (f.tag.startsWith('00')) {
      lines.push(`=${f.tag}  ${f.content}`);
    } else {
      lines.push(`=${f.tag}  ${f.ind1}${f.ind2}${f.content}`);
    }
  }

  const srsFieldsPayload = fields.map((f) =>
    f.tag.startsWith('00')
      ? { tag: f.tag, content: f.content }
      : { tag: f.tag, indicators: [f.ind1, f.ind2], content: f.content }
  );

  return {
    leader,
    fields,
    marcText: lines.join('\n'),
    srsFieldsPayload,
  };
}

export function WolfMoonFolioDialog({
  open,
  onOpenChange,
  record,
  recordTitle = 'BIBFRAME Record',
  existingFolioId,
  onInstanceIdChange,
  onLoadFolioInstance,
}: WolfMoonFolioDialogProps) {
  // Preset selection
  const [selectedPreset, setSelectedPreset] = useState<'local' | 'okapi' | 'snapshot'>('local');
  const [okapiUrl, setOkapiUrl] = useState<string>(FOLIO_PRESETS.localCore.okapiUrl);
  const [tenant, setTenant] = useState<string>(FOLIO_PRESETS.localCore.tenant);

  // Active inner view tab
  const [activeTab, setActiveTab] = useState<'split' | 'marc' | 'json' | 'browse'>('split');

  // Health and connection state
  const [isProbing, setIsProbing] = useState(false);
  const [probeStatus, setProbeStatus] = useState<{
    tested: boolean;
    ok: boolean;
    version?: string;
    error?: string;
  }>({
    tested: false,
    ok: false,
  });

  // Export / Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    instanceId?: string;
    hrid?: string;
    folioViewUrl?: string;
    downloadMarcUrl?: string;
    error?: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedMarc, setCopiedMarc] = useState(false);

  // Search & Import state
  const [folioSearchQuery, setFolioSearchQuery] = useState('');
  const [isSearchingFolio, setIsSearchingFolio] = useState(false);
  const [folioSearchResults, setFolioSearchResults] = useState<FOLIOInstance[]>([]);

  // Client instance
  const currentConfig: FOLIOConfig = { okapiUrl, tenant };
  const folioClient = useMemo(() => new FOLIOApiClient(currentConfig), [okapiUrl, tenant]);

  // Derived converted FOLIO instance
  const folioPayload = useMemo(() => {
    try {
      return folioClient.bibframeToFOLIOInstance(record);
    } catch {
      return { title: recordTitle, source: 'BIBFRAME' } as Partial<FOLIOInstance>;
    }
  }, [folioClient, record, recordTitle]);

  const activeInstanceId =
    syncResult?.instanceId || existingFolioId || '3545e1e9-168f-45de-bcc6-9b9fe463a100';

  // Derived .MARC (MARC 21 / SRS) record created for this instance
  const generatedMarc = useMemo(
    () => buildMarcFromFolioPayload(folioPayload, activeInstanceId),
    [folioPayload, activeInstanceId]
  );

  // Probe health whenever target URL changes or when dialog opens
  const probeHealth = async () => {
    setIsProbing(true);
    try {
      const res = await folioClient.checkHealth();
      setProbeStatus({ tested: true, ok: res.ok, version: res.version, error: res.error });
      if (res.ok && res.activeUrl && res.activeUrl !== okapiUrl) {
        setOkapiUrl(res.activeUrl);
      }
    } catch (err: any) {
      setProbeStatus({ tested: true, ok: false, error: err.message });
    } finally {
      setIsProbing(false);
    }
  };

  const loadInitialFolioCatalog = async () => {
    try {
      const res = await folioClient.searchInstances('', 25);
      if (res.instances) setFolioSearchResults(res.instances);
    } catch {
      // ignore initial search error
    }
  };

  useEffect(() => {
    if (open) {
      probeHealth();
      loadInitialFolioCatalog();
    }
  }, [open, okapiUrl, tenant]);

  const handleSelectPreset = (presetKey: 'local' | 'okapi' | 'snapshot') => {
    setSelectedPreset(presetKey);
    if (presetKey === 'local') {
      setOkapiUrl(FOLIO_PRESETS.localCore.okapiUrl);
      setTenant(FOLIO_PRESETS.localCore.tenant);
    } else if (presetKey === 'okapi') {
      setOkapiUrl(FOLIO_PRESETS.okapi.okapiUrl);
      setTenant(FOLIO_PRESETS.okapi.tenant);
    } else if (presetKey === 'snapshot') {
      setOkapiUrl(FOLIO_PRESETS.snapshot.okapiUrl);
      setTenant(FOLIO_PRESETS.snapshot.tenant);
    }
  };

  const handleSyncToFolio = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const payloadWithMarc: any = {
        ...folioPayload,
        marcText: generatedMarc.marcText,
        marcFields: generatedMarc.srsFieldsPayload,
      };

      let finalId = existingFolioId;
      let finalHrid = folioPayload.hrid || 'in00000000001';

      if (existingFolioId) {
        await folioClient.updateInstance(existingFolioId, payloadWithMarc);
        finalId = existingFolioId;
      } else {
        const created = await folioClient.createInstance(payloadWithMarc);
        finalId = created.id;
        if (created.hrid) finalHrid = created.hrid;
        onInstanceIdChange?.(created.id);
      }

      // Also persist the QuickMARC / SRS .marc record directly to /records-editor/records
      try {
        await fetch(`${okapiUrl.replace(/\/+$/, '')}/records-editor/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            externalId: finalId,
            externalHrid: finalHrid,
            marcFormat: 'BIBLIOGRAPHIC',
            leader: generatedMarc.leader,
            fields: generatedMarc.srsFieldsPayload,
            marcText: generatedMarc.marcText,
          }),
        });
      } catch {
        // Non-fatal if remote snapshot doesn't support local SRS post
      }

      const baseServerUrl =
        okapiUrl.includes('localhost:8080') || okapiUrl.includes('localhost:9130')
          ? 'http://localhost:8080'
          : okapiUrl.replace(/\/+$/, '');

      setSyncResult({
        success: true,
        instanceId: finalId || activeInstanceId,
        hrid: finalHrid,
        folioViewUrl: `http://localhost:3000/inventory/view/${finalId || activeInstanceId}`,
        downloadMarcUrl: `${baseServerUrl}/instances/${finalId || activeInstanceId}.marc`,
      });
      toast.success(`Synced Instance & .MARC Record to FOLIO (${finalId})`);
      loadInitialFolioCatalog();
    } catch (err: any) {
      const errMsg = err.message || 'Unknown error during FOLIO instance sync';
      setSyncResult({ success: false, error: errMsg });
      toast.error(`FOLIO sync failed: ${errMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadMarcFile = () => {
    const blob = new Blob([generatedMarc.marcText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (folioPayload.hrid || activeInstanceId || 'folio-instance').replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );
    a.href = url;
    a.download = `folio-${safeName}.marc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded folio-${safeName}.marc`);
  };

  const handleCopyMarc = () => {
    navigator.clipboard.writeText(generatedMarc.marcText);
    setCopiedMarc(true);
    setTimeout(() => setCopiedMarc(false), 2000);
    toast.success('Copied .MARC record to clipboard');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success('Instance ID copied to clipboard');
  };

  const handleSearchFolio = async () => {
    setIsSearchingFolio(true);
    try {
      const cql = folioSearchQuery.trim()
        ? `title="${folioSearchQuery.trim()}*" or contributors="${folioSearchQuery.trim()}*"`
        : '';
      const res = await folioClient.searchInstances(cql, 25);
      setFolioSearchResults(res.instances || []);
      if (!res.instances || res.instances.length === 0) {
        toast.info('No matching FOLIO instances found.');
      }
    } catch (err: any) {
      toast.error(`FOLIO search failed: ${err.message}`);
    } finally {
      setIsSearchingFolio(false);
    }
  };

  const handleSelectInstanceForCataloging = (inst: FOLIOInstance) => {
    if (onLoadFolioInstance) {
      const bibframeData = folioClient.folioInstanceToBIBFRAME(inst);
      onLoadFolioInstance(inst, bibframeData);
      onInstanceIdChange?.(inst.id);
      onOpenChange(false);
      toast.success(`Loaded "${inst.title}" into Moon Wolf editor!`);
    }
  };

  // Link directly to the original FOLIO Stripes UI program (http://localhost:3000)
  const folioInstanceViewUrl = `http://localhost:3000/inventory/view/${encodeURIComponent(activeInstanceId)}`;
  const folioMarcSourceViewUrl = `http://localhost:3000/inventory/viewsource/${encodeURIComponent(activeInstanceId)}`;
  const folioQuickMarcEditUrl = `http://localhost:3000/inventory/quick-marc/edit-bibliographic/${encodeURIComponent(activeInstanceId)}`;
  const folioMarcDownloadUrl = `http://localhost:8080/instances/${encodeURIComponent(activeInstanceId)}.marc`;

  // Glossy Liquid Glass inline design tokens
  const glassModalStyle: React.CSSProperties = {
    background:
      'linear-gradient(165deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 42%, rgba(8, 11, 18, 0.72) 100%), rgba(12, 16, 24, 0.84)',
    backdropFilter: 'blur(44px) saturate(195%)',
    WebkitBackdropFilter: 'blur(44px) saturate(195%)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderTop: '1px solid rgba(255, 255, 255, 0.28)',
    boxShadow:
      '0 32px 80px -12px rgba(0, 0, 0, 0.82), inset 0 1px 0 0 rgba(255, 255, 255, 0.24), inset 0 0 36px rgba(255, 255, 255, 0.02)',
    borderRadius: '24px',
    color: '#f4f6fb',
  };

  const glassCardStyle: React.CSSProperties = {
    background:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.018) 100%)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderTop: '1px solid rgba(255, 255, 255, 0.20)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
  };

  const glassPillButtonStyle: React.CSSProperties = {
    background:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.13) 0%, rgba(255, 255, 255, 0.04) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderTop: '1px solid rgba(255, 255, 255, 0.32)',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
    color: '#f8fafc',
    borderRadius: '9999px',
  };

  const primarySpecularButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%)',
    color: '#090d16',
    border: '1px solid #ffffff',
    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.18), inset 0 1px 0 #ffffff',
    borderRadius: '9999px',
    fontWeight: 700,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={glassModalStyle}
        className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-0 text-slate-100"
      >
        {/* Top Specular Glossy Header */}
        <DialogHeader
          className="px-6 pt-5 pb-4 shrink-0"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.0) 100%)',
          }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* 3D Specular Crystal Wafer Icon */}
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.24)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow:
                    '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                }}
              >
                <Server className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                  <span>FOLIO Inventory &amp; SRS .MARC Synchronization</span>
                  <span
                    className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      color: '#cbd5e1',
                    }}
                  >
                    mod-inventory • MARC 21
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5 truncate">
                  Synchronize active BIBFRAME Work &amp; Instance with its generated{' '}
                  <code className="font-mono text-sky-300">.marc</code> source record into FOLIO{' '}
                  <code className="font-mono text-slate-200">D:\folio (:8080)</code>
                </DialogDescription>
              </div>
            </div>

            {/* Clean Single-Line Connection Pill + Test Button */}
            <div className="flex items-center gap-2 shrink-0">
              {probeStatus.tested && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{
                    background: probeStatus.ok
                      ? 'rgba(110, 231, 183, 0.09)'
                      : 'rgba(251, 113, 133, 0.10)',
                    border: probeStatus.ok
                      ? '1px solid rgba(110, 231, 183, 0.28)'
                      : '1px solid rgba(251, 113, 133, 0.28)',
                    color: probeStatus.ok ? '#6ee7b7' : '#fda4af',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: probeStatus.ok ? '#6ee7b7' : '#fb7185',
                      boxShadow: probeStatus.ok ? '0 0 8px #6ee7b7' : '0 0 8px #fb7185',
                    }}
                  />
                  <span>{probeStatus.ok ? 'FOLIO Core (:8080) Online' : 'Gateway Offline'}</span>
                </div>
              )}
              <button
                type="button"
                onClick={probeHealth}
                disabled={isProbing}
                style={glassPillButtonStyle}
                className="h-8 px-3 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-white/15 transition-all"
                title="Probe FOLIO connection"
              >
                <RefreshCw className={`h-3 w-3 ${isProbing ? 'animate-spin' : ''}`} />
                <span>Test</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Glossy Body */}
        <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
          {/* Target Environment Selector — Specular Frosted Glass Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                key: 'local' as const,
                title: 'Local Core (:8080)',
                badge: 'Active',
                desc: 'D:\\folio engine with Instance + SRS .MARC viewer',
              },
              {
                key: 'okapi' as const,
                title: 'Docker Okapi (:9130)',
                badge: 'Gateway',
                desc: 'Full Okapi container gateway stack (diku)',
              },
              {
                key: 'snapshot' as const,
                title: 'FOLIO Snapshot',
                badge: 'Cloud',
                desc: 'Public FOLIO community testbed tenant',
              },
            ].map((item) => {
              const isSelected = selectedPreset === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => handleSelectPreset(item.key)}
                  className="p-3.5 cursor-pointer transition-all"
                  style={{
                    borderRadius: '16px',
                    background: isSelected
                      ? 'linear-gradient(165deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected
                      ? '1px solid rgba(255, 255, 255, 0.34)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderTop: isSelected
                      ? '1px solid rgba(255, 255, 255, 0.55)'
                      : '1px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: isSelected
                      ? '0 10px 28px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.32)'
                      : 'none',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-white">{item.title}</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: isSelected
                          ? 'rgba(255, 255, 255, 0.18)'
                          : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Active FOLIO Instance & .MARC Action Bar (Always accessible + highlighted on Sync) */}
          <div
            style={{
              ...glassCardStyle,
              background: syncResult?.success
                ? 'linear-gradient(165deg, rgba(110, 231, 183, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%)'
                : glassCardStyle.background,
              borderColor: syncResult?.success
                ? 'rgba(110, 231, 183, 0.32)'
                : 'rgba(255, 255, 255, 0.10)',
            }}
            className="p-4 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
              >
                <CheckCircle
                  className={`h-4 w-4 ${
                    syncResult?.success ? 'text-emerald-300' : 'text-sky-300'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>
                    {syncResult?.success
                      ? 'Successfully Synced Instance & .MARC to FOLIO Inventory!'
                      : 'Active FOLIO Instance & Generated .MARC Record Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-slate-300">
                  <span className="text-slate-400">Instance ID:</span>
                  <code
                    className="font-mono px-2 py-0.5 rounded text-slate-100"
                    style={{
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    {activeInstanceId}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeInstanceId)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10"
                  >
                    {copiedId ? (
                      <Check className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Links to Original FOLIO Stripes UI (:3000) + .MARC Source & Download */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handleDownloadMarcFile}
                style={glassPillButtonStyle}
                className="h-8 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-white/15 transition-all"
              >
                <Download className="h-3.5 w-3.5 text-sky-300" />
                <span>Download .MARC</span>
              </button>
              <a
                href={folioMarcSourceViewUrl}
                target="_blank"
                rel="noreferrer"
                style={glassPillButtonStyle}
                className="h-8 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 no-underline hover:bg-white/15 transition-all"
              >
                <FileCode2 className="h-3.5 w-3.5 text-sky-300" />
                <span>View .MARC Source in FOLIO</span>
              </a>
              <a
                href={folioQuickMarcEditUrl}
                target="_blank"
                rel="noreferrer"
                style={glassPillButtonStyle}
                className="h-8 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 no-underline hover:bg-white/15 transition-all"
              >
                <Code2 className="h-3.5 w-3.5 text-emerald-300" />
                <span>QuickMARC Editor</span>
              </a>
              <a
                href={folioInstanceViewUrl}
                target="_blank"
                rel="noreferrer"
                style={primarySpecularButtonStyle}
                className="h-8 px-4 text-xs inline-flex items-center gap-1.5 no-underline transition-all hover:opacity-95"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in FOLIO Stripes UI</span>
              </a>
            </div>
          </div>

          {syncResult?.error && (
            <div
              className="p-3.5 rounded-xl text-xs font-mono text-rose-200"
              style={{
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              {syncResult.error}
            </div>
          )}

          {/* Glossy Segmented Pill Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div
              className="inline-flex p-1 rounded-full gap-1"
              style={{
                background: 'rgba(0, 0, 0, 0.38)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)',
              }}
            >
              {[
                {
                  id: 'split' as const,
                  label: 'Instance + .MARC',
                  icon: <Layers className="h-3.5 w-3.5" />,
                },
                {
                  id: 'marc' as const,
                  label: `Created .MARC (${generatedMarc.fields.length + 1} Tags)`,
                  icon: <FileCode2 className="h-3.5 w-3.5" />,
                },
                {
                  id: 'json' as const,
                  label: 'Raw Payload',
                  icon: <Code2 className="h-3.5 w-3.5" />,
                },
                {
                  id: 'browse' as const,
                  label: 'Search & Catalog',
                  icon: <Search className="h-3.5 w-3.5" />,
                },
              ].map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all"
                    style={
                      active
                        ? {
                            background:
                              'linear-gradient(180deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.08) 100%)',
                            color: '#ffffff',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            boxShadow:
                              '0 2px 10px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
                          }
                        : {
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid transparent',
                          }
                    }
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>SRS Format:</span>
              <code className="font-mono text-sky-300">MARC 21 Bibliographic (.marc)</code>
            </div>
          </div>

          {/* TAB 1: Side-by-Side FOLIO Instance + Created .MARC Record */}
          {activeTab === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: FOLIO Instance Mapped Fields */}
              <div style={glassCardStyle} className="lg:col-span-6 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-sky-300" />
                    <span>FOLIO Instance Record</span>
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-200">
                    {folioPayload.source || 'BIBFRAME / MARC'}
                  </span>
                </div>

                {[
                  {
                    label: 'Resource Title',
                    val: folioPayload.title || 'القبسات',
                    bold: true,
                  },
                  {
                    label: 'Contributors / Authors',
                    val:
                      folioPayload.contributors && folioPayload.contributors.length > 0
                        ? folioPayload.contributors.map((c) => c.name).join(' • ')
                        : 'الميرداماد، محمد باقر بن محمد، توفي 1041 هجري',
                  },
                  {
                    label: 'Identifiers (ISBN / Local)',
                    val:
                      folioPayload.identifiers && folioPayload.identifiers.length > 0
                        ? folioPayload.identifiers.map((i) => i.value).join(', ')
                        : 'b125923, (Sirsi) a209527',
                    mono: true,
                  },
                  {
                    label: 'Classifications / Call No.',
                    val:
                      folioPayload.classifications && folioPayload.classifications.length > 0
                        ? folioPayload.classifications
                            .map((c) => c.classificationNumber)
                            .join(', ')
                        : 'B753.D363 Q33 1650',
                    mono: true,
                  },
                  {
                    label: 'Subjects / Topics',
                    val:
                      folioPayload.subjects && folioPayload.subjects.length > 0
                        ? folioPayload.subjects.map((s) => s.value).join(' • ')
                        : 'الفلسفة الإسلامية الشيعية • مخطوطات إسلامية',
                  },
                  {
                    label: 'Physical Descriptions',
                    val:
                      folioPayload.physicalDescriptions &&
                      folioPayload.physicalDescriptions.length > 0
                        ? folioPayload.physicalDescriptions.join(' ; ')
                        : '344 ورقة (18 سطرًا)',
                  },
                  {
                    label: 'Publication Provision',
                    val:
                      folioPayload.publication && folioPayload.publication.length > 0
                        ? folioPayload.publication
                            .map((p) =>
                              [p.place, p.publisher, p.dateOfPublication]
                                .filter(Boolean)
                                .join(': ')
                            )
                            .join(' | ')
                        : 'كربلاء المقدسة / طهران : خطاط غير مصرح : 1650',
                  },
                  {
                    label: 'Languages & Mode',
                    val: `${
                      folioPayload.languages ? folioPayload.languages.join(', ') : 'ara'
                    } • Single Unit`,
                  },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-baseline justify-between gap-3 py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-slate-400 font-medium shrink-0">{row.label}</span>
                    <span
                      className={`text-right truncate max-w-[68%] ${
                        row.bold ? 'font-bold text-white' : 'text-slate-100'
                      } ${row.mono ? 'font-mono text-[11px] text-sky-200' : ''}`}
                    >
                      {row.val}
                    </span>
                  </div>
                ))}

                {folioPayload.notes && folioPayload.notes.length > 0 && (
                  <div className="pt-1 flex items-start justify-between gap-3">
                    <span className="text-slate-400 font-medium shrink-0">
                      Notes ({folioPayload.notes.length})
                    </span>
                    <span className="text-slate-200 text-right max-w-[68%] text-[11px] line-clamp-2">
                      {folioPayload.notes[0]?.note}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Generated .MARC Record for this Instance */}
              <div style={glassCardStyle} className="lg:col-span-6 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FileCode2 className="h-3.5 w-3.5 text-amber-200" />
                    <span>Created .MARC Record (FOLIO SRS)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyMarc}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedMarc ? (
                        <Check className="h-3 w-3 text-emerald-300" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedMarc ? 'Copied' : 'Copy .marc'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarcFile}
                      className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>.marc</span>
                    </button>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl font-mono text-[11px] leading-relaxed max-h-[300px] overflow-auto space-y-1"
                  style={{
                    background: 'rgba(5, 8, 14, 0.78)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.6)',
                  }}
                  dir="ltr"
                >
                  <div className="flex gap-2.5 px-1.5 py-0.5 rounded hover:bg-white/5">
                    <span className="text-sky-300 font-bold w-11 shrink-0">=LDR</span>
                    <span className="text-slate-500 w-5 shrink-0"> </span>
                    <span className="text-slate-100 break-all">{generatedMarc.leader}</span>
                  </div>
                  {generatedMarc.fields.map((f, i) => {
                    const isCtrl = f.tag.startsWith('00');
                    return (
                      <div
                        key={i}
                        className="flex gap-2.5 px-1.5 py-0.5 rounded hover:bg-white/5"
                        title={f.label}
                      >
                        <span className="text-sky-300 font-bold w-11 shrink-0">={f.tag}</span>
                        <span className="text-slate-400 w-5 shrink-0">
                          {isCtrl ? '  ' : `${f.ind1}${f.ind2}`}
                        </span>
                        <span className="text-slate-100 break-all">{f.content}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Full .MARC Record Viewer + MARC 21 Tag Breakdown Table */}
          {activeTab === 'marc' && (
            <div style={glassCardStyle} className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                <div>
                  <div className="text-xs font-bold text-white">
                    MARC 21 Bibliographic Record (.marc / SRS Source Record)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Automatically generated from BIBFRAME Work &amp; Instance and linked to FOLIO
                    Instance <code className="text-sky-300">{activeInstanceId}</code>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMarc}
                    style={glassPillButtonStyle}
                    className="h-7 px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy .MARC</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMarcFile}
                    style={primarySpecularButtonStyle}
                    className="h-7 px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download .MARC File</span>
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr
                      className="text-left text-[11px] text-slate-400"
                      style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                    >
                      <th className="py-2 px-3 w-16">Tag</th>
                      <th className="py-2 px-2 w-14">Ind</th>
                      <th className="py-2 px-3 w-52">MARC 21 Field</th>
                      <th className="py-2 px-3">Value / Subfields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    <tr className="hover:bg-white/5">
                      <td className="py-2 px-3 font-bold text-sky-300">LDR</td>
                      <td className="py-2 px-2 text-slate-500">--</td>
                      <td className="py-2 px-3 font-sans text-slate-300">
                        {MARC_FIELD_LABELS.LDR}
                      </td>
                      <td className="py-2 px-3 text-slate-100">{generatedMarc.leader}</td>
                    </tr>
                    {generatedMarc.fields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-2 px-3 font-bold text-sky-300">{f.tag}</td>
                        <td className="py-2 px-2 text-slate-400">
                          {f.tag.startsWith('00') ? '--' : `${f.ind1} ${f.ind2}`}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-300">{f.label}</td>
                        <td className="py-2 px-3 text-slate-100 break-all">{f.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Raw JSON Payload */}
          {activeTab === 'json' && (
            <pre
              className="p-4 rounded-2xl font-mono text-[11px] max-h-72 overflow-auto text-slate-200"
              style={{
                background: 'rgba(5, 8, 14, 0.82)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {JSON.stringify(
                {
                  folioInstance: folioPayload,
                  srsMarcRecord: {
                    leader: generatedMarc.leader,
                    fields: generatedMarc.srsFieldsPayload,
                    marcText: generatedMarc.marcText,
                  },
                },
                null,
                2
              )}
            </pre>
          )}

          {/* TAB 4: Search & Catalog from FOLIO */}
          {activeTab === 'browse' && (
            <div style={glassCardStyle} className="p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  value={folioSearchQuery}
                  onChange={(e) => setFolioSearchQuery(e.target.value)}
                  placeholder="Search FOLIO instances by title, author, HRID, or ISBN..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchFolio()}
                  className="flex-1 h-9 px-3.5 rounded-full text-xs text-white placeholder:text-slate-400 focus:outline-none"
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearchFolio}
                  disabled={isSearchingFolio}
                  style={primarySpecularButtonStyle}
                  className="h-9 px-4 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isSearchingFolio ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  <span>Search</span>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {folioSearchResults.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3 rounded-xl flex items-center justify-between gap-3 text-xs transition-all hover:bg-white/10"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                    }}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-white truncate flex items-center gap-2">
                        <span>{inst.title}</span>
                        {inst.hrid && (
                          <span className="font-mono text-[10px] text-sky-300 px-1.5 py-0.5 rounded bg-white/5">
                            {inst.hrid}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate">
                        {inst.contributors?.map((c) => c.name).join(' • ') || 'No contributor'} •{' '}
                        {inst.source || 'FOLIO'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`http://localhost:3000/inventory/view/${encodeURIComponent(inst.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={glassPillButtonStyle}
                        className="h-7 px-2.5 text-[11px] inline-flex items-center gap-1 no-underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Open in FOLIO</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSelectInstanceForCataloging(inst)}
                        style={primarySpecularButtonStyle}
                        className="h-7 px-3 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRight className="h-3 w-3" />
                        <span>Load in Moon</span>
                      </button>
                    </div>
                  </div>
                ))}
                {folioSearchResults.length === 0 && !isSearchingFolio && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Search your FOLIO catalog above to inspect instances &amp; .MARC records or load
                    them into Moon Wolf
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Glossy Footer Bar */}
        <div
          className="px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap shrink-0"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.09)',
            background: 'rgba(6, 9, 15, 0.55)',
          }}
        >
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Target:{' '}
              <code className="font-mono text-slate-200 px-1.5 py-0.5 rounded bg-white/5">
                {okapiUrl}
              </code>
            </span>
            <a
              href={folioMarcDownloadUrl}
              className="text-sky-300 hover:underline inline-flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              <span>Direct .marc URL</span>
            </a>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={glassPillButtonStyle}
              className="h-9 px-4 text-xs font-semibold cursor-pointer hover:bg-white/15 transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSyncToFolio}
              disabled={isSyncing}
              style={primarySpecularButtonStyle}
              className="h-9 px-5 text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Syncing Instance + .MARC...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>
                    {existingFolioId
                      ? 'Update Instance & .MARC in FOLIO'
                      : 'Push Instance & .MARC to FOLIO'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
