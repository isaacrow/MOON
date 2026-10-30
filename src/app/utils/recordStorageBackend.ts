/**
 * BIBFRAME Record Storage with Supabase Backend
 * 
 * This module handles saving, loading, and managing BIBFRAME records using:
 * - Supabase PostgreSQL database (key-value store) as primary storage
 * - localStorage as a fallback cache when offline or if Supabase is unavailable
 * 
 * Records are stored in JSON-LD format with @graph structure containing:
 * - Work entities (bf:Work, bf:Text, etc.)
 * - Instance entities (bf:Instance, bf:Print, bf:Electronic, etc.)
 * 
 * All operations automatically sync to Supabase and cache locally.
 */
import { BIBFRAMERecord } from '../types/bibframe';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { realLocExamples } from './realLocExamples';

export interface SavedRecord {
  id: string;
  record: BIBFRAMERecord;
  createdAt: string;
  modifiedAt: string;
  title: string;
  cataloger?: string;
  resourceType?: string;
  coverImage?: string;
  status?: 'complete' | 'pending-review' | 'needs-review';
  approvedBy?: string;
  approvedAt?: string;
  jcricket?: {
    provenanceId?: string;
    institutionCode?: string;
    editHistory?: Array<{
      userId: string;
      username: string;
      timestamp: string;
      action: string;
    }>;
  };
}

const API_BASE = typeof window !== 'undefined' ? '/api' : 'http://localhost:8080';

// Get access token from localStorage
function getAccessToken(): string | null {
  const auth = localStorage.getItem('moon_auth');
  if (auth) {
    try {
      const { accessToken } = JSON.parse(auth);
      return accessToken;
    } catch (error) {
      console.error('Error parsing auth data:', error);
    }
  }
  return null;
}

/**
 * CRITICAL: Build safe node with guaranteed @type and @id
 * Spread happens FIRST, defaults happen LAST
 * This ensures @type can NEVER disappear
 */
function buildSafeNode(node: any, defaultType: string, defaultId: string) {
  return {
    ...node,
    '@id': node?.['@id'] || defaultId,
    '@type': node?.['@type'] || defaultType
  };
}

/**
 * CRITICAL: Extract Work and Instance from @graph
 * Never fallback to template - throw error if invalid
 */
function extractNodesFromGraph(graph: any[]) {
  const work = graph.find(n => {
    const type = n['@type'];
    if (Array.isArray(type)) {
      return type.some((t: string) => t?.includes?.('Work'));
    }
    return type?.includes?.('Work');
  });

  const instance = graph.find(n => {
    const type = n['@type'];
    if (Array.isArray(type)) {
      return type.some((t: string) => t?.includes?.('Instance'));
    }
    return type?.includes?.('Instance');
  });

  if (!work || !instance) {
    throw new Error("Invalid BIBFRAME graph: missing Work or Instance");
  }

  return { work, instance };
}

