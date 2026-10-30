/**
 * WolfMoon BCLD (FastAPI) Linked Data Dialog
 * Direct integration with BlueCore Linked Data platform (https://dev.bcld.info/api)
 * Features:
 * - Federated Search across Works, Instances, Hubs
 * - Live inspection of canonical /context.jsonld (as requested by user)
 * - Cloud-based /marc2bibframe conversion with live JSON-LD result
 * - LSP dispatch to FOLIO mod-inventory
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Search,
  ExternalLink,
  BookOpen,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Server,
  Cloud,
  FileCode,
  Globe
} from 'lucide-react';
import { BcldApiClient, BcldSearchResult } from '../../services/bcldApiClient';
import { toast } from 'sonner';

interface WolfMoonBcldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadRecord: (workData: any, instanceData: any) => void;
}

export function WolfMoonBcldDialog({
  open,
  onOpenChange,
  onLoadRecord,
}: WolfMoonBcldDialogProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'context' | 'marc2bf'>('search');
  const [query, setQuery] = useState('Arabic');
  const [searchType, setSearchType] = useState<'all' | 'works' | 'instances' | 'hubs'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BcldSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Context.jsonld state
  const [contextData, setContextData] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Marc2Bibframe state
  const [marcXmlInput, setMarcXmlInput] = useState<string>(
`<?xml version="1.0" encoding="UTF-8"?>
<collection xmlns="http://www.loc.gov/MARC21/slim">
  <record>
    <leader>01142cam a2200301 a 4500</leader>
    <controlfield tag="001">b125923</controlfield>
    <controlfield tag="008">260922s1650    ir |||||||||||||| ||ara d</controlfield>
    <datafield tag="100" ind1="1" ind2=" ">
      <subfield code="a">الميرداماد، محمد باقر بن محمد،</subfield>
      <subfield code="d">توفي 1041 هجري،</subfield>
      <subfield code="e">مؤلف.</subfield>
    </datafield>
    <datafield tag="245" ind1="1" ind2="2">
      <subfield code="a">القبسات /</subfield>
      <subfield code="c">للميرداماد محمد باقر الحسيني الاسترآبادي.</subfield>
    </datafield>
    <datafield tag="264" ind1=" " ind2="1">
      <subfield code="c">1061 هـ [1650 م]</subfield>
    </datafield>
  </record>
</collection>`
  );
  const [convertedBfResult, setConvertedBfResult] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const bcldClient = React.useMemo(() => new BcldApiClient(), []);

  // Fetch context on dialog open if not already loaded
  useEffect(() => {
    if (open && !contextData && activeTab === 'context') {
      fetchContext();
    }
  }, [open, activeTab]);

  const handleSearch = async (searchQ = query) => {
    if (!searchQ.trim()) return;
    setIsLoading(true);
    try {
      const res = await bcldClient.search(searchQ.trim(), searchType, 20);
      setResults(res.results || []);
      setTotalCount(res.total || 0);
      if (res.results?.length === 0) {
        toast.info('No results found on BCLD API.');
      }
    } catch (err: any) {
      toast.error(`BCLD Search Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContext = async () => {
    setIsLoadingContext(true);
    try {
      const ctx = await bcldClient.getContextJsonLd();
      setContextData(ctx);
    } catch (err: any) {
      toast.error(`BCLD Context Error: ${err.message}`);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleConvertMarc2Bf = async () => {
    if (!marcXmlInput.trim()) return;
    setIsConverting(true);
    setConvertedBfResult(null);
    try {
      const result = await bcldClient.convertMarcToBibframe(marcXmlInput.trim());
      setConvertedBfResult(JSON.stringify(result, null, 2));
      toast.success('Successfully converted MARCXML to BIBFRAME 2.0 via BCLD cloud engine!');
    } catch (err: any) {
      toast.error(`BCLD conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleImport = (rec: BcldSearchResult) => {
    try {
      const { work, instance } = bcldClient.bcldRecordToBibframe(rec);
      onLoadRecord(work, instance);
      onOpenChange(false);
      toast.success(`Loaded "${work['bf:title']?.['bf:mainTitle'] || 'Record'}" into Moon Wolf!`);
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    }
  };

  const handleExportLsp = async (rec: BcldSearchResult) => {
    try {
      toast.loading('Triggering BCLD LSP export to FOLIO...');
      await bcldClient.exportToLsp(rec.uri, rec.uuid);
      toast.dismiss();
      toast.success(`Successfully dispatched LSP export for ${rec.uuid}!`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(`LSP export: ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800/80 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <span>BCLD Linked Data Platform</span>
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300">
                    FastAPI
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                  <span>Official BIBFRAME Cloud Linked Data Service (https://dev.bcld.info/api)</span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://dev.bcld.info/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Swagger UI</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Dialog Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-white'
              }`}
            >
              Federated Search (Works/Instances)
            </button>
            <button
              onClick={() => { setActiveTab('context'); if (!contextData) fetchContext(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'context'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-white'
              }`}
            >
              JSON-LD Context (/context.jsonld)
            </button>
            <button
              onClick={() => setActiveTab('marc2bf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'marc2bf'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-white'
              }`}
            >
              Cloud marc2bibframe
            </button>
          </div>
        </DialogHeader>

        {/* TAB 1: FEDERATED SEARCH */}
        {activeTab === 'search' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search Bar */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search Works, Instances, Hubs by title, author, or keyword (e.g. Arabic, Pride)..."
                    className="pl-9 text-xs"
                  />
                </div>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="h-9 px-3 rounded-md text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="works">Works</option>
                  <option value="instances">Instances</option>
                  <option value="hubs">Hubs</option>
                </select>
                <Button
                  onClick={() => handleSearch()}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 cursor-pointer"
                >
                  {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
                </Button>
              </div>

              {/* Quick presets */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="font-semibold">Quick Searches:</span>
                {['Arabic', 'Austen', 'Philosophy', 'Manuscript'].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => { setQuery(q); handleSearch(q); }}
                    className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
                {totalCount > 0 && (
                  <span className="ml-auto text-blue-600 dark:text-blue-400 font-bold">
                    {totalCount} results found
                  </span>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {results.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  {isLoading ? 'Querying BCLD FastAPI repository...' : 'Search above to explore 28,000+ linked data records.'}
                </div>
              ) : (
                results.map((rec) => {
                  const title = rec.data?.['rdfs:label']?.[0] || rec.data?.title?.[0]?.mainTitle?.[0] || 'Untitled Resource';
                  const normTitle = typeof title === 'object' && title?.['@value'] ? title['@value'] : String(title);

                  return (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] uppercase ${
                            rec.type === 'works' ? 'text-blue-600 border-blue-300' :
                            rec.type === 'hubs' ? 'text-purple-600 border-purple-300' : 'text-emerald-600 border-emerald-300'
                          }`}>
                            {rec.type}
                          </Badge>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                            {normTitle}
                          </h4>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                          <span>UUID: <code className="text-gray-600 dark:text-gray-300">{rec.uuid?.slice(0, 8)}...</code></span>
                          <span className="truncate max-w-xs">{rec.uri}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportLsp(rec)}
                          className="text-xs h-8 border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                          title="Export this record to FOLIO LSP"
                        >
                          <Server className="w-3 h-3 mr-1 text-orange-500" />
                          <span>Export to FOLIO</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleImport(rec)}
                          className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1.5"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Open in Moon</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONTEXT.JSONLD */}
        {activeTab === 'context' && (
          <div className="p-6 flex flex-col flex-1 overflow-hidden gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Official BCLD JSON-LD Context
                </h3>
                <p className="text-xs text-gray-500">
                  Defines canonical vocabulary mapping for bf, bflc, mads, and RDF classes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(contextData, null, 2));
                    toast.success('Copied context.jsonld to clipboard!');
                  }}
                  className="h-8 text-xs gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy Context
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchContext}
                  disabled={isLoadingContext}
                  className="h-8 text-xs gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingContext ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-900 p-4 font-mono text-xs text-emerald-400">
              {isLoadingContext ? (
                <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading context from https://dev.bcld.info/api/context.jsonld...</span>
                </div>
              ) : (
                <pre>{contextData ? JSON.stringify(contextData, null, 2) : 'No context loaded yet.'}</pre>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MARC2BIBFRAME */}
        {activeTab === 'marc2bf' && (
          <div className="p-6 flex flex-col flex-1 overflow-hidden gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  BCLD Cloud MARC-to-BIBFRAME 2.0 Conversion
                </h3>
                <p className="text-xs text-gray-500">
                  Sends raw MARCXML or MARC 21 payload to /api/marc2bibframe and receives official BIBFRAME JSON-LD.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleConvertMarc2Bf}
                disabled={isConverting}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 gap-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin' : ''}`} />
                Run Conversion
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* MARCXML Input */}
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Input MARCXML:</span>
                <textarea
                  value={marcXmlInput}
                  onChange={(e) => setMarcXmlInput(e.target.value)}
                  className="w-full flex-1 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 font-mono text-[11px] text-gray-800 dark:text-gray-200 focus:outline-none resize-none"
                />
              </div>

              {/* BIBFRAME Output */}
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Converted BIBFRAME JSON-LD:</span>
                <textarea
                  readOnly
                  value={convertedBfResult || (isConverting ? 'Converting on BCLD cloud...' : 'Click "Run Conversion" to transform MARC to BIBFRAME 2.0')}
                  className="w-full flex-1 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-900 font-mono text-[11px] text-purple-300 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
