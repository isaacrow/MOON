/**
 * WolfMoon W3C SPARQL 1.1 Triple Store Explorer
 * Embedded Triple Store & SPARQL Query Workbench running at http://localhost:5173
 * Executes SPARQL queries against local W3C Quad Store (:8080/sparql),
 * provides interactive query builder, live RDF quad metrics, and ecosystem sync.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Terminal,
  Play,
  Copy,
  Download,
  RefreshCw,
  Layers,
  Sparkles,
  CheckCircle,
  FileCode,
  Table,
  UploadCloud,
  Hash,
  Globe,
  Sliders,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface WolfMoonSparqlExplorerProps {
  currentRecordGraph?: any;
  isDark?: boolean;
}

const SAMPLE_QUERIES = [
  {
    name: 'جميع الرسوم الثلاثية (All Quads)',
    query: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX bf: <http://id.loc.gov/ontologies/bibframe/>

SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
}
LIMIT 50`,
  },
  {
    name: 'المؤلفون والأعمال (Authors & Works)',
    query: `PREFIX bf: <http://id.loc.gov/ontologies/bibframe/>

SELECT ?author (COUNT(?work) AS ?totalWorks)
WHERE {
  ?work bf:agent ?author .
}
GROUP BY ?author`,
  },
  {
    name: 'العناوين ونوع المادة (Titles & Types)',
    query: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX bf: <http://id.loc.gov/ontologies/bibframe/>

SELECT ?work ?title ?type
WHERE {
  ?work rdf:type ?type .
  OPTIONAL { ?work bf:title ?title }
}
LIMIT 25`,
  },
  {
    name: 'الرسوم المسماة (Named Graphs)',
    query: `SELECT DISTINCT ?graph (COUNT(?s) AS ?quadCount)
WHERE {
  GRAPH ?graph {
    ?s ?p ?o .
  }
}
GROUP BY ?graph`,
  },
  {
    name: 'بناء رسم جديد (CONSTRUCT Graph)',
    query: `PREFIX bf: <http://id.loc.gov/ontologies/bibframe/>

CONSTRUCT {
  ?s bf:title ?title .
}
WHERE {
  ?s bf:title ?title .
}
LIMIT 20`,
  },
];

export function WolfMoonSparqlExplorer({
  currentRecordGraph,
  isDark = true,
}: WolfMoonSparqlExplorerProps) {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].query);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [viewFormat, setViewFormat] = useState<'table' | 'json'>('table');
  const [stats, setStats] = useState<{
    totalQuads: number;
    subjects: number;
    predicates: number;
    objects: number;
    graphs: number;
  }>({
    totalQuads: 0,
    subjects: 0,
    predicates: 0,
    objects: 0,
    graphs: 0,
  });
  const [copied, setCopied] = useState(false);

  // Fetch triple store statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/ecosystem/status');
      if (res.ok) {
        const data = await res.json();
        if (data.ecosystem?.tripleStore?.stats) {
          setStats(data.ecosystem.tripleStore.stats);
        }
      }
    } catch (e) {
      console.warn('Stats fetch note:', e);
    }
  }, []);

  // Execute SPARQL query against /sparql
  const executeQuery = async (customQuery?: string) => {
    const q = customQuery || query;
    setIsExecuting(true);
    try {
      const res = await fetch('/sparql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json, application/json',
        },
        body: q,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SPARQL Query Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      setResults(data);
      fetchStats();
      toast.success('تم تنفيذ استعلام SPARQL بنجاح');
    } catch (err: any) {
      toast.error(`خطأ في تنفيذ الاستعلام: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    fetchStats();
    executeQuery(SAMPLE_QUERIES[0].query);
  }, [fetchStats]);

  // Ingest active record to Triple Store
  const handleIngestCurrentRecord = async () => {
    if (!currentRecordGraph) {
      toast.error('لا يوجد رسم بياني نشط في المحرر');
      return;
    }
    try {
      const res = await fetch('/api/ecosystem/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `moon-${Date.now()}`,
          rdfGraph: currentRecordGraph,
          title: currentRecordGraph?.instanceData?.['bf:title']?.['bf:mainTitle'] || 'BIBFRAME Resource',
        }),
      });

      if (res.ok) {
        toast.success('تمت مزامنة التسجيلة في المخزن الثلاثي بنجاح!');
        fetchStats();
        executeQuery(query);
      }
    } catch (e: any) {
      toast.error(`فشلت المزامنة: ${e.message}`);
    }
  };

  const copyResults = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('تم نسخ النتائج إلى الحافظة');
  };

  const tableVars = results?.head?.vars || [];
  const tableBindings = results?.results?.bindings || [];

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Ecosystem Status Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-blue-950/40 border border-amber-500/30 backdrop-blur-xl shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">مستكشف مخزن الثلاثيات (W3C SPARQL 1.1 Engine)</h2>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                QuadStore Multi-Index (SPO/POS/OSP)
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              محرك استعلام الويب الدلالي W3C SPARQL 1.1 الأصلي - متصل محلياً عبر الرابط الموحد (:8080/sparql)
            </p>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              <Hash className="w-3.5 h-3.5" />
              <span>الثلاثيات: {stats.totalQuads}</span>
            </span>

            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>الرسوم: {stats.graphs}</span>
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleIngestCurrentRecord}
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>مزامنة تسجيلة مون الحالية في المخزن</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              fetchStats();
              executeQuery(query);
            }}
            disabled={isExecuting}
            className="h-8 text-xs bg-white/5 border-white/15 text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Query Presets Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-gray-400 font-bold ml-1">استعلامات جاهزة:</span>
        {SAMPLE_QUERIES.map((sq, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQuery(sq.query);
              executeQuery(sq.query);
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer font-semibold shrink-0"
          >
            {sq.name}
          </button>
        ))}
      </div>

      {/* Query Editor & Controls */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/15 space-y-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>محرر استعلامات SPARQL 1.1:</span>
          </span>
          <span className="text-[11px] text-gray-400 font-mono">POST /sparql (Content-Type: application/sparql-query)</span>
        </div>

        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="font-mono text-xs text-amber-300 bg-gray-950/80 border-white/15 rounded-xl p-4 min-h-[140px] focus:outline-none"
          dir="ltr"
          placeholder="اكتب استعلام SPARQL هنا..."
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewFormat('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewFormat === 'table' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              عرض جدولي
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('json')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewFormat === 'json' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              عرض W3C JSON
            </button>
          </div>

          <div className="flex items-center gap-2">
            {results && (
              <Button
                size="sm"
                variant="outline"
                onClick={copyResults}
                className="h-8 text-xs bg-white/5 border-white/15 text-white cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                <span>نسخ النتائج</span>
              </Button>
            )}

            <Button
              onClick={() => executeQuery(query)}
              disabled={isExecuting}
              className="h-8 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>تنفيذ الاستعلام</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Results View Container */}
      <div className="rounded-2xl border border-white/15 bg-black/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs text-gray-300">
          <span className="font-bold flex items-center gap-1.5">
            <Table className="w-4 h-4 text-amber-400" />
            <span>نتائج الاستعلام ({tableBindings.length} سجل)</span>
          </span>
          <span className="text-gray-400 text-[11px]">W3C SPARQL Query Results 1.1</span>
        </div>

        {viewFormat === 'json' ? (
          <pre className="p-4 text-emerald-400 font-mono text-xs max-h-96 overflow-auto bg-gray-950/80" dir="ltr">
            {results ? JSON.stringify(results, null, 2) : '/* اضغط على تنفيذ الاستعلام لعرض النتائج */'}
          </pre>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs text-right" dir="ltr">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-mono">
                  <th className="p-3 text-left w-12">#</th>
                  {tableVars.map((v: string) => (
                    <th key={v} className="p-3 text-left font-bold text-amber-300">?{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {tableBindings.length === 0 ? (
                  <tr>
                    <td colSpan={tableVars.length + 1} className="p-8 text-center text-gray-400 text-xs">
                      {isExecuting ? 'جارِ تنفيذ الاستعلام...' : 'لا توجد نتائج مطابقة للاستعلام.'}
                    </td>
                  </tr>
                ) : (
                  tableBindings.map((binding: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-gray-500 text-left">{rIdx + 1}</td>
                      {tableVars.map((v: string) => {
                        const val = binding[v];
                        if (!val) return <td key={v} className="p-3 text-gray-600">-</td>;
                        const isUri = val.type === 'uri';
                        return (
                          <td key={v} className="p-3 text-left max-w-xs truncate" title={val.value}>
                            {isUri ? (
                              <span className="text-sky-400 hover:underline">{val.value}</span>
                            ) : (
                              <span className="text-emerald-300">"{val.value}"</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
