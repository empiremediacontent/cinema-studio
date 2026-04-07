'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Asset, AssetType } from '@/lib/types/database';

// ── Design Tokens ──
const C = {
  bg: '#0a0a0a', card: '#111', surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)', text: '#fff', text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)', accent: '#ff2d7b', accentBg: 'rgba(255,45,123,0.12)',
  teal: '#00e5ff', tealBg: 'rgba(0,229,255,0.06)',
  success: 'rgba(45,200,120,0.8)', successBg: 'rgba(45,200,120,0.08)',
  danger: '#ff264a', dangerBg: 'rgba(255,38,74,0.08)',
};

// ── Helpers ──
function getFolder(asset: Asset): string {
  const m = (asset.metadata || {}) as Record<string, unknown>;
  return (m.profile_name as string) || (m.folder_name as string) || '';
}

function getRole(asset: Asset): string {
  return ((asset.metadata || {}) as Record<string, unknown>).role as string || '';
}

function isCover(asset: Asset): boolean {
  return ((asset.metadata || {}) as Record<string, unknown>).is_folder_cover === true;
}

// Reusable styles
const LABEL: React.CSSProperties = {
  fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text3,
};

const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '12px', fontFamily: 'Raleway, sans-serif',
  background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`, outline: 'none',
};

// ── Folder info type ──
interface FolderInfo {
  name: string;
  count: number;
  type: AssetType;
  coverUrl: string | null;
  role: string;
  linkedShotCount: number;
}

// ══════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════

export default function AssetLibrary({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [shots, setShots] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadType, setUploadType] = useState<AssetType>('talent');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Assign to shot
  const [showAssign, setShowAssign] = useState(false);

  // New folder
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename folder
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  const supabase = createClient();

  // ── Load data ──
  useEffect(() => { loadAssets(); loadShots(); }, [projectId]);

  async function loadAssets() {
    setLoading(true);
    // Library is global: load all assets for this user regardless of project
    const { data } = await supabase.from('assets').select('*')
      .order('created_at', { ascending: false });
    setAssets((data as Asset[]) || []);
    setLoading(false);
  }

  async function loadShots() {
    const { data } = await supabase.from('shots').select('id, title, sort_order')
      .eq('project_id', projectId).order('sort_order', { ascending: true });
    setShots((data || []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      name: (s.title as string) || `Shot ${(s.sort_order as number) + 1}`,
    })));
  }

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  }

  // ── Computed: folders ──
  const folders = useMemo<FolderInfo[]>(() => {
    const map = new Map<string, Asset[]>();
    for (const a of assets) {
      const f = getFolder(a);
      if (!f) continue;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(a);
    }
    return Array.from(map.entries()).map(([name, folderAssets]) => {
      // Cover: use the one marked as cover, or first image
      const coverAsset = folderAssets.find(a => isCover(a)) || folderAssets[0];
      const linkedShots = new Set<string>();
      folderAssets.forEach(a => (a.linked_shots || []).forEach(s => linkedShots.add(s)));
      return {
        name,
        count: folderAssets.length,
        type: folderAssets[0].asset_type,
        coverUrl: coverAsset?.thumbnail_url || null,
        role: getRole(folderAssets[0]),
        linkedShotCount: linkedShots.size,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const ungroupedAssets = useMemo(() => assets.filter(a => !getFolder(a)), [assets]);

  // ── Filtered folders (for gallery view) ──
  const filteredFolders = useMemo(() => {
    let items = folders;
    if (typeFilter !== 'all') items = items.filter(f => f.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(f => f.name.toLowerCase().includes(q) || f.role.toLowerCase().includes(q));
    }
    return items;
  }, [folders, typeFilter, searchQuery]);

  // ── Images inside the open folder ──
  const folderImages = useMemo(() => {
    if (!openFolder) return [];
    return assets.filter(a => getFolder(a) === openFolder);
  }, [assets, openFolder]);

  const detailAsset = detailId ? assets.find(a => a.id === detailId) : null;

  // ── Upload ──
  // Compress an image file to stay under the size limit (returns a File)
  async function compressImage(file: File, maxSizeMB: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxBytes = maxSizeMB * 1024 * 1024;
        // Scale down dimensions if the file is very large
        let { width, height } = img;
        const scaleFactor = Math.min(1, Math.sqrt(maxBytes / file.size) * 1.1);
        if (scaleFactor < 1) {
          width = Math.round(width * scaleFactor);
          height = Math.round(height * scaleFactor);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for compression, start at 0.85 quality
        let quality = 0.85;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            if (blob.size <= maxBytes || quality <= 0.3) {
              const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
              resolve(compressed);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };
        tryCompress();
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }

  const MAX_FILE_SIZE_MB = 50; // Supabase free tier limit

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error during upload:', authError?.message || 'No user session');
      flash('Upload failed: not signed in. Please log in again.');
      setUploading(false);
      return;
    }

    const folder = uploadFolder.trim() || openFolder || '';
    let count = 0;
    let lastError = '';
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      let file: File = files[i];
      try {
        // Auto-compress images that exceed the size limit
        if (file.size > maxBytes && file.type.startsWith('image/')) {
          flash(`Compressing "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB)...`);
          try {
            file = await compressImage(file, MAX_FILE_SIZE_MB);
          } catch (compressErr) {
            console.error('Compression failed:', compressErr);
            lastError = `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB) and compression failed.`;
            continue;
          }
        } else if (file.size > maxBytes) {
          // Non-image files that are too large cannot be compressed
          lastError = `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB, exceeds the ${MAX_FILE_SIZE_MB}MB limit.`;
          continue;
        }

        const ts = Date.now();
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${user.id}/${projectId}/assets/${ts}_${i}.${ext}`;
        const { error: storageError } = await supabase.storage.from('generated-media').upload(path, file, { upsert: false });
        if (storageError) {
          console.error('Storage upload error:', storageError.message, 'Path:', path);
          lastError = storageError.message;
          continue;
        }
        const { data: urlData } = supabase.storage.from('generated-media').getPublicUrl(path);
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const metadata: Record<string, unknown> = {};
        if (folder) metadata.profile_name = folder;

        const { error: insertError } = await supabase.from('assets').insert({
          user_id: user.id, project_id: null, asset_type: uploadType,
          name, thumbnail_url: urlData.publicUrl, file_path: path,
          file_size: file.size, file_type: file.type, metadata,
        });
        if (insertError) {
          console.error('DB insert error:', insertError.message);
          lastError = insertError.message;
          continue;
        }
        count++;
      } catch (err) {
        console.error('Upload error:', err);
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    if (count > 0) {
      flash(`Uploaded ${count} file${count > 1 ? 's' : ''}`);
      await loadAssets();
    } else if (lastError) {
      flash(`Upload failed: ${lastError}`);
    } else {
      flash('No files were uploaded.');
    }
    setUploading(false);
    setShowUpload(false);
  }

  // ── Delete single asset ──
  async function deleteAsset(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const asset = assets.find(a => a.id === id);
    if (asset?.file_path) {
      await supabase.storage.from('generated-media').remove([asset.file_path]);
    }
    await supabase.from('assets').delete().eq('id', id).eq('user_id', user.id);
    setAssets(prev => prev.filter(a => a.id !== id));
    if (detailId === id) setDetailId(null);
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  }

  // ── Delete selected (bulk) ──
  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} asset${selectedIds.size > 1 ? 's' : ''} permanently?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const toDelete = assets.filter(a => selectedIds.has(a.id));
    const paths = toDelete.map(a => a.file_path).filter(Boolean) as string[];
    if (paths.length > 0) await supabase.storage.from('generated-media').remove(paths);
    const ids = toDelete.map(a => a.id);
    await supabase.from('assets').delete().in('id', ids).eq('user_id', user.id);
    setAssets(prev => prev.filter(a => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    if (detailId && selectedIds.has(detailId)) setDetailId(null);
    flash(`Deleted ${ids.length} asset${ids.length > 1 ? 's' : ''}`);
  }

  // ── Delete entire folder ──
  async function deleteFolder(folderName: string) {
    const folderAssetList = assets.filter(a => getFolder(a) === folderName);
    if (folderAssetList.length === 0) return;
    if (!confirm(`Delete "${folderName}" and all ${folderAssetList.length} image${folderAssetList.length > 1 ? 's' : ''} in it?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const paths = folderAssetList.map(a => a.file_path).filter(Boolean) as string[];
    if (paths.length > 0) await supabase.storage.from('generated-media').remove(paths);
    const ids = folderAssetList.map(a => a.id);
    await supabase.from('assets').delete().in('id', ids).eq('user_id', user.id);
    setAssets(prev => prev.filter(a => !ids.includes(a.id)));
    if (openFolder === folderName) setOpenFolder(null);
    if (detailId && ids.includes(detailId)) setDetailId(null);
    flash(`Deleted "${folderName}" (${ids.length} files)`);
  }

  // ── Delete ALL assets ──
  async function deleteAll() {
    if (assets.length === 0) return;
    if (!confirm(`Delete ALL ${assets.length} assets from your library? This cannot be undone.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const paths = assets.map(a => a.file_path).filter(Boolean) as string[];
    if (paths.length > 0) await supabase.storage.from('generated-media').remove(paths);
    await supabase.from('assets').delete().eq('user_id', user.id);
    setAssets([]);
    setSelectedIds(new Set());
    setDetailId(null);
    setOpenFolder(null);
    flash('Library cleared');
  }

  // ── Set folder cover ──
  async function setAsCover(assetId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const folderName = getFolder(asset);
    if (!folderName) return;

    // Clear existing cover in this folder
    const folderAssetList = assets.filter(a => getFolder(a) === folderName && isCover(a));
    for (const fa of folderAssetList) {
      const meta: Record<string, unknown> = { ...((fa.metadata || {}) as Record<string, unknown>) };
      delete meta.is_folder_cover;
      await supabase.from('assets').update({ metadata: meta }).eq('id', fa.id).eq('user_id', user.id);
    }

    // Set new cover
    const meta: Record<string, unknown> = { ...((asset.metadata || {}) as Record<string, unknown>), is_folder_cover: true };
    await supabase.from('assets').update({ metadata: meta }).eq('id', assetId).eq('user_id', user.id);

    // Update local state
    setAssets(prev => prev.map(a => {
      if (getFolder(a) !== folderName) return a;
      const m: Record<string, unknown> = { ...((a.metadata || {}) as Record<string, unknown>) };
      if (a.id === assetId) {
        m.is_folder_cover = true;
      } else {
        delete m.is_folder_cover;
      }
      return { ...a, metadata: m };
    }));
    flash('Cover image set');
  }

  // ── Rename folder ──
  async function renameFolder(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setRenamingFolder(null); return; }
    // Check for name collision
    if (folders.some(f => f.name === trimmed)) {
      flash(`A folder named "${trimmed}" already exists`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const folderAssetList = assets.filter(a => getFolder(a) === oldName);
    for (const asset of folderAssetList) {
      const meta: Record<string, unknown> = { ...((asset.metadata || {}) as Record<string, unknown>), profile_name: trimmed };
      delete meta.folder_name;
      delete meta.folder_id;
      await supabase.from('assets').update({ metadata: meta }).eq('id', asset.id).eq('user_id', user.id);
    }
    // Update local state
    setAssets(prev => prev.map(a => {
      if (getFolder(a) !== oldName) return a;
      const m: Record<string, unknown> = { ...((a.metadata || {}) as Record<string, unknown>), profile_name: trimmed };
      delete m.folder_name;
      delete m.folder_id;
      return { ...a, metadata: m };
    }));
    // If we're inside this folder, update openFolder
    if (openFolder === oldName) setOpenFolder(trimmed);
    if (uploadFolder === oldName) setUploadFolder(trimmed);
    setRenamingFolder(null);
    setRenameFolderValue('');
    flash(`Renamed to "${trimmed}"`);
  }

  // ── Save edit ──
  async function saveEdit() {
    if (!detailAsset) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const meta: Record<string, unknown> = { ...((detailAsset.metadata || {}) as Record<string, unknown>), role: editRole || undefined, profile_name: editFolder || undefined };
    delete meta.folder_name;
    delete meta.folder_id;
    await supabase.from('assets').update({ name: editName, description: editDesc, metadata: meta })
      .eq('id', detailAsset.id).eq('user_id', user.id);
    setAssets(prev => prev.map(a => a.id === detailAsset.id ? { ...a, name: editName, description: editDesc, metadata: meta } : a));
    setEditing(false);
    flash('Saved');
  }

  // ── Change asset type ──
  async function changeType(id: string, newType: AssetType) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('assets').update({ asset_type: newType }).eq('id', id).eq('user_id', user.id);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, asset_type: newType } : a));
    flash(`Changed to ${newType}`);
  }

  // ── Assign to shot ──
  async function assignToShot(assetId: string, shotId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const linked = asset.linked_shots ? [...asset.linked_shots] : [];
    if (!linked.includes(shotId)) linked.push(shotId);
    await supabase.from('assets').update({ linked_shots: linked }).eq('id', assetId).eq('user_id', user.id);
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, linked_shots: linked } : a));
    setShowAssign(false);
    flash('Assigned');
  }

  async function unassignShot(assetId: string, shotId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const linked = (asset.linked_shots || []).filter(s => s !== shotId);
    await supabase.from('assets').update({ linked_shots: linked }).eq('id', assetId).eq('user_id', user.id);
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, linked_shots: linked } : a));
    flash('Unassigned');
  }

  // ── Select helpers ──
  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  // ── Drag and drop ──
  const onDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
  }, [uploadType, uploadFolder, openFolder]);

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <span style={{ ...LABEL, fontSize: '11px' }}>Loading library...</span>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // VIEW: Inside a folder (image grid)
  // ══════════════════════════════════════════════
  if (openFolder) {
    const detail = detailAsset;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }} onDragEnter={onDrag}>
        {/* Toast */}
        {statusMsg && <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, padding: '10px 20px', background: C.successBg, border: `1px solid ${C.success}`, color: C.success, ...LABEL, fontSize: '11px' }}>{statusMsg}</div>}

        {/* Drag overlay */}
        {dragActive && (
          <div onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
            style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,229,255,0.08)', border: '2px dashed rgba(0,229,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: C.teal, ...LABEL, fontSize: '14px' }}>Drop files to add to {openFolder}</p>
          </div>
        )}

        {/* Folder header bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `1px solid ${C.border}`, flexShrink: 0, marginBottom: '12px' }}>
          <button onClick={() => { setOpenFolder(null); setDetailId(null); setSelectedIds(new Set()); setShowUpload(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', ...LABEL, fontSize: '10px', background: C.surface, color: C.text2, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <div style={{ flex: 1 }}>
            {renamingFolder === openFolder ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input value={renameFolderValue} onChange={e => setRenameFolderValue(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') renameFolder(openFolder, renameFolderValue); if (e.key === 'Escape') setRenamingFolder(null); }}
                  style={{ ...INPUT, flex: 1, fontSize: '14px', padding: '4px 8px', maxWidth: '260px' }} />
                <button onClick={() => renameFolder(openFolder, renameFolderValue)}
                  style={{ padding: '5px 12px', ...LABEL, fontSize: '9px', background: C.accentBg, color: C.accent, border: '1px solid rgba(255,45,123,0.3)', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setRenamingFolder(null)}
                  style={{ padding: '5px 10px', ...LABEL, fontSize: '9px', background: 'transparent', color: C.text3, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#fff', margin: 0 }}>{openFolder}</h2>
                <button onClick={() => { setRenamingFolder(openFolder); setRenameFolderValue(openFolder); }}
                  title="Rename folder"
                  style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.text3, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.teal)} onMouseLeave={e => (e.currentTarget.style.color = C.text3)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>{folderImages.length} image{folderImages.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <>
              <span style={{ ...LABEL, fontSize: '10px', color: C.accent }}>{selectedIds.size} selected</span>
              <button onClick={() => setSelectedIds(new Set())}
                style={{ padding: '5px 10px', ...LABEL, fontSize: '9px', background: 'transparent', color: C.text3, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Deselect</button>
              <button onClick={deleteSelected}
                style={{ padding: '5px 12px', ...LABEL, fontSize: '9px', background: C.dangerBg, color: C.danger, border: '1px solid rgba(255,38,74,0.2)', cursor: 'pointer' }}>Delete</button>
            </>
          )}
          {selectedIds.size === 0 && folderImages.length > 0 && (
            <button onClick={() => setSelectedIds(new Set(folderImages.map(a => a.id)))}
              style={{ padding: '5px 10px', ...LABEL, fontSize: '9px', background: 'transparent', color: C.text3, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Select All</button>
          )}

          <button onClick={() => deleteFolder(openFolder)}
            style={{ padding: '6px 14px', ...LABEL, fontSize: '9px', background: C.dangerBg, color: C.danger, border: '1px solid rgba(255,38,74,0.2)', cursor: 'pointer' }}>
            Delete Folder
          </button>
          <button onClick={() => { setUploadFolder(openFolder); setShowUpload(!showUpload); }}
            style={{ padding: '6px 16px', ...LABEL, fontSize: '10px', background: showUpload ? C.accentBg : 'linear-gradient(135deg, #ff264a, #ff2d7b)', color: showUpload ? C.accent : '#fff', border: showUpload ? '1px solid rgba(255,45,123,0.3)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Images
          </button>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div style={{ padding: '12px', background: C.tealBg, borderBottom: `1px solid rgba(0,229,255,0.15)`, display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ ...LABEL, fontSize: '8px', display: 'block', marginBottom: '3px' }}>Type</span>
              <select value={uploadType} onChange={e => setUploadType(e.target.value as AssetType)}
                style={{ ...INPUT, width: '120px', fontSize: '11px', padding: '6px 8px' }}>
                <option value="talent">Talent</option><option value="product">Product</option><option value="background">Background</option><option value="audio">Audio</option>
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*"
                onChange={e => handleUpload(e.target.files)} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ padding: '6px 20px', ...LABEL, fontSize: '10px', background: uploading ? C.surface : 'rgba(0,229,255,0.12)', color: uploading ? C.text3 : C.teal, border: `1px solid ${uploading ? C.border : 'rgba(0,229,255,0.3)'}`, cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? 'Uploading...' : 'Browse Files'}
              </button>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>or drag files anywhere</span>
          </div>
        )}

        {/* Image grid + detail */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: detail ? '12px' : 0 }}>
            {folderImages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ color: C.text3, fontSize: '12px', fontFamily: 'Raleway, sans-serif' }}>This folder is empty. Upload images to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: detail ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                {folderImages.map(asset => {
                  const isSelected = selectedIds.has(asset.id);
                  const isDetail = detailId === asset.id;
                  const isTheCover = isCover(asset);
                  return (
                    <div key={asset.id} onClick={() => setDetailId(isDetail ? null : asset.id)}
                      style={{ cursor: 'pointer', position: 'relative', border: `1px solid ${isDetail ? C.accent : isSelected ? C.teal : C.border}`, background: isDetail ? 'rgba(255,45,123,0.04)' : isSelected ? 'rgba(0,229,255,0.04)' : C.card, overflow: 'hidden' }}>
                      {/* Checkbox */}
                      <div onClick={e => { e.stopPropagation(); toggleSelect(asset.id); }}
                        style={{ position: 'absolute', top: '6px', left: '6px', zIndex: 2, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? C.accent : 'rgba(0,0,0,0.5)', border: `1px solid ${isSelected ? C.accent : 'rgba(255,255,255,0.5)'}`, cursor: 'pointer' }}>
                        {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      {/* Quick delete */}
                      <button onClick={e => { e.stopPropagation(); if (confirm('Delete this image?')) deleteAsset(asset.id); }}
                        style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 2, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: C.text3 }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.danger)} onMouseLeave={e => (e.currentTarget.style.color = C.text3)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                      {/* Cover badge */}
                      {isTheCover && (
                        <div style={{ position: 'absolute', bottom: '30px', left: '6px', zIndex: 2, padding: '2px 8px', ...LABEL, fontSize: '7px', background: 'rgba(255,45,123,0.85)', color: '#fff' }}>Cover</div>
                      )}
                      <div style={{ width: '100%', aspectRatio: '1', background: '#080808', overflow: 'hidden' }}>
                        {asset.thumbnail_url ? (
                          <img src={asset.thumbnail_url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '6px 8px' }}>
                        <p style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {detail && (
            <div style={{ width: '260px', flexShrink: 0, borderLeft: `1px solid ${C.border}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', aspectRatio: '1', background: '#080808', position: 'relative' }}>
                {detail.thumbnail_url ? <img src={detail.thumbnail_url} alt={detail.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: C.text3, fontSize: '11px' }}>No preview</span></div>}
                <button onClick={() => setDetailId(null)} style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                </button>
              </div>

              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editing ? (
                  <>
                    <div><span style={LABEL}>Name</span><input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...INPUT, marginTop: '3px' }} /></div>
                    <div><span style={LABEL}>Folder</span><input value={editFolder} onChange={e => setEditFolder(e.target.value)} list="edit-folder-list" style={{ ...INPUT, marginTop: '3px' }} /><datalist id="edit-folder-list">{folders.map(f => <option key={f.name} value={f.name} />)}</datalist></div>
                    <div><span style={LABEL}>Role</span><input value={editRole} onChange={e => setEditRole(e.target.value)} style={{ ...INPUT, marginTop: '3px' }} /></div>
                    <div><span style={LABEL}>Description</span><textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} style={{ ...INPUT, marginTop: '3px', resize: 'vertical' }} /></div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={saveEdit} style={{ flex: 1, padding: '7px', ...LABEL, fontSize: '9px', background: C.accentBg, color: C.accent, border: '1px solid rgba(255,45,123,0.3)', cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditing(false)} style={{ padding: '7px 12px', ...LABEL, fontSize: '9px', background: 'transparent', color: C.text3, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '13px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#fff', margin: 0, wordBreak: 'break-word' }}>{detail.name}</h3>
                    {getRole(detail) && <p style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.accent, margin: 0 }}>{getRole(detail)}</p>}
                    {detail.description && <p style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text2, margin: 0, lineHeight: 1.4 }}>{detail.description}</p>}

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <select value={detail.asset_type} onChange={e => changeType(detail.id, e.target.value as AssetType)}
                        style={{ ...INPUT, width: 'auto', fontSize: '9px', padding: '3px 6px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <option value="talent">Talent</option><option value="product">Product</option><option value="background">Background</option><option value="audio">Audio</option>
                      </select>
                      {detail.file_size && <span style={{ padding: '3px 6px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: C.text3, background: C.surface }}>{(detail.file_size / 1024 / 1024).toFixed(1)} MB</span>}
                    </div>

                    {/* Linked shots */}
                    {(detail.linked_shots || []).length > 0 && (
                      <div>
                        <span style={{ ...LABEL, display: 'block', marginBottom: '4px' }}>Linked Shots</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(detail.linked_shots || []).map(sid => (
                            <span key={sid} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '9px', fontFamily: 'Raleway, sans-serif', background: C.surface, color: C.text2, border: `1px solid ${C.border}` }}>
                              {shots.find(s => s.id === sid)?.name || 'Unknown'}
                              <button onClick={() => unassignShot(detail.id, sid)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 0, fontSize: '12px', lineHeight: 1 }}>&times;</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {showAssign && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto', padding: '6px', background: C.surface, border: `1px solid ${C.border}` }}>
                        {shots.map(s => {
                          const linked = (detail.linked_shots || []).includes(s.id);
                          return <button key={s.id} disabled={linked} onClick={() => assignToShot(detail.id, s.id)}
                            style={{ textAlign: 'left', padding: '5px 8px', fontSize: '10px', fontFamily: 'Raleway, sans-serif', background: linked ? C.surface : 'transparent', color: linked ? C.text3 : '#fff', border: `1px solid ${C.border}`, cursor: linked ? 'default' : 'pointer' }}>
                            {s.name}{linked ? ' (linked)' : ''}
                          </button>;
                        })}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button onClick={() => setAsCover(detail.id)}
                        style={{ width: '100%', padding: '7px', ...LABEL, fontSize: '9px', background: isCover(detail) ? C.accentBg : C.surface, color: isCover(detail) ? C.accent : C.text2, border: `1px solid ${isCover(detail) ? 'rgba(255,45,123,0.3)' : C.border}`, cursor: 'pointer' }}>
                        {isCover(detail) ? 'Current Cover' : 'Set as Cover'}
                      </button>
                      <button onClick={() => { setEditing(true); setEditName(detail.name); setEditRole(getRole(detail)); setEditFolder(getFolder(detail)); setEditDesc(detail.description || ''); }}
                        style={{ width: '100%', padding: '7px', ...LABEL, fontSize: '9px', background: C.surface, color: C.text2, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Edit Details</button>
                      <button onClick={() => setShowAssign(!showAssign)}
                        style={{ width: '100%', padding: '7px', ...LABEL, fontSize: '9px', background: showAssign ? C.tealBg : C.surface, color: showAssign ? C.teal : C.text2, border: `1px solid ${showAssign ? 'rgba(0,229,255,0.3)' : C.border}`, cursor: 'pointer' }}>Assign to Shot</button>
                      <button onClick={() => { if (confirm('Delete this image?')) deleteAsset(detail.id); }}
                        style={{ width: '100%', padding: '7px', ...LABEL, fontSize: '9px', background: C.dangerBg, color: C.danger, border: '1px solid rgba(255,38,74,0.2)', cursor: 'pointer' }}>Delete Image</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // VIEW: Folder gallery (default)
  // ══════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }} onDragEnter={onDrag}>
      {/* Toast */}
      {statusMsg && <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, padding: '10px 20px', background: C.successBg, border: `1px solid ${C.success}`, color: C.success, ...LABEL, fontSize: '11px' }}>{statusMsg}</div>}

      {/* Drag overlay */}
      {dragActive && (
        <div onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
          style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,229,255,0.08)', border: '2px dashed rgba(0,229,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: C.teal, ...LABEL, fontSize: '14px' }}>Drop files to upload</p>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>Library</h2>
          <p style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3, margin: '4px 0 0' }}>
            {folders.length} folder{folders.length !== 1 ? 's' : ''} / {assets.length} total image{assets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {assets.length > 0 && (
            <button onClick={deleteAll}
              style={{ padding: '6px 14px', ...LABEL, fontSize: '9px', background: C.dangerBg, color: C.danger, border: '1px solid rgba(255,38,74,0.2)', cursor: 'pointer' }}>
              Clear All
            </button>
          )}
          <button onClick={() => { setCreatingFolder(true); setShowUpload(false); }}
            style={{ padding: '6px 14px', ...LABEL, fontSize: '10px', background: C.surface, color: C.teal, border: `1px solid rgba(0,229,255,0.2)`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Folder
          </button>
          <button onClick={() => { setShowUpload(!showUpload); setCreatingFolder(false); }}
            style={{ padding: '6px 16px', ...LABEL, fontSize: '10px', background: showUpload ? C.accentBg : 'linear-gradient(135deg, #ff264a, #ff2d7b)', color: showUpload ? C.accent : '#fff', border: showUpload ? '1px solid rgba(255,45,123,0.3)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Upload
          </button>
        </div>
      </div>

      {/* New folder form */}
      {creatingFolder && (
        <div style={{ padding: '12px', background: C.tealBg, border: `1px solid rgba(0,229,255,0.15)`, marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name (e.g., Marcus, Product X)" autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && newFolderName.trim()) { setOpenFolder(newFolderName.trim()); setUploadFolder(newFolderName.trim()); setCreatingFolder(false); setShowUpload(true); } }}
            style={{ ...INPUT, flex: 1 }} />
          <button disabled={!newFolderName.trim()} onClick={() => { if (newFolderName.trim()) { setOpenFolder(newFolderName.trim()); setUploadFolder(newFolderName.trim()); setCreatingFolder(false); setShowUpload(true); } }}
            style={{ padding: '8px 20px', ...LABEL, fontSize: '10px', background: C.accentBg, color: C.accent, border: '1px solid rgba(255,45,123,0.3)', cursor: newFolderName.trim() ? 'pointer' : 'default', opacity: newFolderName.trim() ? 1 : 0.5 }}>Create</button>
          <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}
            style={{ padding: '8px 14px', ...LABEL, fontSize: '10px', background: 'transparent', color: C.text3, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* Upload panel (for uploading to a new or existing folder) */}
      {showUpload && !creatingFolder && (
        <div style={{ padding: '12px', background: C.tealBg, border: `1px solid rgba(0,229,255,0.15)`, marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ ...LABEL, fontSize: '8px', display: 'block', marginBottom: '3px' }}>Folder</span>
            <input value={uploadFolder} onChange={e => setUploadFolder(e.target.value)} placeholder="Folder name" list="upload-folder-list" style={{ ...INPUT, width: '180px', fontSize: '11px', padding: '6px 8px' }} />
            <datalist id="upload-folder-list">{folders.map(f => <option key={f.name} value={f.name} />)}</datalist>
          </div>
          <div>
            <span style={{ ...LABEL, fontSize: '8px', display: 'block', marginBottom: '3px' }}>Type</span>
            <select value={uploadType} onChange={e => setUploadType(e.target.value as AssetType)} style={{ ...INPUT, width: '120px', fontSize: '11px', padding: '6px 8px' }}>
              <option value="talent">Talent</option><option value="product">Product</option><option value="background">Background</option><option value="audio">Audio</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*" onChange={e => handleUpload(e.target.files)} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ padding: '6px 20px', ...LABEL, fontSize: '10px', background: uploading ? C.surface : 'rgba(0,229,255,0.12)', color: uploading ? C.text3 : C.teal, border: `1px solid ${uploading ? C.border : 'rgba(0,229,255,0.3)'}`, cursor: uploading ? 'wait' : 'pointer' }}>
              {uploading ? 'Uploading...' : 'Browse Files'}
            </button>
          </div>
        </div>
      )}

      {/* Search + type filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexShrink: 0, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search folders..." style={{ ...INPUT, paddingLeft: '32px', fontSize: '11px' }} />
        </div>
        {(['all', 'talent', 'product', 'background', 'audio'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            style={{ padding: '5px 10px', ...LABEL, fontSize: '9px', background: typeFilter === t ? C.accentBg : 'transparent', color: typeFilter === t ? C.accent : C.text3, border: typeFilter === t ? '1px solid rgba(255,45,123,0.2)' : '1px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {/* Folder card gallery */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filteredFolders.length === 0 && ungroupedAssets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1" strokeLinecap="round" style={{ margin: '0 auto 16px' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ color: C.text3, fontSize: '13px', fontFamily: 'Raleway, sans-serif', marginBottom: '8px' }}>
              {searchQuery ? 'No folders match your search.' : 'Your library is empty.'}
            </p>
            <p style={{ color: C.text3, fontSize: '11px', fontFamily: 'Raleway, sans-serif' }}>Create a folder and upload images to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {filteredFolders.map(folder => (
              <div key={folder.name}
                style={{ cursor: 'pointer', border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden', position: 'relative' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,45,123,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                {/* Rename + Delete buttons on folder card */}
                <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 3, display: 'flex', gap: '4px' }}>
                  <button onClick={e => { e.stopPropagation(); setRenamingFolder(folder.name); setRenameFolderValue(folder.name); }}
                    title="Rename folder"
                    style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', color: C.text3 }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.teal)} onMouseLeave={e => (e.currentTarget.style.color = C.text3)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteFolder(folder.name); }}
                    title="Delete folder"
                    style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', color: C.text3 }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.danger)} onMouseLeave={e => (e.currentTarget.style.color = C.text3)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                {/* Inline rename overlay */}
                {renamingFolder === folder.name && (
                  <div onClick={e => e.stopPropagation()}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4, padding: '10px', background: 'rgba(0,0,0,0.9)', borderTop: `1px solid ${C.teal}`, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input value={renameFolderValue} onChange={e => setRenameFolderValue(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.name, renameFolderValue); if (e.key === 'Escape') setRenamingFolder(null); }}
                      style={{ ...INPUT, flex: 1, fontSize: '12px', padding: '6px 8px' }} />
                    <button onClick={() => renameFolder(folder.name, renameFolderValue)}
                      style={{ padding: '6px 12px', ...LABEL, fontSize: '9px', background: C.accentBg, color: C.accent, border: '1px solid rgba(255,45,123,0.3)', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setRenamingFolder(null)}
                      style={{ padding: '6px 10px', ...LABEL, fontSize: '9px', background: 'transparent', color: C.text3, border: `1px solid ${C.border}`, cursor: 'pointer' }}>X</button>
                  </div>
                )}

                <div onClick={() => { if (renamingFolder !== folder.name) { setOpenFolder(folder.name); setUploadFolder(folder.name); setUploadType(folder.type); } }}
                  style={{ width: '100%' }}>
                  {/* Cover image */}
                  <div style={{ width: '100%', aspectRatio: '4/3', background: '#080808', overflow: 'hidden' }}>
                    {folder.coverUrl ? (
                      <img src={folder.coverUrl} alt={folder.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1" strokeLinecap="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Folder info */}
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontSize: '14px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#fff', margin: 0 }}>{folder.name}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
                        {folder.count} image{folder.count !== 1 ? 's' : ''}
                      </span>
                      <span style={{ padding: '1px 6px', ...LABEL, fontSize: '8px', background: C.accentBg, color: C.accent }}>{folder.type}</span>
                      {folder.role && <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.accent }}>{folder.role}</span>}
                      {folder.linkedShotCount > 0 && <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.success }}>{folder.linkedShotCount} shot{folder.linkedShotCount > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Ungrouped images as individual cards at the end */}
            {ungroupedAssets.length > 0 && (typeFilter === 'all' || ungroupedAssets.some(a => a.asset_type === typeFilter)) && (
              <div
                onClick={() => setOpenFolder('__ungrouped__')}
                style={{ cursor: 'pointer', border: `1px dashed ${C.border}`, background: C.surface, overflow: 'hidden' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                <div style={{ width: '100%', aspectRatio: '4/3', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ padding: '12px' }}>
                  <p style={{ fontSize: '14px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: C.text3, margin: 0, fontStyle: 'italic' }}>Ungrouped</p>
                  <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>{ungroupedAssets.length} image{ungroupedAssets.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
