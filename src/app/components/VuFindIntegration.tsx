/**
 * VuFind® Discovery Platform Integration
 * Provides interactive search, Solr index management, and record importing
 * between VuFind and Moon BIBFRAME Cataloger.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Search,
  BookOpen,
  Upload,
  RefreshCw,
  Server,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
  ArrowRight,
  Database,
  Loader2,
  Check,
  Settings,
} from 'lucide-react';
import {
  VuFindApiClient,
  VUFIND_PRESETS,
  VuFindRecord,
  VuFindConfig,
} from '../services/vufindApiClient';
import { toast } from 'sonner';

interface VuFindIntegrationProps {
  onBack?: () => void;
  currentRecord?: any;
  onRecordImport?: (record: any) => void;
}

export function VuFindIntegration({ onBack, currentRecord, onRecordImport }: VuFindIntegrationProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Config State
  const [config, setConfig] = useState<VuFindConfig>({
    baseUrl: localStorage.getItem('vufind_base_url') || VUFIND_PRESETS.local.baseUrl,
    solrUrl: localStorage.getItem('vufind_solr_url') || VUFIND_PRESETS.local.solrUrl,
  });

  const client = React.useMemo(() => new VuFindApiClient(config), [config]);

  // Health State
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    checked: boolean;
    ok: boolean;
    solrOk?: boolean;
    message?: string;
  }>({
    checked: false,
    ok: false,
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'AllFields' | 'Title' | 'Author' | 'Subject'>('AllFields');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VuFindRecord[]>([]);
  const [resultCount, setResultCount] = useState(0);

  // Selected Record
  const [selectedRecord, setSelectedRecord] = useState<VuFindRecord | null>(null);

  // Check health on mount or when requested
  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await client.checkHealth();
      setHealthStatus({ checked: true, ok: res.ok, solrOk: res.solrOk, message: res.message });
    } catch (err: any) {
      setHealthStatus({ checked: true, ok: false, message: err.message });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, [config]);

  // Execute Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await client.search(searchQuery.trim(), { type: searchType, limit: 30 });
      setSearchResults(res.records);
      setResultCount(res.resultCount);
      if (res.records.length === 0) {
        toast.info(isRTL ? 'لم يتم العثور على نتائج في VuFind' : 'No records found in VuFind');
      }
    } catch (err: any) {
      toast.error(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Import into Moon Wolf
  const handleImportRecord = (rec: VuFindRecord) => {
    const bibframeData = client.vufindRecordToBibframe(rec);
    if (onRecordImport) {
      onRecordImport(bibframeData);
      toast.success(isRTL ? 'تم استيراد التسجيلة بنجاح إلى محرر Moon Wolf' : 'Imported into Moon Wolf editor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl shadow-md text-white">
              <Search className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>VuFind® Library Discovery Portal</span>
                <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-300">
                  Discovery & Solr
                </Badge>
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isRTL
                  ? 'بوابة الاكتشاف والبحث العام للمكتبات مع فهرس Apache Solr والربط مع نظام FOLIO'
                  : 'Open-source library discovery engine powered by Apache Solr and integrated with FOLIO ILS'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack}>
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        <Card className={healthStatus.ok || healthStatus.solrOk ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {healthStatus.ok || healthStatus.solrOk ? (
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                )}
                <div>
                  <div className="font-semibold text-lg flex items-center gap-2">
                    <span>{healthStatus.ok || healthStatus.solrOk ? 'VuFind Stack Active' : 'VuFind Stack Offline'}</span>
                    <Badge variant={healthStatus.ok ? 'default' : 'secondary'} className={healthStatus.ok ? 'bg-emerald-600' : 'bg-gray-500'}>
                      Web: {config.baseUrl}
                    </Badge>
                    <Badge variant={healthStatus.solrOk ? 'default' : 'outline'} className={healthStatus.solrOk ? 'bg-teal-600' : ''}>
                      Solr Core: biblio
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {healthStatus.message || 'Configure connection below'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={checkHealth} disabled={isCheckingHealth}>
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                  Recheck Status
                </Button>
                <a
                  href={config.baseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Portal
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Discovery Search
            </TabsTrigger>
            <TabsTrigger value="index" disabled={!currentRecord}>
              <Upload className="h-4 w-4 mr-2" />
              Index Active Record
            </TabsTrigger>
            <TabsTrigger value="connection">
              <Settings className="h-4 w-4 mr-2" />
              Environment & Presets
            </TabsTrigger>
            <TabsTrigger value="docs">
              <BookOpen className="h-4 w-4 mr-2" />
              Architecture & Docs
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Catalog Discovery Search</CardTitle>
                <CardDescription>
                  Search across VuFind Solr index and query live holdings from FOLIO
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <select
                    value={searchType}
                    onChange={(e: any) => setSearchType(e.target.value)}
                    className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
                  >
                    <option value="AllFields">All Fields</option>
                    <option value="Title">Title</option>
                    <option value="Author">Author</option>
                    <option value="Subject">Subject</option>
                  </select>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by keywords, title, author, or subject..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={isSearching} className="bg-teal-600 hover:bg-teal-700 text-white">
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
                    Search
                  </Button>
                </div>

                {resultCount > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Showing {searchResults.length} of {resultCount} discovery record(s)
                  </div>
                )}

                {/* Results list */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {searchResults.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-800 hover:shadow-md transition-all flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{rec.title}</span>
                          {rec.formats && rec.formats[0] && (
                            <Badge variant="outline" className="text-[10px]">{rec.formats[0]}</Badge>
                          )}
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {rec.authors && rec.authors.length > 0 && (
                            <span className="font-medium mr-2">By: {rec.authors.join('; ')}</span>
                          )}
                          {rec.publishers && rec.publishers[0] && (
                            <span className="text-gray-500">• {rec.publishers[0]}</span>
                          )}
                          {rec.publicationDates && rec.publicationDates[0] && (
                            <span className="text-gray-500"> ({rec.publicationDates[0]})</span>
                          )}
                        </div>

                        {rec.isbns && rec.isbns.length > 0 && (
                          <div className="text-[11px] font-mono text-gray-500">
                            ISBN: {rec.isbns.join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImportRecord(rec)}
                          className="text-xs text-teal-600 border-teal-300 hover:bg-teal-50"
                        >
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          Import to Moon
                        </Button>
                        <a
                          href={`${config.baseUrl}/Record/${rec.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                          title="View in VuFind Web"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connection & Presets Tab */}
          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>VuFind & Solr Configuration</CardTitle>
                <CardDescription>
                  Configure endpoints or select pre-configured environments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local Stack Preset */}
                  <div
                    onClick={() => {
                      setConfig({ baseUrl: VUFIND_PRESETS.local.baseUrl, solrUrl: VUFIND_PRESETS.local.solrUrl });
                      localStorage.setItem('vufind_base_url', VUFIND_PRESETS.local.baseUrl);
                      localStorage.setItem('vufind_solr_url', VUFIND_PRESETS.local.solrUrl);
                    }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      config.baseUrl === VUFIND_PRESETS.local.baseUrl
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-teal-600 dark:text-teal-400">
                        {VUFIND_PRESETS.local.name}
                      </div>
                      <Badge variant="secondary">Localhost</Badge>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <div>Portal URL: <code className="font-mono">{VUFIND_PRESETS.local.baseUrl}</code></div>
                      <div>Solr Core: <code className="font-mono">{VUFIND_PRESETS.local.solrUrl}</code></div>
                      <div>FOLIO Link: <code className="font-mono">http://localhost:9130 (D:\folio)</code></div>
                    </div>
                  </div>

                  {/* Community Demo */}
                  <div
                    onClick={() => {
                      setConfig({ baseUrl: VUFIND_PRESETS.demo.baseUrl, solrUrl: VUFIND_PRESETS.demo.solrUrl });
                      localStorage.setItem('vufind_base_url', VUFIND_PRESETS.demo.baseUrl);
                      localStorage.setItem('vufind_solr_url', VUFIND_PRESETS.demo.solrUrl);
                    }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      config.baseUrl === VUFIND_PRESETS.demo.baseUrl
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-blue-600 dark:text-blue-400">
                        {VUFIND_PRESETS.demo.name}
                      </div>
                      <Badge variant="outline">Demo</Badge>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <div>Portal URL: <code className="font-mono">{VUFIND_PRESETS.demo.baseUrl}</code></div>
                      <div>Source: Official VuFind Community Demo</div>
                    </div>
                  </div>
                </div>

                {/* Local Stack Instructions */}
                <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20 space-y-2 text-xs">
                  <div className="font-bold flex items-center gap-2 text-teal-900 dark:text-teal-200">
                    <Terminal className="h-4 w-4 text-teal-600" />
                    <span>Managing Local VuFind Stack at D:\vufind</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    The local stack includes Apache/PHP for VuFind 11, Apache Solr 9, and MariaDB:
                  </p>
                  <div className="p-2.5 rounded-lg bg-gray-900 text-teal-300 font-mono text-[11px] select-all space-y-1">
                    <div># Start stack:</div>
                    <div>cd D:\vufind ; .\start.ps1</div>
                    <div className="text-gray-500"># Stop stack:</div>
                    <div>cd D:\vufind ; .\stop.ps1</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture & Documentation Tab */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Architecture: Moon Wolf + FOLIO + VuFind</CardTitle>
                <CardDescription>
                  How linked data flows from BIBFRAME cataloging to search & circulation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl space-y-2 font-mono text-xs">
                  <div>1. Cataloging: Moon Wolf (BIBFRAME 2.0/3.0.1 RDF Graph)</div>
                  <div>2. Backend ILS: FOLIO mod-inventory (D:\folio @ :9130)</div>
                  <div>3. Search Core: Apache Solr biblio index (D:\vufind @ :8983)</div>
                  <div>4. Public Discovery: VuFind Portal (D:\vufind @ :8080)</div>
                </div>
                <p>
                  VuFind acts as the patron-facing resource discovery interface. While catalogers work in Moon Wolf with rich ontologies and linked data, VuFind indexes the resulting records in Apache Solr for sub-second full-text and faceted search, and queries FOLIO via Okapi in real-time for live circulation and item availability.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
