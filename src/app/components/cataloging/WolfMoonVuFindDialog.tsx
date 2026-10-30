/**
 * WolfMoon VuFind® Synchronization & Indexing Dialog
 * Enables catalogers to preview and publish BIBFRAME records directly
 * into the VuFind discovery catalog and Apache Solr index (D:\vufind).
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  UploadCloud,
  Terminal,
  BookOpen,
  Code2,
  Check,
  Globe,
  Loader2,
  Layers,
} from 'lucide-react';
import {
  VuFindApiClient,
  VUFIND_PRESETS,
  VuFindSolrDoc,
} from '../../services/vufindApiClient';
import { toast } from 'sonner';

interface WolfMoonVuFindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any;
  recordTitle?: string;
}

export function WolfMoonVuFindDialog({
  open,
  onOpenChange,
  record,
  recordTitle = 'BIBFRAME Record',
}: WolfMoonVuFindDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<'local' | 'demo'>('local');
  const [baseUrl, setBaseUrl] = useState<string>(VUFIND_PRESETS.local.baseUrl);
  const [solrUrl, setSolrUrl] = useState<string>(VUFIND_PRESETS.local.solrUrl);

  const [isProbing, setIsProbing] = useState(false);
  const [probeStatus, setProbeStatus] = useState<{
    tested: boolean;
    ok: boolean;
    solrOk?: boolean;
    message?: string;
  }>({
    tested: false,
    ok: false,
  });

  const [isIndexing, setIsIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<{
    success: boolean;
    recordId?: string;
    message?: string;
    error?: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const client = React.useMemo(
    () => new VuFindApiClient({ baseUrl, solrUrl }),
    [baseUrl, solrUrl]
  );

  const solrDoc: VuFindSolrDoc = React.useMemo(() => {
    try {
      return client.bibframeToVuFindSolr(record);
    } catch {
      return { id: `bf-${Date.now()}`, title: recordTitle, format: ['Book'] };
    }
  }, [client, record, recordTitle]);

  const probeHealth = async () => {
    setIsProbing(true);
    try {
      const res = await client.checkHealth();
      setProbeStatus({ tested: true, ok: res.ok, solrOk: res.solrOk, message: res.message });
    } catch (err: any) {
      setProbeStatus({ tested: true, ok: false, message: err.message });
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    if (open) {
      setIndexResult(null);
      probeHealth();
    }
  }, [open, baseUrl, solrUrl]);

  const handleSelectPreset = (presetKey: 'local' | 'demo') => {
    setSelectedPreset(presetKey);
    setIndexResult(null);
    if (presetKey === 'local') {
      setBaseUrl(VUFIND_PRESETS.local.baseUrl);
      setSolrUrl(VUFIND_PRESETS.local.solrUrl);
    } else {
      setBaseUrl(VUFIND_PRESETS.demo.baseUrl);
      setSolrUrl(VUFIND_PRESETS.demo.solrUrl);
    }
  };

  const handleIndexToVuFind = async () => {
    setIsIndexing(true);
    setIndexResult(null);

    try {
      const res = await client.indexToSolr(solrDoc);
      setIndexResult({ success: true, recordId: solrDoc.id, message: res.message });
      toast.success(`Published to VuFind Solr index: ${solrDoc.id}`);
    } catch (err: any) {
      const errMsg = err.message || 'Error communicating with Solr/VuFind';
      setIndexResult({ success: false, error: errMsg });
      toast.error(`Indexing failed: ${errMsg}`);
    } finally {
      setIsIndexing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success('VuFind Record ID copied');
  };

  const vufindRecordUrl = `${baseUrl}/Record/${solrDoc.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-teal-500/10 via-transparent to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl text-white shadow-md">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <span>VuFind® Discovery Publishing</span>
                  <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-300">
                    Apache Solr
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Index and publish active BIBFRAME record to VuFind discovery portal at <code className="font-mono text-teal-600 dark:text-teal-300">D:\vufind</code>
                </DialogDescription>
              </div>
            </div>

            {/* Health pill */}
            <div className="flex items-center gap-2">
              {probeStatus.tested && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  probeStatus.ok || probeStatus.solrOk
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                }`}>
                  {probeStatus.ok || probeStatus.solrOk ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{probeStatus.solrOk ? 'Solr & Web Online' : 'Active'}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                      <span>Stack Offline</span>
                    </>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={probeHealth}
                disabled={isProbing}
                className="h-8 text-xs cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isProbing ? 'animate-spin' : ''}`} />
                Test
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target Preset Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Target VuFind Environment
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                onClick={() => handleSelectPreset('local')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === 'local'
                    ? 'border-teal-500 bg-teal-500/10 shadow-sm ring-1 ring-teal-500/30'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">
                    {VUFIND_PRESETS.local.name}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Localhost</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Portal: <code className="text-teal-600 dark:text-teal-300">{VUFIND_PRESETS.local.baseUrl}</code> | Solr: <code className="text-teal-600 dark:text-teal-300">8983</code>
                </p>
              </div>

              <div
                onClick={() => handleSelectPreset('demo')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === 'demo'
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">
                    {VUFIND_PRESETS.demo.name}
                  </div>
                  <Badge variant="outline" className="text-[10px]">Demo</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Official community testbed (<code className="text-blue-600 dark:text-blue-300">vufind.org</code>)
                </p>
              </div>
            </div>
          </div>

          {/* Local Stack Offline Guide */}
          {selectedPreset === 'local' && probeStatus.tested && !probeStatus.ok && !probeStatus.solrOk && (
            <div className="p-4 rounded-xl border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                <Terminal className="h-4 w-4 text-amber-600" />
                <span>VuFind stack at D:\vufind is currently offline</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                To launch VuFind Web, Apache Solr, and MariaDB, open PowerShell and run:
              </p>
              <div className="p-2.5 rounded-lg bg-gray-900 text-amber-300 font-mono text-[11px] select-all flex items-center justify-between">
                <span>cd D:\vufind ; .\start.ps1</span>
                <span className="text-[10px] text-gray-400">docker compose up -d</span>
              </div>
            </div>
          )}

          {/* Index Result Banner */}
          {indexResult && (
            <div className={`p-4 rounded-xl border ${
              indexResult.success
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex items-start gap-3">
                {indexResult.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-sm">
                    {indexResult.success ? 'Successfully Indexed into VuFind Solr!' : 'Indexing Error'}
                  </div>
                  {indexResult.success && indexResult.recordId && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                      <span className="text-gray-600 dark:text-gray-300">Record ID:</span>
                      <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-900 dark:text-emerald-200">
                        {indexResult.recordId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(indexResult.recordId!)}
                        className="h-6 px-2 text-[11px]"
                      >
                        {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {copiedId ? 'Copied' : 'Copy'}
                      </Button>
                      <a
                        href={vufindRecordUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline ml-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View in VuFind Discovery
                      </a>
                    </div>
                  )}
                  {indexResult.error && (
                    <div className="text-xs font-mono break-all pt-1 text-rose-800 dark:text-rose-300">
                      {indexResult.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Solr Document Preview */}
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid grid-cols-2 w-64 h-8">
              <TabsTrigger value="preview" className="text-xs">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Discovery Card
              </TabsTrigger>
              <TabsTrigger value="solr" className="text-xs">
                <Code2 className="h-3.5 w-3.5 mr-1.5" />
                Solr Schema
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-3 space-y-3">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Discovery Title</span>
                  <span className="font-bold text-gray-900 dark:text-white text-right max-w-[70%] truncate">
                    {solrDoc.title}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Primary Author</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right">
                    {solrDoc.author || 'Unknown'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Format & Type</span>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {solrDoc.format?.[0] || 'Book'}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200">
                      BIBFRAME 2.0
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Subjects & Topics</span>
                  <span className="text-gray-900 dark:text-white text-right max-w-[70%] truncate">
                    {solrDoc.topic && solrDoc.topic.length > 0 ? solrDoc.topic.join(' • ') : 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Publication</span>
                  <span className="text-gray-900 dark:text-white text-right">
                    {[solrDoc.publishPlace?.[0], solrDoc.publisher?.[0], solrDoc.publishDate?.[0]].filter(Boolean).join(' : ') || 'N/A'}
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="solr" className="mt-3">
              <pre className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-900 text-gray-200 font-mono text-[11px] max-h-60 overflow-auto">
                {JSON.stringify(solrDoc, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Solr Target: <code className="font-mono text-teal-600 dark:text-teal-400">{solrUrl}</code>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleIndexToVuFind}
              disabled={isIndexing}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              {isIndexing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Indexing to Solr...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 mr-1.5" />
                  Index in VuFind Discovery
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
