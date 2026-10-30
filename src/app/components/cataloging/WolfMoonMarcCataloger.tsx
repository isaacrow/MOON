/**
 * BLUE MOON MARC 21 CATALOGING STUDIO
 * Fully integrated headless MARC 21 cataloger powered by FOLIO mod-quick-marc / mod-source-record-storage
 * and connected to BlueCore Linked Data (BCLD) FastAPI.
 * 
 * Features:
 * - Live spreadsheet-style tagged MARC 21 editor with Indicators 1 & 2
 * - Interactive Subfield Pills ($a, $b, $c, $d, $6, $0, etc.)
 * - 008 Fixed Field & Leader breakdown assistants
 * - Bi-directional Live Sync with Moon Wolf BIBFRAME 2.0 graph
 * - Direct Push/Pull to FOLIO QuickMARC (/records-editor/records)
 * - Cloud BCLD Linked Data marc2bibframe conversion & /context.jsonld inspector
 * - Full Arabic & RTL paired 880 field support
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Database,
  Save,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Check,
  Sparkles,
  Server,
  Layers,
  ArrowRightLeft,
  FileCode,
  Tag,
  BookOpen,
  Eye,
  ExternalLink,
  Code2,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Settings,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { getFOLIOClient, FOLIO_PRESETS } from '../../services/folioApiClient';
import { BcldApiClient } from '../../services/bcldApiClient';

export interface MarcSubfield {
  code: string;
  value: string;
}

export interface MarcRow {
  id: string;
  tag: string;
  ind1: string;
  ind2: string;
  content?: string; // for control fields (001-009) or raw
  subfields: MarcSubfield[];
}

interface WolfMoonMarcCatalogerProps {
  workData: any;
  instanceData: any;
  onUpdateWorkData: (work: any) => void;
  onUpdateInstanceData: (instance: any) => void;
  folioInstanceId?: string;
  theme?: any;
}

const COMMON_TAG_HELP: Record<string, { label: string; labelAr: string; category: string }> = {
  '001': { label: 'Control Number', labelAr: 'رقم التحكم', category: '0xx' },
  '005': { label: 'Date/Time of Modification', labelAr: 'تاريخ/وقت التعديل', category: '0xx' },
  '008': { label: 'Fixed-Length Data Elements', labelAr: 'العناصر ثابتة الطول', category: '0xx' },
  '020': { label: 'International Standard Book Number (ISBN)', labelAr: 'الرقم الدولي الموحد للكتاب', category: '0xx' },
  '040': { label: 'Cataloging Source', labelAr: 'مصدر الفهرسة', category: '0xx' },
  '041': { label: 'Language Code', labelAr: 'رمز اللغة', category: '0xx' },
  '050': { label: 'Library of Congress Classification', labelAr: 'تصنيف مكتبة الكونغرس', category: '0xx' },
  '082': { label: 'Dewey Decimal Classification', labelAr: 'تصنيف ديوي العشري', category: '0xx' },
  '100': { label: 'Main Entry - Personal Name (Author)', labelAr: 'المدخل الرئيسي - اسم شخص (مؤلف)', category: '1xx' },
  '110': { label: 'Main Entry - Corporate Name', labelAr: 'المدخل الرئيسي - هيئة', category: '1xx' },
  '240': { label: 'Uniform Title', labelAr: 'العنوان الموحد', category: '2xx' },
  '245': { label: 'Title Statement', labelAr: 'بيان العنوان والمسؤولية', category: '2xx' },
  '246': { label: 'Varying Form of Title', labelAr: 'شكل متبدل للعنوان', category: '2xx' },
  '250': { label: 'Edition Statement', labelAr: 'بيان الطبعة', category: '2xx' },
  '264': { label: 'Production, Publication, Distribution', labelAr: 'بيانات النشر والإنتاج', category: '2xx' },
  '300': { label: 'Physical Description (Extent)', labelAr: 'الوصف المادي (التوريق والحجم)', category: '3xx' },
  '336': { label: 'Content Type (RDA)', labelAr: 'نوع المحتوى', category: '3xx' },
  '337': { label: 'Media Type (RDA)', labelAr: 'نوع الوسيط', category: '3xx' },
  '338': { label: 'Carrier Type (RDA)', labelAr: 'نوع الوعاء', category: '3xx' },
  '490': { label: 'Series Statement', labelAr: 'بيان السلسلة', category: '4xx' },
  '500': { label: 'General Note', labelAr: 'ملاحظة عامة', category: '5xx' },
  '502': { label: 'Dissertation Note', labelAr: 'ملاحظة أطروحة', category: '5xx' },
  '504': { label: 'Bibliography Note', labelAr: 'ملاحظة الببليوغرافيا', category: '5xx' },
  '520': { label: 'Summary / Abstract', labelAr: 'المستخلص / ملخص المحتوى', category: '5xx' },
  '650': { label: 'Subject Added Entry - Topical', labelAr: 'رؤوس الموضوعات الموضوعية', category: '6xx' },
  '651': { label: 'Subject Added Entry - Geographic', labelAr: 'رؤوس الموضوعات الجغرافية', category: '6xx' },
  '655': { label: 'Index Term - Genre/Form', labelAr: 'مصطلح الشكل أو النوع الأدبي', category: '6xx' },
  '700': { label: 'Added Entry - Personal Name', labelAr: 'مدخل إضافي - شخص', category: '7xx' },
  '710': { label: 'Added Entry - Corporate Name', labelAr: 'مدخل إضافي - هيئة', category: '7xx' },
  '852': { label: 'Location / Call Number / Holdings', labelAr: 'الموقع ورمز الرف ومقتنيات النسخ', category: '8xx' },
  '880': { label: 'Alternate Graphic Representation (Arabic)', labelAr: 'تمثيل خطي بديل (النص العربي المقترن)', category: '8xx' },
};

export function WolfMoonMarcCataloger({
  workData,
  instanceData,
  onUpdateWorkData,
  onUpdateInstanceData,
  folioInstanceId = 'e57a9143-6c84-48f1-a128-d8975b94f101',
  theme
}: WolfMoonMarcCatalogerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [leader, setLeader] = useState('00000nam a2200000 a 4500');
  const [rows, setRows] = useState<MarcRow[]>([]);
  const [activeView, setActiveView] = useState<'table' | 'breaker' | 'marcxml' | 'json'>('table');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [targetInstanceId, setTargetInstanceId] = useState(folioInstanceId);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dtoRecordId, setDtoRecordId] = useState<string | null>(null);

  // Modals
  const [show008Modal, setShow008Modal] = useState(false);
  const [showBcldModal, setShowBcldModal] = useState(false);
  const [bcldContextData, setBcldContextData] = useState<any>(null);
  const [bcldConvertedRdf, setBcldConvertedRdf] = useState<string | null>(null);
  const [isConvertingBcld, setIsConvertingBcld] = useState(false);

  const folioClient = useMemo(() => getFOLIOClient(), []);
  const bcldClient = useMemo(() => new BcldApiClient(), []);

  // Initialize MARC rows from Moon Wolf BIBFRAME on first mount or instance change
  useEffect(() => {
    loadFromBibframeProps();
  }, [workData?.title, instanceData?.title]);

  const loadFromBibframeProps = () => {
    try {
      const qm = folioClient.bibframeToQuickMarcFields(workData, instanceData, targetInstanceId);
      setLeader(qm.leader || '00000nam a2200000 a 4500');
      const parsedRows: MarcRow[] = (qm.fields || []).map((f: any, idx: number) => {
        const isControl = /^00[1-9]/.test(f.tag);
        const subfields: MarcSubfield[] = [];
        if (!isControl && f.content) {
          const regex = /\$([a-z0-9])\s*([^$]+)/gi;
          let m;
          while ((m = regex.exec(f.content)) !== null) {
            subfields.push({ code: m[1], value: m[2].trim() });
          }
        }
        return {
          id: f.id || `row-${idx}-${Date.now()}`,
          tag: f.tag,
          ind1: f.indicators?.[0] || '\\',
          ind2: f.indicators?.[1] || '\\',
          content: isControl ? f.content : undefined,
          subfields: isControl ? [] : (subfields.length ? subfields : [{ code: 'a', value: f.content || '' }])
        };
      });
      setRows(parsedRows);
    } catch (err: any) {
      console.warn('Could not auto-generate MARC from BIBFRAME:', err);
    }
  };

  // ==================== FOLIO QUICKMARC ACTIONS ====================

  /**
   * Load record from FOLIO mod-quick-marc / SRS backend
   */
  const handleLoadFromFolio = async (instId = targetInstanceId) => {
    setIsLoading(true);
    try {
      toast.loading(`Loading QuickMARC record for ${instId} from FOLIO backend...`);
      const record = await folioClient.getQuickMarcRecord(instId);
      toast.dismiss();

      if (!record || (!record.fields && !record.records)) {
        toast.warning(`No QuickMARC record found for ID: ${instId}. Initialized with template.`);
        return;
      }

      if (record.leader) setLeader(record.leader);
      if (record.id) setDtoRecordId(record.id);

      const incomingFields = record.fields || (record.records?.filter((r: any) => r.tag !== 'LDR')) || [];
      const newRows: MarcRow[] = incomingFields.map((f: any, i: number) => {
        const tag = f.tag;
        const isControl = /^00[1-9]/.test(tag);
        const subfields: MarcSubfield[] = [];

        if (Array.isArray(f.subfields)) {
          // If subfields come as array of objects [{ a: "val" }]
          for (const s of f.subfields) {
            const k = Object.keys(s)[0];
            if (k) subfields.push({ code: k, value: String(s[k]) });
          }
        } else if (f.content && !isControl) {
          const regex = /\$([a-z0-9])\s*([^$]+)/gi;
          let m;
          while ((m = regex.exec(f.content)) !== null) {
            subfields.push({ code: m[1], value: m[2].trim() });
          }
        }

        return {
          id: f.id || `folio-${tag}-${i}-${Date.now()}`,
          tag,
          ind1: f.indicators?.[0] !== undefined ? String(f.indicators[0]) : (f.ind1 !== undefined ? String(f.ind1) : '\\'),
          ind2: f.indicators?.[1] !== undefined ? String(f.indicators[1]) : (f.ind2 !== undefined ? String(f.ind2) : '\\'),
          content: isControl ? (f.content || '') : undefined,
          subfields: isControl ? [] : (subfields.length ? subfields : [{ code: 'a', value: f.content || '' }])
        };
      });

      setRows(newRows);
      toast.success(`Loaded ${newRows.length} MARC 21 fields directly from FOLIO QuickMARC!`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(`FOLIO QuickMARC Load Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save current rows to FOLIO mod-quick-marc / mod-source-record-storage backend
   */
  const handleSaveToFolio = async () => {
    setIsSaving(true);
    try {
      toast.loading('Pushing record to FOLIO QuickMARC & SRS...');
      const fieldsPayload = rows.map(r => {
        const isControl = /^00[1-9]/.test(r.tag);
        let content = '';
        if (isControl) {
          content = r.content || '';
        } else {
          content = r.subfields.map(s => `$${s.code} ${s.value}`).join(' ');
        }
        return {
          tag: r.tag,
          indicators: isControl ? undefined : [r.ind1 || '\\', r.ind2 || '\\'],
          content,
          id: r.id
        };
      });

      const payload = {
        id: dtoRecordId || `qm-${targetInstanceId}`,
        externalId: targetInstanceId,
        leader,
        fields: fieldsPayload,
        parsedRecordDtoId: dtoRecordId || undefined,
      };

      const result = await folioClient.saveQuickMarcRecord(payload);
      toast.dismiss();
      toast.success(`Successfully saved MARC 21 record to FOLIO! (QM ID: ${result.qmRecordId || targetInstanceId})`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Save to FOLIO QuickMARC failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== MOON BIBFRAME SYNC ====================

  /**
   * Two-way sync: Push edited MARC 21 records into Moon Wolf's BIBFRAME graph
   */
  const handleSyncToBibframe = () => {
    try {
      const flatFields = rows.map(r => {
        const isControl = /^00[1-9]/.test(r.tag);
        const content = isControl
          ? (r.content || '')
          : r.subfields.map(s => `$${s.code} ${s.value}`).join(' ');
        return {
          tag: r.tag,
          indicators: [r.ind1 || '\\', r.ind2 || '\\'],
          content
        };
      });

      const { workData: syncedWork, instanceData: syncedInstance } = folioClient.convertMarcFieldsToBibframe(flatFields);
      
      onUpdateWorkData({
        ...workData,
        ...syncedWork,
        'bf:title': syncedWork['bf:title'],
        title: syncedWork.title,
        author: syncedWork.author,
      });

      onUpdateInstanceData({
        ...instanceData,
        ...syncedInstance,
        title: syncedInstance.title,
        publisher: syncedInstance.publisher,
        publicationDate: syncedInstance.publicationDate,
        isbn: syncedInstance.isbn,
      });

      toast.success('Synchronized MARC 21 fields into Moon Wolf BIBFRAME 2.0 graph!');
    } catch (err: any) {
      toast.error(`Sync to BIBFRAME failed: ${err.message}`);
    }
  };

  // ==================== BCLD FASTAPI INTEGRATION ====================

  /**
   * Convert active record via BCLD's official /marc2bibframe endpoint
   */
  const handleConvertViaBcld = async () => {
    setIsConvertingBcld(true);
    setBcldConvertedRdf(null);
    try {
      toast.loading('Converting MARC record via BCLD Cloud Engine (https://dev.bcld.info/api/marc2bibframe)...');
      const xml = generateMarcXml();
      const result = await bcldClient.convertMarcToBibframe(xml);
      toast.dismiss();
      setBcldConvertedRdf(JSON.stringify(result, null, 2));
      toast.success('Successfully converted MARC 21 to BIBFRAME 2.0 via BCLD FastAPI!');
      setShowBcldModal(true);
    } catch (err: any) {
      toast.dismiss();
      toast.error(`BCLD marc2bibframe error: ${err.message}`);
    } finally {
      setIsConvertingBcld(false);
    }
  };

  /**
   * Fetch official BCLD /context.jsonld
   */
  const handleFetchBcldContext = async () => {
    try {
      toast.loading('Fetching canonical context from /bcld-api/context.jsonld...');
      const ctx = await bcldClient.getContextJsonLd();
      toast.dismiss();
      setBcldContextData(ctx);
      setShowBcldModal(true);
      toast.success('Retrieved official BCLD JSON-LD context!');
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Failed to fetch context: ${err.message}`);
    }
  };

  // ==================== ROW EDITING HELPERS ====================

  const updateRowTag = (index: number, newTag: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], tag: newTag.trim() };
      return copy;
    });
  };

  const updateRowInd = (index: number, indKey: 'ind1' | 'ind2', value: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [indKey]: value };
      return copy;
    });
  };

  const updateControlContent = (index: number, content: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], content };
      return copy;
    });
  };

  const updateSubfield = (rowIndex: number, subIndex: number, key: 'code' | 'value', value: string) => {
    setRows(prev => {
      const copy = [...prev];
      const subs = [...copy[rowIndex].subfields];
      subs[subIndex] = { ...subs[subIndex], [key]: value };
      copy[rowIndex] = { ...copy[rowIndex], subfields: subs };
      return copy;
    });
  };

  const addSubfield = (rowIndex: number) => {
    setRows(prev => {
      const copy = [...prev];
      copy[rowIndex] = {
        ...copy[rowIndex],
        subfields: [...copy[rowIndex].subfields, { code: 'a', value: '' }]
      };
      return copy;
    });
  };

  const removeSubfield = (rowIndex: number, subIndex: number) => {
    setRows(prev => {
      const copy = [...prev];
      const subs = copy[rowIndex].subfields.filter((_, idx) => idx !== subIndex);
      copy[rowIndex] = { ...copy[rowIndex], subfields: subs };
      return copy;
    });
  };

  const addRow = (afterIndex?: number) => {
    const newRow: MarcRow = {
      id: `row-new-${Date.now()}`,
      tag: '500',
      ind1: '\\',
      ind2: '\\',
      subfields: [{ code: 'a', value: '' }]
    };
    if (afterIndex !== undefined) {
      setRows(prev => [...prev.slice(0, afterIndex + 1), newRow, ...prev.slice(afterIndex + 1)]);
    } else {
      setRows(prev => [...prev, newRow]);
    }
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === rows.length - 1)) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setRows(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // ==================== SERIALIZERS ====================

  const generateMarcBreaker = (): string => {
    let out = `=LDR  ${leader}\n`;
    for (const r of rows) {
      if (/^00[1-9]/.test(r.tag)) {
        out += `=${r.tag}  ${r.content || ''}\n`;
      } else {
        const i1 = r.ind1 || '\\';
        const i2 = r.ind2 || '\\';
        const subs = r.subfields.map(s => `$${s.code}${s.value}`).join('');
        out += `=${r.tag}  ${i1}${i2}${subs}\n`;
      }
    }
    return out;
  };

  const generateMarcXml = (): string => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<collection xmlns="http://www.loc.gov/MARC21/slim">\n  <record>\n`;
    xml += `    <leader>${leader}</leader>\n`;
    for (const r of rows) {
      if (/^00[1-9]/.test(r.tag)) {
        xml += `    <controlfield tag="${r.tag}">${escapeXml(r.content || '')}</controlfield>\n`;
      } else {
        const i1 = r.ind1 === '\\' ? ' ' : (r.ind1 || ' ');
        const i2 = r.ind2 === '\\' ? ' ' : (r.ind2 || ' ');
        xml += `    <datafield tag="${r.tag}" ind1="${i1}" ind2="${i2}">\n`;
        for (const s of r.subfields) {
          xml += `      <subfield code="${s.code}">${escapeXml(s.value)}</subfield>\n`;
        }
        xml += `    </datafield>\n`;
      }
    }
    xml += `  </record>\n</collection>\n`;
    return xml;
  };

  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Category filter
      if (categoryFilter !== 'all') {
        const cat = COMMON_TAG_HELP[r.tag]?.category || (r.tag[0] + 'xx');
        if (cat !== categoryFilter) return false;
      }
      // Text search filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        if (r.tag.toLowerCase().includes(q)) return true;
        if (r.content && r.content.toLowerCase().includes(q)) return true;
        const subMatch = r.subfields.some(s => s.code.toLowerCase().includes(q) || s.value.toLowerCase().includes(q));
        if (subMatch) return true;
        const help = COMMON_TAG_HELP[r.tag];
        if (help && (help.label.toLowerCase().includes(q) || help.labelAr.toLowerCase().includes(q))) return true;
        return false;
      }
      return true;
    });
  }, [rows, searchFilter, categoryFilter]);

  return (
    <div className="w-full flex flex-col gap-5 p-6 bg-slate-900/40 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
      
      {/* ===== HEADER & TOP CONTROL BAR ===== */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-rose-500/20 via-pink-500/20 to-purple-500/20 border border-rose-500/30 rounded-xl text-rose-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                MARC 21 Cataloging Studio
                <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10 text-xs">
                  FOLIO mod-quick-marc Headless
                </Badge>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Integrated MARC 21 & BIBFRAME editor backed by FOLIO SRS and BCLD FastAPI
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Load from FOLIO */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleLoadFromFolio()}
            disabled={isLoading}
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Load from FOLIO SRS
          </Button>

          {/* Save to FOLIO QuickMARC */}
          <Button
            size="sm"
            onClick={handleSaveToFolio}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Save className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
            Save to FOLIO QuickMARC
          </Button>

          {/* Sync to Moon BIBFRAME */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncToBibframe}
            className="border-sky-500/40 text-sky-400 hover:bg-sky-500/10 gap-1.5"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Sync to Moon BIBFRAME
          </Button>

          {/* BCLD Convert */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleConvertViaBcld}
            disabled={isConvertingBcld}
            className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 gap-1.5"
          >
            <Sparkles className={`h-4 w-4 ${isConvertingBcld ? 'animate-spin' : ''}`} />
            BCLD marc2bibframe
          </Button>

          {/* BCLD Context */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFetchBcldContext}
            className="text-slate-400 hover:text-white hover:bg-slate-800 gap-1"
          >
            <Globe className="h-4 w-4" />
            BCLD Context
          </Button>
        </div>
      </div>

      {/* ===== INSTANCE ID & LEADER BAR ===== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 items-center">
        {/* Target FOLIO Instance ID */}
        <div className="md:col-span-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-xs text-slate-400 font-mono shrink-0">FOLIO ID:</span>
          <Input
            value={targetInstanceId}
            onChange={(e) => setTargetInstanceId(e.target.value)}
            className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-amber-300"
            placeholder="UUID of FOLIO Instance"
          />
        </div>

        {/* MARC Leader */}
        <div className="md:col-span-6 flex items-center gap-2">
          <Tag className="h-4 w-4 text-sky-400 shrink-0" />
          <span className="text-xs text-slate-400 font-mono shrink-0">LDR:</span>
          <Input
            value={leader}
            onChange={(e) => setLeader(e.target.value)}
            className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-sky-300 tracking-wider"
          />
        </div>

        {/* Fixed Field / 008 Assistant Button */}
        <div className="md:col-span-2 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShow008Modal(true)}
            className="h-8 text-xs border border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5 w-full justify-center"
          >
            <HelpCircle className="h-3.5 w-3.5 text-rose-400" />
            008 Assistant
          </Button>
        </div>
      </div>

      {/* ===== VIEW TABS & FILTER BAR ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveView('table')}
              className={`px-3 py-1.5 rounded-md transition-all ${activeView === 'table' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tag Editor
            </button>
            <button
              onClick={() => setActiveView('breaker')}
              className={`px-3 py-1.5 rounded-md transition-all ${activeView === 'breaker' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Breaker Text
            </button>
            <button
              onClick={() => setActiveView('marcxml')}
              className={`px-3 py-1.5 rounded-md transition-all ${activeView === 'marcxml' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              MARCXML
            </button>
            <button
              onClick={() => setActiveView('json')}
              className={`px-3 py-1.5 rounded-md transition-all ${activeView === 'json' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              FOLIO QuickMARC JSON
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80 text-xs">
            {['all', '0xx', '1xx', '2xx', '3xx', '5xx', '6xx', '7xx', '8xx'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded transition-all ${categoryFilter === cat ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search Filter & Add Field */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search tag or value..."
              className="h-8 pl-8 text-xs bg-slate-950/60 border-slate-800 text-slate-200 w-48"
            />
          </div>

          <Button
            size="sm"
            onClick={() => addRow()}
            className="h-8 bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1 shadow-md shadow-rose-950/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Tag
          </Button>
        </div>
      </div>

      {/* ===== ACTIVE VIEW CONTENT ===== */}

      {/* 1. TABLE VIEW (INTERACTIVE TAGGED SPREADSHEET) */}
      {activeView === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 shadow-inner">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-16 text-center">Tag</th>
                <th className="py-2.5 px-2 w-12 text-center">Ind 1</th>
                <th className="py-2.5 px-2 w-12 text-center">Ind 2</th>
                <th className="py-2.5 px-4">Subfields & Content</th>
                <th className="py-2.5 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredRows.map((row, rIdx) => {
                const isControl = /^00[1-9]/.test(row.tag);
                const tagHelp = COMMON_TAG_HELP[row.tag];
                const isArabicRow = row.subfields.some(s => /[\u0600-\u06FF]/.test(s.value)) || (row.content && /[\u0600-\u06FF]/.test(row.content));

                return (
                  <tr key={row.id} className="hover:bg-slate-900/50 transition-colors group">
                    {/* TAG */}
                    <td className="py-2 px-3 align-top">
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          value={row.tag}
                          onChange={(e) => updateRowTag(rIdx, e.target.value)}
                          maxLength={3}
                          className="h-7 w-14 text-center font-mono font-bold text-xs bg-slate-900 border-slate-700 text-rose-300 p-0"
                        />
                        {tagHelp && (
                          <span className="text-[9px] text-slate-500 font-sans max-w-[80px] truncate text-center" title={tagHelp.label}>
                            {tagHelp.label}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* INDICATOR 1 */}
                    <td className="py-2 px-1 align-top text-center">
                      {!isControl ? (
                        <Input
                          value={row.ind1}
                          onChange={(e) => updateRowInd(rIdx, 'ind1', e.target.value)}
                          maxLength={1}
                          className="h-7 w-8 text-center font-mono text-xs bg-slate-900 border-slate-700 text-sky-400 p-0 mx-auto"
                        />
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>

                    {/* INDICATOR 2 */}
                    <td className="py-2 px-1 align-top text-center">
                      {!isControl ? (
                        <Input
                          value={row.ind2}
                          onChange={(e) => updateRowInd(rIdx, 'ind2', e.target.value)}
                          maxLength={1}
                          className="h-7 w-8 text-center font-mono text-xs bg-slate-900 border-slate-700 text-sky-400 p-0 mx-auto"
                        />
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>

                    {/* SUBFIELDS / CONTENT */}
                    <td className="py-2 px-4 align-top">
                      {isControl ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.content || ''}
                            onChange={(e) => updateControlContent(rIdx, e.target.value)}
                            className="h-7 text-xs font-mono bg-slate-900 border-slate-700 text-amber-200"
                          />
                          {row.tag === '008' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShow008Modal(true)}
                              className="h-7 text-[11px] text-slate-400 hover:text-white px-2"
                            >
                              Inspect 008
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {row.subfields.map((sub, sIdx) => (
                            <div
                              key={sIdx}
                              className={`flex items-center bg-slate-900/90 border border-slate-700/80 rounded-md overflow-hidden shadow-sm ${
                                /[\u0600-\u06FF]/.test(sub.value) ? 'dir-rtl' : ''
                              }`}
                            >
                              {/* Subfield code pill */}
                              <div className="bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold px-1.5 py-1 border-r border-slate-700 flex items-center gap-0.5">
                                <span>$</span>
                                <input
                                  type="text"
                                  value={sub.code}
                                  onChange={(e) => updateSubfield(rIdx, sIdx, 'code', e.target.value)}
                                  maxLength={1}
                                  className="w-3 bg-transparent text-center font-bold text-rose-300 focus:outline-none"
                                />
                              </div>

                              {/* Subfield value input */}
                              <input
                                type="text"
                                value={sub.value}
                                onChange={(e) => updateSubfield(rIdx, sIdx, 'value', e.target.value)}
                                dir={/[\u0600-\u06FF]/.test(sub.value) ? 'rtl' : 'ltr'}
                                className={`h-7 px-2.5 text-xs bg-transparent focus:outline-none focus:bg-slate-800/60 min-w-[140px] text-slate-200 ${
                                  /[\u0600-\u06FF]/.test(sub.value) ? 'font-serif text-amber-100 text-[13px]' : 'font-sans'
                                }`}
                              />

                              {/* Remove subfield pill */}
                              {row.subfields.length > 1 && (
                                <button
                                  onClick={() => removeSubfield(rIdx, sIdx)}
                                  className="text-slate-500 hover:text-rose-400 px-1 py-1 hover:bg-slate-800/80 transition-colors"
                                  title="Remove subfield"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Add Subfield button */}
                          <button
                            onClick={() => addSubfield(rIdx)}
                            className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded border border-slate-700/60 flex items-center gap-1 transition-colors"
                            title="Add subfield pill"
                          >
                            <Plus className="h-3 w-3" />
                            Subfield
                          </button>
                        </div>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-2 px-3 align-top text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveRow(rIdx, 'up')}
                          disabled={rIdx === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Move Up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveRow(rIdx, 'down')}
                          disabled={rIdx === rows.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Move Down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeRow(rIdx)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Delete Tag"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. MARC BREAKER TEXT VIEW */}
      {activeView === 'breaker' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Standard MARC Breaker Notation (=TAG  IND$aValue...)</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(generateMarcBreaker());
                toast.success('Copied MARC Breaker to clipboard!');
              }}
              className="h-7 text-xs border-slate-700 text-slate-300 gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Breaker Text
            </Button>
          </div>
          <textarea
            readOnly
            value={generateMarcBreaker()}
            rows={20}
            className="w-full font-mono text-xs p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-emerald-400 leading-relaxed focus:outline-none"
          />
        </div>
      )}

      {/* 3. MARCXML VIEW */}
      {activeView === 'marcxml' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Official Library of Congress MARCXML Schema</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(generateMarcXml());
                toast.success('Copied MARCXML to clipboard!');
              }}
              className="h-7 text-xs border-slate-700 text-slate-300 gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy MARCXML
            </Button>
          </div>
          <textarea
            readOnly
            value={generateMarcXml()}
            rows={20}
            className="w-full font-mono text-xs p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-sky-400 leading-relaxed focus:outline-none"
          />
        </div>
      )}

      {/* 4. FOLIO QUICKMARC JSON VIEW */}
      {activeView === 'json' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>FOLIO mod-quick-marc / mod-source-record-storage Payload</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify({ leader, rows }, null, 2));
                toast.success('Copied JSON payload to clipboard!');
              }}
              className="h-7 text-xs border-slate-700 text-slate-300 gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy JSON
            </Button>
          </div>
          <textarea
            readOnly
            value={JSON.stringify({
              id: dtoRecordId || `qm-${targetInstanceId}`,
              externalId: targetInstanceId,
              leader,
              fields: rows.map(r => ({
                tag: r.tag,
                indicators: /^00[1-9]/.test(r.tag) ? undefined : [r.ind1 || '\\', r.ind2 || '\\'],
                content: /^00[1-9]/.test(r.tag) ? r.content : r.subfields.map(s => `$${s.code} ${s.value}`).join(' '),
                id: r.id
              }))
            }, null, 2)}
            rows={20}
            className="w-full font-mono text-xs p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-amber-300 leading-relaxed focus:outline-none"
          />
        </div>
      )}

      {/* ===== 008 FIXED FIELD ASSISTANT MODAL ===== */}
      <Dialog open={show008Modal} onOpenChange={setShow008Modal}>
        <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <HelpCircle className="h-5 w-5" />
              MARC 21 Field 008 Assistant
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Deconstructed fixed-length character positions for Books & Manuscripts.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const row008 = rows.find(r => r.tag === '008');
            const val = row008?.content || '260922s2026    xx |||||||||||||| ||ara d';
            const dateEntered = val.substring(0, 6);
            const dateType = val.substring(6, 7);
            const date1 = val.substring(7, 11);
            const date2 = val.substring(11, 15);
            const country = val.substring(15, 18);
            const lang = val.substring(35, 38);

            return (
              <div className="flex flex-col gap-4 py-2 text-xs">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-amber-300">
                  <div className="text-[10px] text-slate-500 uppercase">Current 008 String:</div>
                  <div className="text-sm tracking-wider mt-1">{val}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-2.5 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400 text-[11px]">00-05 Date Entered:</span>
                    <span className="font-mono font-bold text-sky-400">{dateEntered} (YYMMDD)</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2.5 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400 text-[11px]">06 Type of Date:</span>
                    <span className="font-mono font-bold text-sky-400">{dateType} (s = Single date)</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2.5 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400 text-[11px]">07-10 Date 1 (Year):</span>
                    <span className="font-mono font-bold text-emerald-400">{date1}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2.5 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400 text-[11px]">11-14 Date 2:</span>
                    <span className="font-mono font-bold text-slate-400">{date2.trim() || 'None'}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2.5 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400 text-[11px]">15-17 Place of Publication:</span>
                    <span className="font-mono font-bold text-purple-400">{country.trim() || 'xx'}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-2.5 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400 text-[11px]">35-37 Language Code:</span>
                    <span className="font-mono font-bold text-amber-400">{lang} (Arabic / ara)</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== BCLD FASTAPI MODAL (CONTEXT & MARC2BIBFRAME) ===== */}
      <Dialog open={showBcldModal} onOpenChange={setShowBcldModal}>
        <DialogContent className="max-w-3xl bg-slate-950 border border-slate-800 text-slate-100 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <Sparkles className="h-5 w-5" />
              BCLD FastAPI Cloud Integration
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Live responses from BlueCore Linked Data Platform (https://dev.bcld.info/api)
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={bcldConvertedRdf ? "converted" : "context"} className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-slate-900 border border-slate-800">
              {bcldConvertedRdf && <TabsTrigger value="converted">marc2bibframe RDF Output</TabsTrigger>}
              <TabsTrigger value="context">BCLD /context.jsonld</TabsTrigger>
            </TabsList>

            {bcldConvertedRdf && (
              <TabsContent value="converted" className="flex-1 overflow-auto mt-3">
                <textarea
                  readOnly
                  value={bcldConvertedRdf}
                  rows={18}
                  className="w-full font-mono text-xs p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-purple-300 leading-relaxed"
                />
              </TabsContent>
            )}

            <TabsContent value="context" className="flex-1 overflow-auto mt-3">
              <textarea
                readOnly
                value={bcldContextData ? JSON.stringify(bcldContextData, null, 2) : 'Loading or click BCLD Context...'}
                rows={18}
                className="w-full font-mono text-xs p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-sky-300 leading-relaxed"
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

    </div>
  );
}