export async function saveRecord(record: BIBFRAMERecord, cataloger?: string): Promise<SavedRecord> {
  // Helper to safely extract string from potentially nested title objects
  const extractTitleString = (titleValue: any): string => {
    if (!titleValue) return '';
    if (typeof titleValue === 'string') return titleValue;
    
    // If it's an object, try to extract string value
    if (typeof titleValue === 'object') {
      // First try common BIBFRAME properties
      if (typeof titleValue['bf:mainTitle'] === 'string') return titleValue['bf:mainTitle'];
      if (typeof titleValue['rdfs:label'] === 'string') return titleValue['rdfs:label'];
      if (typeof titleValue['mainTitle'] === 'string') return titleValue['mainTitle'];
      
      // If bf:mainTitle is itself an object with nested values
      if (titleValue['bf:mainTitle'] && typeof titleValue['bf:mainTitle'] === 'object') {
        if (titleValue['bf:mainTitle']['@value']) return String(titleValue['bf:mainTitle']['@value']);
        if (titleValue['bf:mainTitle']['rdfs:label']) return String(titleValue['bf:mainTitle']['rdfs:label']);
      }
    }
    
    return '';
  };

  // Enhanced title extraction from @graph structure
  let title = 'Untitled Record';
  
  // FIRST: Check if there's a Title node in the @graph (MoonEngineGlass format)
  if (record['@graph'] && Array.isArray(record['@graph'])) {
    const titleNode = record['@graph'].find((n: any) => n['@type'] === 'bf:Title');
    if (titleNode) {
      let mainTitle = '';
      let subtitle = '';
      
      if (titleNode.mainTitle) mainTitle = String(titleNode.mainTitle);
      if (titleNode.subtitle) subtitle = String(titleNode.subtitle);
      
      if (mainTitle) {
        title = subtitle ? `${mainTitle} ${subtitle}` : mainTitle;
      }
    }
  }
  
  // Try instance title (could be URI reference)
  if (title === 'Untitled Record') {
    const instanceTitle = record.instance?.['title'] || record.instance?.['bf:title'];
    if (instanceTitle) {
      // If it's a URI, find the Title node in @graph
      if (typeof instanceTitle === 'string' && instanceTitle.startsWith('http://')) {
        if (record['@graph'] && Array.isArray(record['@graph'])) {
          const titleNode = record['@graph'].find((n: any) => n['@id'] === instanceTitle);
          if (titleNode) {
            let mainTitle = '';
            let subtitle = '';
            
            if (titleNode.mainTitle) mainTitle = String(titleNode.mainTitle);
            if (titleNode.subtitle) subtitle = String(titleNode.subtitle);
            
            if (mainTitle) {
              title = subtitle ? `${mainTitle} ${subtitle}` : mainTitle;
            }
          }
        }
      } else {
        const extracted = extractTitleString(instanceTitle);
        if (extracted) title = extracted;
      }
    }
  }
  
  // Try work title if no instance title (could be URI reference)
  if (title === 'Untitled Record') {
    const workTitle = record.work?.['title'] || record.work?.['bf:title'];
    if (workTitle) {
      // If it's a URI, find the Title node in @graph
      if (typeof workTitle === 'string' && workTitle.startsWith('http://')) {
        if (record['@graph'] && Array.isArray(record['@graph'])) {
          const titleNode = record['@graph'].find((n: any) => n['@id'] === workTitle);
          if (titleNode) {
            let mainTitle = '';
            let subtitle = '';
            
            if (titleNode.mainTitle) mainTitle = String(titleNode.mainTitle);
            if (titleNode.subtitle) subtitle = String(titleNode.subtitle);
            
            if (mainTitle) {
              title = subtitle ? `${mainTitle} ${subtitle}` : mainTitle;
            }
          }
        }
      } else {
        const extracted = extractTitleString(workTitle);
        if (extracted) title = extracted;
      }
    }
  }
  
  // Try instance label
  if (title === 'Untitled Record' && record.instance?.['rdfs:label']) {
    title = String(record.instance['rdfs:label']);
  }
  
  // Try work label
  if (title === 'Untitled Record' && record.work?.['rdfs:label']) {
    title = String(record.work['rdfs:label']);
  }

  const resourceType = record.metadata?.resourceType || 'Unknown';
  
  // Try to get cover image from instance identifiers
  let coverImage: string | undefined;
  const identifiers = record.instance['bf:identifiedBy'] || [];
  for (const id of identifiers) {
    if (id['@type'] === 'bf:Isbn' && id['rdf:value']) {
      coverImage = `https://covers.openlibrary.org/b/isbn/${id['rdf:value']}-M.jpg`;
      break;
    }
  }

  const savedRecord: SavedRecord = {
    id: `record-${Date.now()}`,
    record,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    title,
    cataloger,
    resourceType,
    coverImage,
  };

  try {
    // Build safe Work and Instance nodes - spread FIRST, defaults LAST
    const safeWork = buildSafeNode(
      record.work,
      'bf:Work',
      `http://moon.local/work/${Date.now()}`
    );

    const safeInstance = buildSafeNode(
      record.instance,
      'bf:Instance',
      `http://moon.local/instance/${Date.now()}`
    );

    // Build JSON-LD document format expected by server
    const jsonldDocument = {
      '@context': 'http://id.loc.gov/ontologies/bibframe/',
      '@graph': [safeWork, safeInstance]
    };
    
    // LOG: Verify @type is preserved
    console.log('💾 Saving record with @types:', {
      work: safeWork['@type'],
      instance: safeInstance['@type']
    });
    
    const response = await fetch(`${API_BASE}/records/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        id: savedRecord.id,
        document: jsonldDocument,
        title: savedRecord.title,
        metadata: record.metadata || {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save record to Supabase:', errorText);
      throw new Error(`Failed to save record: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Record saved to Supabase:', data);
    
    // Also save to localStorage as a cache
    try {
      const records = getAllRecordsLocal();
      const existingIndex = records.findIndex(r => r.id === savedRecord.id);
      if (existingIndex >= 0) {
        records[existingIndex] = savedRecord;
      } else {
        records.push(savedRecord);
      }
      localStorage.setItem('bibframe_saved_records', JSON.stringify(records));
    } catch (e) {
      console.error('Error caching to localStorage:', e);
    }
    
    return savedRecord;
  } catch (error) {
    console.error('Error saving record to Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const records = getAllRecordsLocal();
    const existingIndex = records.findIndex(r => r.id === savedRecord.id);
    if (existingIndex >= 0) {
      records[existingIndex] = savedRecord;
    } else {
      records.push(savedRecord);
    }
    localStorage.setItem('bibframe_saved_records', JSON.stringify(records));
    return savedRecord;
  }
}

export async function getAllRecords(): Promise<SavedRecord[]> {
  try {
    const response = await fetch(`${API_BASE}/records`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.statusText}`);
    }

    const data = await response.json();
    const supabaseRecords = data.records || [];
    
    // Convert server format to SavedRecord format
    const convertedRecords: SavedRecord[] = supabaseRecords.map((serverRecord: any) => {
      // Normalize @graph immediately - ONE structure everywhere
      const graph = serverRecord.document?.['@graph'] || serverRecord['@graph'];
      
      if (!graph || !Array.isArray(graph)) {
        console.error("No @graph found in record:", serverRecord.id);
        throw new Error(`Invalid record ${serverRecord.id}: missing @graph`);
      }

      // Extract Work and Instance - throw error if invalid (NO TEMPLATE FALLBACK)
      let work: any;
      let instance: any;
      
      try {
        const nodes = extractNodesFromGraph(graph);
        work = nodes.work;
        instance = nodes.instance;
      } catch (error) {
        console.error(`Failed to extract nodes from record ${serverRecord.id}:`, error);
        // Try recovery from relationships if extraction failed
        const potentialInstance = graph.find((n: any) => n['bf:instanceOf']);
        if (potentialInstance) {
          instance = potentialInstance;
          if (!instance['@type']) instance['@type'] = 'bf:Instance';
          
          const workId = instance['bf:instanceOf']['@id'];
          if (workId) {
            const potentialWork = graph.find((n: any) => n['@id'] === workId);
            if (potentialWork) {
              work = potentialWork;
              if (!work['@type']) work['@type'] = 'bf:Work';
            }
          }
        }
        
        // If still no work/instance, this record is corrupted
        if (!work || !instance) {
          throw new Error(`Corrupted record ${serverRecord.id}: cannot recover Work or Instance`);
        }
      }
      
      // Helper to safely extract string from potentially nested title objects
      const extractTitleString = (titleValue: any): string => {
        if (!titleValue) return '';
        if (typeof titleValue === 'string') return titleValue;
        
        // If it's an object, try to extract string value
        if (typeof titleValue === 'object') {
          // First try common BIBFRAME properties
          if (typeof titleValue['bf:mainTitle'] === 'string') return titleValue['bf:mainTitle'];
          if (typeof titleValue['rdfs:label'] === 'string') return titleValue['rdfs:label'];
          if (typeof titleValue['mainTitle'] === 'string') return titleValue['mainTitle'];
          
          // If bf:mainTitle is itself an object with nested values
          if (titleValue['bf:mainTitle'] && typeof titleValue['bf:mainTitle'] === 'object') {
            if (titleValue['bf:mainTitle']['@value']) return String(titleValue['bf:mainTitle']['@value']);
            if (titleValue['bf:mainTitle']['rdfs:label']) return String(titleValue['bf:mainTitle']['rdfs:label']);
          }
        }
        
        return '';
      };

      // Enhanced title extraction - check Title node first
      let title = serverRecord.title || 'Untitled Record';
      
      // Ensure title is a string even if serverRecord.title is an object
      if (typeof title === 'object') {
        const extracted = extractTitleString(title);
        title = extracted || 'Untitled Record';
      }
      
      // If title is still default, try to extract from Title node in graph
      if (title === 'Untitled Record') {
        const titleNode = graph.find((n: any) => n['@type'] === 'bf:Title');
        if (titleNode) {
          // Check for mainTitle and subtitle separately
          let mainTitle = '';
          let subtitle = '';
          
          if (titleNode.mainTitle) mainTitle = String(titleNode.mainTitle);
          if (titleNode.subtitle) subtitle = String(titleNode.subtitle);
          
          // Combine mainTitle and subtitle
          if (mainTitle) {
            title = subtitle ? `${mainTitle} ${subtitle}` : mainTitle;
            console.log(`📖 Extracted title from Title node: "${title}" (record: ${serverRecord.id})`);
          } else {
            const extracted = extractTitleString(titleNode);
            title = extracted || 'Untitled Record';
          }
        }
      }
      
      // Fallback to instance title property (might be URI reference to Title node)
      if (title === 'Untitled Record') {
        const instanceTitleRef = instance['title'];
        if (instanceTitleRef && typeof instanceTitleRef === 'string') {
          // It's a URI reference - find the actual Title node
          const titleNode = graph.find((n: any) => n['@id'] === instanceTitleRef);
          if (titleNode) {
            let mainTitle = '';
            let subtitle = '';
            
            if (titleNode.mainTitle) mainTitle = String(titleNode.mainTitle);
            if (titleNode.subtitle) subtitle = String(titleNode.subtitle);
            
            if (mainTitle) {
              title = subtitle ? `${mainTitle} ${subtitle}` : mainTitle;
            }
          }
        } else if (instanceTitleRef) {
          const extracted = extractTitleString(instanceTitleRef);
          if (extracted) title = extracted;
        }
      }
      
      // Fallback to work title property (might be URI reference to Title node)
      if (title === 'Untitled Record') {
        const workTitleRef = work['title'];
        if (workTitleRef && typeof workTitleRef === 'string') {
          // It's a URI reference - find the actual Title node
          const titleNode = graph.find((n: any) => n['@id'] === workTitleRef);
          if (titleNode) {
            let mainTitle = '';
            let subtitle = '';
            
            if (titleNode.mainTitle) mainTitle = String(titleNode.mainTitle);
            if (titleNode.subtitle) subtitle = String(titleNode.subtitle);
            
            if (mainTitle) {
              title = subtitle ? `${mainTitle} ${subtitle}` : mainTitle;
            }
          }
        } else if (workTitleRef) {
          const extracted = extractTitleString(workTitleRef);
          if (extracted) title = extracted;
        }
      }
      
      if (title === 'Untitled Record' && instance['rdfs:label']) {
        title = String(instance['rdfs:label']);
      }
      if (title === 'Untitled Record' && work['rdfs:label']) {
        title = String(work['rdfs:label']);
      }
      
      // CRITICAL FIX: Convert @graph format to work/instance format
      const convertedRecord: BIBFRAMERecord = {
        '@context': serverRecord.document?.['@context'] || {
          'bf': 'http://id.loc.gov/ontologies/bibframe/',
          'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        },
        work: work,
        instance: instance,
        metadata: {
          catalogingLanguage: serverRecord.metadata?.catalogingLanguage || 'en',
          descriptionConventions: serverRecord.metadata?.descriptionConventions || 'rda',
          resourceType: serverRecord.metadata?.resourceType || 'Text',
          catalogingInterface: serverRecord.metadata?.catalogingInterface,
          templateId: serverRecord.metadata?.templateId,
          recordId: serverRecord.metadata?.recordId,
          uriSet: serverRecord.metadata?.uriSet,
          ontologyVersion: serverRecord.metadata?.ontologyVersion,
          createdAt: serverRecord.metadata?.createdAt,
          catalogerId: serverRecord.metadata?.catalogerId,
        }
      };
      
      return {
        id: serverRecord.id,
        // Store the converted work/instance format
        record: convertedRecord,
        title: title,
        createdAt: serverRecord.saved || serverRecord.metadata?.createdAt || new Date().toISOString(),
        modifiedAt: serverRecord.saved || serverRecord.metadata?.modifiedAt || new Date().toISOString(),
        cataloger: serverRecord.metadata?.cataloger,
        resourceType: serverRecord.metadata?.resourceType,
      };
    });
    
    // Merge with seed examples and local records so nothing is ever lost
    const seedRecords = getSeedExamples();
    const localRecords = getAllRecordsLocal();
    const recordMap = new Map<string, SavedRecord>();

    seedRecords.forEach(r => recordMap.set(r.id, r));
    localRecords.forEach(r => recordMap.set(r.id, r));
    convertedRecords.forEach(r => recordMap.set(r.id, r));

    const finalRecords = Array.from(recordMap.values());
    finalRecords.sort((a, b) => {
      const dateA = new Date(a.modifiedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.modifiedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    try {
      localStorage.setItem('bibframe_saved_records', JSON.stringify(finalRecords));
    } catch (e) {
      console.error('Error caching to localStorage:', e);
    }
    
    console.log(`✅ Loaded ${finalRecords.length} total records (${convertedRecords.length} from Supabase, ${seedRecords.length} seeds)`);
    return finalRecords;
  } catch (error) {
    console.error('Error fetching records from Supabase, falling back to localStorage:', error);
    return getAllRecordsLocal();
  }
}

function getSeedExamples(): SavedRecord[] {
  return realLocExamples.map((ex) => ({
    id: ex.id,
    record: {
      '@context': {
        bf: 'http://id.loc.gov/ontologies/bibframe/',
        bflc: 'http://id.loc.gov/ontologies/bflc/',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      },
      work: ex.data.work,
      instance: ex.data.instance,
      metadata: {
        catalogingLanguage: ex.id.includes('arabic') || ex.id.includes('qabasat') ? 'ara' : 'en',
        descriptionConventions: 'rda',
        catalogingInterface: 'Wolf Moon',
        resourceType: ex.name.includes('مخطوط') ? 'Manuscript / مخطوط' : 'Monograph',
      }
    },
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    title: ex.name,
    cataloger: 'IQ-KaCCS / العتبة العباسية',
    resourceType: ex.name.includes('مخطوط') ? 'Manuscript / مخطوط' : 'Monograph'
  }));
}

export function getAllRecordsLocal(): SavedRecord[] {
  const seeds = getSeedExamples();
  const recordMap = new Map<string, SavedRecord>();

  // Add all seeds first
  seeds.forEach(s => recordMap.set(s.id, s));

  const stored = typeof window !== 'undefined' ? localStorage.getItem('bibframe_saved_records') : null;
  if (stored) {
    try {
      const records = JSON.parse(stored);
      if (Array.isArray(records)) {
        records.forEach((r: any) => {
          if (r && r.id) {
            recordMap.set(r.id, r);
          }
        });
      }
    } catch (e) {
      console.error('Error parsing localStorage records:', e);
    }
  }

  // Ensure al-qabasat has latest comprehensive 100% data
  const qabasatExample = seeds.find(e => e.id === 'al-qabasat-mir-damad');
  if (qabasatExample) {
    const existing = recordMap.get('al-qabasat-mir-damad');
    if (!existing || !existing.record?.work?.['bf:tableOfContents']) {
      recordMap.set('al-qabasat-mir-damad', qabasatExample);
    }
  }

  const allRecords = Array.from(recordMap.values());
  allRecords.sort((a, b) => {
    const dateA = new Date(a.modifiedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.modifiedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return allRecords;
}

export async function getRecordById(id: string): Promise<SavedRecord | null> {
  try {
    const response = await fetch(`${API_BASE}/records/${id}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Record ${id} not found in Supabase, checking localStorage`);
        const records = getAllRecordsLocal();
        return records.find((r) => r.id === id) || null;
      }
      throw new Error(`Failed to fetch record: ${response.statusText}`);
    }

    const serverRecord = await response.json();
    
    // Normalize @graph immediately - ONE structure everywhere
    const graph = serverRecord.document?.['@graph'] || serverRecord['@graph'];
    
    if (!graph || !Array.isArray(graph)) {
      console.error("No @graph found in record:", serverRecord.id);
      throw new Error(`Invalid record ${serverRecord.id}: missing @graph`);
    }

    // Extract Work and Instance - throw error if invalid (NO TEMPLATE FALLBACK)
    let work: any;
    let instance: any;
    
    try {
      const nodes = extractNodesFromGraph(graph);
      work = nodes.work;
      instance = nodes.instance;
    } catch (error) {
      console.error(`Failed to extract nodes from record ${serverRecord.id}:`, error);
      // Try recovery from relationships if extraction failed
      const potentialInstance = graph.find((n: any) => n['bf:instanceOf']);
      if (potentialInstance) {
        instance = potentialInstance;
        if (!instance['@type']) instance['@type'] = 'bf:Instance';
        
        const workId = instance['bf:instanceOf']['@id'];
        if (workId) {
          const potentialWork = graph.find((n: any) => n['@id'] === workId);
          if (potentialWork) {
            work = potentialWork;
            if (!work['@type']) work['@type'] = 'bf:Work';
          }
        }
      }
      
      // If still no work/instance, this record is corrupted
      if (!work || !instance) {
        throw new Error(`Corrupted record ${serverRecord.id}: cannot recover Work or Instance`);
      }
    }
    
    // Enhanced title extraction
    let title = serverRecord.title || 'Untitled Record';
    const instanceTitle = instance['bf:title'];
    if (title === 'Untitled Record' && instanceTitle) {
      if (typeof instanceTitle === 'string') {
        title = instanceTitle;
      } else if (instanceTitle['bf:mainTitle']) {
        title = instanceTitle['bf:mainTitle'];
      } else if (instanceTitle['rdfs:label']) {
        title = instanceTitle['rdfs:label'];
      }
    }
    if (title === 'Untitled Record') {
      const workTitle = work['bf:title'];
      if (workTitle) {
        if (typeof workTitle === 'string') {
          title = workTitle;
        } else if (workTitle['bf:mainTitle']) {
          title = workTitle['bf:mainTitle'];
        } else if (workTitle['rdfs:label']) {
          title = workTitle['rdfs:label'];
        }
      }
    }
    if (title === 'Untitled Record' && instance['rdfs:label']) {
      title = instance['rdfs:label'];
    }
    if (title === 'Untitled Record' && work['rdfs:label']) {
      title = work['rdfs:label'];
    }
    
    // Create standardized work/instance format
    const convertedRecord: BIBFRAMERecord = {
      '@context': serverRecord.document?.['@context'] || {
        'bf': 'http://id.loc.gov/ontologies/bibframe/',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      },
      work,
      instance,
      metadata: {
        catalogingLanguage: serverRecord.metadata?.catalogingLanguage || 'en',
        descriptionConventions: serverRecord.metadata?.descriptionConventions || 'rda',
        resourceType: serverRecord.metadata?.resourceType || 'Text'
      }
    };
    
    const savedRecord: SavedRecord = {
      id: serverRecord.id,
      record: convertedRecord,
      createdAt: serverRecord.saved,
      modifiedAt: serverRecord.saved,
      title,
    };
    
    console.log(`✅ Loaded record ${id} from Supabase`);
    return savedRecord;
  } catch (error) {
    console.error('Error fetching record from Supabase, checking localStorage:', error);
    // Fallback to localStorage
    const records = getAllRecordsLocal();
    return records.find((r) => r.id === id) || null;
  }
}

export async function deleteRecord(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/records/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete record: ${response.statusText}`);
    }
    
    console.log(`✅ Deleted record ${id} from Supabase`);
    
    // Also delete from localStorage cache
    const records = getAllRecordsLocal();
    const filtered = records.filter((r) => r.id !== id);
    localStorage.setItem('bibframe_saved_records', JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting record from Supabase:', error);
    // Still try to delete from localStorage
    const records = getAllRecordsLocal();
    const filtered = records.filter((r) => r.id !== id);
    localStorage.setItem('bibframe_saved_records', JSON.stringify(filtered));
  }
}

export async function updateRecord(id: string, record: BIBFRAMERecord, cataloger?: string): Promise<SavedRecord | null> {
  // Enhanced title extraction
  let title = 'Untitled Record';
  const instanceTitle = record.instance['bf:title'];
  if (instanceTitle) {
    if (typeof instanceTitle === 'string') {
      title = instanceTitle;
    } else if (instanceTitle['bf:mainTitle']) {
      title = instanceTitle['bf:mainTitle'];
    } else if (instanceTitle['rdfs:label']) {
      title = instanceTitle['rdfs:label'];
    }
  }
  if (title === 'Untitled Record') {
    const workTitle = record.work['bf:title'];
    if (workTitle) {
      if (typeof workTitle === 'string') {
        title = workTitle;
      } else if (workTitle['bf:mainTitle']) {
        title = workTitle['bf:mainTitle'];
      } else if (workTitle['rdfs:label']) {
        title = workTitle['rdfs:label'];
      }
    }
  }
  if (title === 'Untitled Record' && record.instance['rdfs:label']) {
    title = record.instance['rdfs:label'];
  }
  if (title === 'Untitled Record' && record.work['rdfs:label']) {
    title = record.work['rdfs:label'];
  }

  const resourceType = record.metadata?.resourceType || 'Unknown';

  // Try to get cover image
  let coverImage: string | undefined;
  const identifiers = record.instance['bf:identifiedBy'] || [];
  for (const identifier of identifiers) {
    if (identifier['@type'] === 'bf:Isbn' && identifier['rdf:value']) {
      coverImage = `https://covers.openlibrary.org/b/isbn/${identifier['rdf:value']}-M.jpg`;
      break;
    }
  }

  try {
    // First delete the old record, then save the new one
    await deleteRecord(id);
    
    const updatedRecord: SavedRecord = {
      id,
      record,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      title,
      cataloger,
      resourceType,
      coverImage,
    };
    
    // Build safe Work and Instance nodes - spread FIRST, defaults LAST
    const safeWork = buildSafeNode(
      record.work,
      'bf:Work',
      `http://moon.local/work/${Date.now()}`
    );

    const safeInstance = buildSafeNode(
      record.instance,
      'bf:Instance',
      `http://moon.local/instance/${Date.now()}`
    );
    
    // Build JSON-LD document format
    const jsonldDocument = {
      '@context': 'http://id.loc.gov/ontologies/bibframe/',
      '@graph': [safeWork, safeInstance]
    };
    
    const response = await fetch(`${API_BASE}/records/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        id,
        document: jsonldDocument
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update record: ${response.statusText}`);
    }

    console.log(`✅ Updated record ${id} in Supabase`);
    
    // Also update localStorage cache
    const records = getAllRecordsLocal();
    const index = records.findIndex((r) => r.id === id);
    
    if (index === -1) {
      records.push(updatedRecord);
    } else {
      records[index] = updatedRecord;
    }
    
    localStorage.setItem('bibframe_saved_records', JSON.stringify(records));
    return updatedRecord;
  } catch (error) {
    console.error('Error updating record in Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const records = getAllRecordsLocal();
    const index = records.findIndex((r) => r.id === id);
    
    if (index === -1) return null;

    records[index] = {
      ...records[index],
      record,
      modifiedAt: new Date().toISOString(),
      title,
      cataloger,
      resourceType,
      coverImage,
    };

    localStorage.setItem('bibframe_saved_records', JSON.stringify(records));
    return records[index];
  }
}

export async function searchRecords(query: string): Promise<SavedRecord[]> {
  const records = await getAllRecords();
  
  if (!query) return records;
  
  const lowerQuery = query.toLowerCase();
  
  return records.filter((record) => {
    const titleMatch = record.title.toLowerCase().includes(lowerQuery);
    const creatorMatch = record.record.work['bf:creator']?.some((creator) =>
      creator.label?.toLowerCase().includes(lowerQuery)
    );
    const catalogerMatch = record.cataloger?.toLowerCase().includes(lowerQuery);
    return titleMatch || creatorMatch || catalogerMatch;
  });
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import';
  recordId: string;
  recordTitle: string;
  details?: string;
}

export function logActivity(entry: Omit<ActivityLogItem, 'id' | 'timestamp'>): void {
  try {
    const raw = localStorage.getItem('moon_activity_log');
    const logs: ActivityLogItem[] = raw ? JSON.parse(raw) : [];
    logs.unshift({
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString(),
      ...entry,
    });
    localStorage.setItem('moon_activity_log', JSON.stringify(logs.slice(0, 500)));
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

export function getActivityLogs(): ActivityLogItem[] {
  try {
    const raw = localStorage.getItem('moon_activity_log');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Approve a pending record (Super Admin action)
 */
export async function approveRecord(id: string, approverName: string = 'Super Admin'): Promise<SavedRecord | null> {
  const records = getAllRecordsLocal();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return null;

  records[index] = {
    ...records[index],
    status: 'complete',
    approvedBy: approverName,
    approvedAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    record: {
      ...records[index].record,
      metadata: {
        ...records[index].record?.metadata,
        status: 'complete',
        approvedBy: approverName,
        approvedAt: new Date().toISOString(),
      }
    }
  };

  try {
    localStorage.setItem('bibframe_saved_records', JSON.stringify(records));
  } catch (e) {
    console.error('Error saving approved record to localStorage:', e);
  }

  // Also log audit activity
  logActivity({
    user: approverName,
    action: 'update',
    recordId: id,
    recordTitle: records[index].title,
    details: `Record approved by ${approverName} and published as Complete to catalog`,
  });

  return records[index];
}
