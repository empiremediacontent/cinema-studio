'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Asset, AssetType } from '@/lib/types/database';

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
  success: 'rgba(45,200,120,0.8)',
  successBg: 'rgba(45,200,120,0.08)',
};

const ASSET_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  talent: { label: 'Talent', icon: 'user', color: '#ff2d7b' },
  product: { label: 'Product', icon: 'box', color: '#ff264a' },
  background: { label: 'Background', icon: 'image', color: '#ff2d7b' },
  audio: { label: 'Audio', icon: 'music', color: '#f0a030' },
  lut: { label: 'LUT', icon: 'palette', color: '#ff264a' },
  other: { label: 'Other', icon: 'folder', color: '#8888a0' },
};

const ASSET_TYPES: AssetType[] = ['talent', 'product', 'background', 'audio', 'lut', 'other'];

interface AssetFolder {
  id: string;
  name: string;
  cover_url: string | null;
  asset_ids: string[];
}

// Module-level cache so folders survive loadAssets() rebuilds.
// Key = projectId, value = map of folderId -> folder definition.
const folderRegistry = new Map<string, Map<string, { id: string; name: string; cover_url: string | null }>>();

function AssetIcon({ type, size = 24 }: { type: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    box: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    image: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    music: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    palette: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <circle cx="6.5" cy="12" r="2.5" />
        <circle cx="17.5" cy="12" r="2.5" />
        <circle cx="12" cy="18.5" r="2.5" />
      </svg>
    ),
    folder: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  };
  return icons[type] || icons.folder;
}

export default function AssetLibrary({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [shots, setShots] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [showShotAssign, setShowShotAssign] = useState(false);
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Edit classification state
  const [editingClassification, setEditingClassification] = useState<string | null>(null);

  // Folder state - stored in localStorage per project
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Status messages
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
    loadShots();
  }, [projectId]);

  async function loadAssets() {
    setLoading(true);
    const { data } = await supabase
      .from('assets')
      .select('*')
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .order('created_at', { ascending: false });

    const assetList = (data as Asset[]) || [];
    setAssets(assetList);

    // Extract folders from asset metadata, then merge with the registry
    // so that empty folders (no assets currently inside) are not lost.
    const folderMap = new Map<string, AssetFolder>();

    // 1. Seed from the persistent registry first (preserves empty folders)
    const registry = folderRegistry.get(projectId);
    if (registry) {
      for (const [fid, def] of registry) {
        folderMap.set(fid, { id: def.id, name: def.name, cover_url: def.cover_url, asset_ids: [] });
      }
    }

    // 2. Layer on asset-level metadata (adds asset_ids, updates covers)
    for (const a of assetList) {
      const meta = a.metadata as Record<string, unknown>;
      const folderId = meta?.folder_id as string | undefined;
      const folderName = meta?.folder_name as string | undefined;
      const folderCover = meta?.folder_cover as string | undefined;
      if (folderId && folderName) {
        if (!folderMap.has(folderId)) {
          folderMap.set(folderId, { id: folderId, name: folderName, cover_url: folderCover || null, asset_ids: [] });
        }
        folderMap.get(folderId)!.asset_ids.push(a.id);
        if (folderCover) folderMap.get(folderId)!.cover_url = folderCover;
      }
    }

    // 3. Sync registry with the merged result
    const updatedRegistry = new Map<string, { id: string; name: string; cover_url: string | null }>();
    for (const [fid, folder] of folderMap) {
      updatedRegistry.set(fid, { id: folder.id, name: folder.name, cover_url: folder.cover_url });
    }
    folderRegistry.set(projectId, updatedRegistry);

    setFolders(Array.from(folderMap.values()));
    setLoading(false);
  }

  async function loadShots() {
    const { data } = await supabase
      .from('shots')
      .select('id, title, sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    setShots((data || []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      name: (s.title as string) || `Shot ${(s.sort_order as number) + 1}`,
    })));
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string)?.trim();
    const assetType = formData.get('asset_type') as string;
    const description = (formData.get('description') as string)?.trim() || null;
    const file = formData.get('file') as File | null;

    if (!name || !file) {
      setUploading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const filePath = `${user.id}/${projectId}/assets/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-media')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('generated-media')
        .getPublicUrl(filePath);

      const metadata: Record<string, unknown> = {};
      // If we're inside a folder, add it to that folder
      if (activeFolder) {
        const folder = folders.find(f => f.id === activeFolder);
        if (folder) {
          metadata.folder_id = folder.id;
          metadata.folder_name = folder.name;
          if (folder.cover_url) metadata.folder_cover = folder.cover_url;
        }
      }

      const { error: dbError } = await supabase.from('assets').insert({
        user_id: user.id,
        project_id: projectId,
        asset_type: assetType,
        name,
        description,
        thumbnail_url: publicUrlData.publicUrl,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        metadata,
      });

      if (!dbError) {
        await loadAssets();
        setShowUpload(false);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }

    setUploading(false);
  }

  async function handleDelete(assetId: string) {
    if (!confirm('Delete this asset?')) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const asset = assets.find(a => a.id === assetId);
    if (asset?.file_path) {
      await supabase.storage
        .from('generated-media')
        .remove([asset.file_path]);
    }

    await supabase.from('assets').delete().eq('id', assetId).eq('user_id', user.id);
    setAssets(prev => prev.filter(a => a.id !== assetId));
  }

  async function updateAssetClassification(assetId: string, newType: AssetType) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('assets')
      .update({ asset_type: newType })
      .eq('id', assetId)
      .eq('user_id', user.id);

    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, asset_type: newType } : a));
    setEditingClassification(null);
    showStatus(`Reclassified as ${newType}`);
  }

  async function assignToShots(assetId: string, shotIds: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const linkedShots = asset.linked_shots ? [...asset.linked_shots] : [];
    for (const sid of shotIds) {
      if (!linkedShots.includes(sid)) linkedShots.push(sid);
    }

    await supabase
      .from('assets')
      .update({ linked_shots: linkedShots })
      .eq('id', assetId)
      .eq('user_id', user.id);

    setShowShotAssign(false);
    setSelectedShotIds([]);
    await loadAssets();
  }

  async function setAsFolderCover(assetId: string) {
    if (!activeFolder) return;
    const asset = assets.find(a => a.id === assetId);
    if (!asset?.thumbnail_url) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update all assets in this folder to have the new cover
    const folderAssets = assets.filter(a => {
      const meta = a.metadata as Record<string, unknown>;
      return meta?.folder_id === activeFolder;
    });

    for (const a of folderAssets) {
      const meta = { ...(a.metadata as Record<string, unknown>), folder_cover: asset.thumbnail_url };
      await supabase.from('assets').update({ metadata: meta }).eq('id', a.id).eq('user_id', user.id);
    }

    setFolders(prev => prev.map(f => f.id === activeFolder ? { ...f, cover_url: asset.thumbnail_url } : f));
    // Sync registry
    const reg = folderRegistry.get(projectId);
    if (reg && reg.has(activeFolder)) {
      reg.get(activeFolder)!.cover_url = asset.thumbnail_url || null;
    }
    showStatus('Set as folder cover');
  }

  async function setAsProjectCover(assetId: string) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset?.thumbnail_url) return;

    const res = await fetch('/api/update-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, field: 'thumbnail_url', value: asset.thumbnail_url }),
    });

    if (res.ok) {
      showStatus('Set as project cover');
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;

    const folderId = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newFolder: AssetFolder = { id: folderId, name: newFolderName.trim(), cover_url: null, asset_ids: [] };

    // Persist to module-level registry so it survives loadAssets() rebuilds
    if (!folderRegistry.has(projectId)) {
      folderRegistry.set(projectId, new Map());
    }
    folderRegistry.get(projectId)!.set(folderId, { id: folderId, name: newFolder.name, cover_url: null });

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowCreateFolder(false);
    showStatus(`Created folder "${newFolder.name}"`);
  }

  async function deleteFolder(folderId: string) {
    if (!confirm('Delete this folder? Assets inside will be unlinked but not deleted.')) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Remove folder metadata from assets
    const folderAssets = assets.filter(a => {
      const meta = a.metadata as Record<string, unknown>;
      return meta?.folder_id === folderId;
    });

    for (const a of folderAssets) {
      const meta = { ...(a.metadata as Record<string, unknown>) };
      delete meta.folder_id;
      delete meta.folder_name;
      delete meta.folder_cover;
      await supabase.from('assets').update({ metadata: meta }).eq('id', a.id).eq('user_id', user.id);
    }

    // Remove from module-level registry
    const reg = folderRegistry.get(projectId);
    if (reg) reg.delete(folderId);

    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (activeFolder === folderId) setActiveFolder(null);
    await loadAssets();
  }

  async function addAssetToFolder(assetId: string, folderId: string) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const meta = {
      ...(asset.metadata as Record<string, unknown>),
      folder_id: folder.id,
      folder_name: folder.name,
      ...(folder.cover_url ? { folder_cover: folder.cover_url } : {}),
    };

    await supabase.from('assets').update({ metadata: meta }).eq('id', assetId).eq('user_id', user.id);
    await loadAssets();
    showStatus(`Added to "${folder.name}"`);
  }

  function showStatus(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2000);
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  // Filter assets by type and folder
  const filteredAssets = assets.filter(a => {
    if (filter !== 'all' && a.asset_type !== filter) return false;
    if (activeFolder) {
      const meta = a.metadata as Record<string, unknown>;
      return meta?.folder_id === activeFolder;
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.text3 }}>
          <svg style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '13px' }}>Loading assets...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Status message */}
      {statusMsg && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 100,
          padding: '10px 20px', background: C.successBg, border: `1px solid ${C.success}`,
          color: C.success, fontSize: '12px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
          letterSpacing: '0.05em',
        }}>
          {statusMsg}
        </div>
      )}

      {/* Header: filters + add */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'auto' }}>
          {['all', ...Object.keys(ASSET_TYPE_LABELS)].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif',
                background: filter === type ? C.accentBg : 'transparent',
                color: filter === type ? C.accent : C.text2,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {type === 'all' ? 'All' : ASSET_TYPE_LABELS[type]?.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setShowCreateFolder(true)}
            style={{
              height: '32px', padding: '0 14px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif',
              background: C.surface, border: `1px solid ${C.border}`, color: C.text2,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            Folder
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            style={{
              height: '32px', padding: '0 16px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif',
              background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            Add Asset
          </button>
        </div>
      </div>

      {/* Create folder inline */}
      {showCreateFolder && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowCreateFolder(false); }}
            style={{
              flex: 1, height: '36px', padding: '0 12px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
              background: C.surface, border: `1px solid ${C.border}`, color: '#fff', outline: 'none',
            }}
          />
          <button onClick={createFolder} style={{
            height: '36px', padding: '0 16px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', border: 'none', color: '#fff', cursor: 'pointer',
          }}>
            Create
          </button>
          <button onClick={() => setShowCreateFolder(false)} style={{
            height: '36px', padding: '0 12px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            textTransform: 'uppercase', background: C.surface, border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      )}

      {/* Folders row */}
      {folders.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text3 }}>
              Folders
            </span>
            {activeFolder && (
              <button
                onClick={() => setActiveFolder(null)}
                style={{
                  padding: '2px 8px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: C.accentBg, border: 'none', color: C.accent, cursor: 'pointer',
                }}
              >
                Show All
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {folders.map(folder => {
              const isActive = activeFolder === folder.id;
              const assetCount = assets.filter(a => {
                const meta = a.metadata as Record<string, unknown>;
                return meta?.folder_id === folder.id;
              }).length;
              return (
                <div
                  key={folder.id}
                  onClick={() => setActiveFolder(isActive ? null : folder.id)}
                  style={{
                    minWidth: '120px', maxWidth: '160px', padding: '8px',
                    background: isActive ? C.accentBg : C.card,
                    border: isActive ? '1px solid rgba(255,45,123,0.4)' : `1px solid ${C.border}`,
                    cursor: 'pointer', transition: 'all 0.2s', position: 'relative', flexShrink: 0,
                  }}
                >
                  {/* Folder cover */}
                  <div style={{
                    width: '100%', aspectRatio: '16/9', marginBottom: '6px', overflow: 'hidden',
                    background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {folder.cover_url ? (
                      <img src={folder.cover_url} alt={folder.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1.5" strokeLinecap="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {folder.name}
                    </span>
                    <span style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: C.text3 }}>
                      {assetCount}
                    </span>
                  </div>
                  {/* Delete folder button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: C.text3,
                      opacity: 0.6, transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ff264a'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = C.text3; }}
                    title="Delete folder"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} style={{ marginBottom: '16px', padding: '16px', background: C.card, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: dragActive ? '2px dashed #ff2d7b' : '2px dashed rgba(255,255,255,0.2)',
              padding: '24px', textAlign: 'center', cursor: 'pointer',
              background: dragActive ? 'rgba(255,45,123,0.06)' : C.surface,
              transition: 'all 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4"
              style={{ display: 'none' }}
            />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', marginRight: 'auto', marginBottom: '12px', color: C.accent }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', fontFamily: 'Raleway, sans-serif', marginBottom: '4px' }}>
              Drop file here or click to browse
            </p>
            <p style={{ fontSize: '12px', color: C.text2, fontFamily: 'Raleway, sans-serif' }}>
              Images (JPG, PNG, WebP), Audio (MP3, WAV), Video (MP4)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: C.text2, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Name</label>
              <input name="name" required style={{ width: '100%', height: '36px', padding: '0 12px', fontSize: '13px', outline: 'none', background: C.surface, border: `1px solid ${C.border}`, color: '#fff', fontFamily: 'Raleway, sans-serif' }} placeholder="Asset name" />
            </div>
            <div style={{ width: '144px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: C.text2, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Type</label>
              <select name="asset_type" style={{ width: '100%', height: '36px', padding: '0 12px', fontSize: '13px', outline: 'none', background: '#1a1a1a', border: `1px solid ${C.border}`, color: '#fff', fontFamily: 'Raleway, sans-serif', cursor: 'pointer' }}>
                {Object.entries(ASSET_TYPE_LABELS).map(([key, val]) => (
                  <option key={key} value={key} style={{ background: '#1a1a1a', color: '#fff' }}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: C.text2, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Description (optional)</label>
            <input name="description" style={{ width: '100%', height: '36px', padding: '0 12px', fontSize: '13px', outline: 'none', background: C.surface, border: `1px solid ${C.border}`, color: '#fff', fontFamily: 'Raleway, sans-serif' }} placeholder="e.g. Professional woman, 30s, black blazer" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={() => setShowUpload(false)} style={{ height: '32px', padding: '0 16px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', background: C.surface, border: `1px solid ${C.border}`, color: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={uploading} style={{ height: '32px', padding: '0 16px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', color: '#fff', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      {/* Asset grid */}
      {filteredAssets.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', paddingTop: '64px', paddingBottom: '64px' }}>
          <div style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: C.surface }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#505068" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p style={{ fontSize: '14px', color: C.text3, fontFamily: 'Raleway, sans-serif' }}>
            {activeFolder ? 'No assets in this folder' : 'No assets yet'}
          </p>
          <p style={{ fontSize: '12px', marginTop: '4px', color: C.text3, fontFamily: 'Raleway, sans-serif', opacity: 0.7 }}>
            Add talent, backgrounds, audio, and more
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {filteredAssets.map((asset) => {
            const typeInfo = ASSET_TYPE_LABELS[asset.asset_type] || ASSET_TYPE_LABELS.other;
            const isSelected = selectedAsset === asset.id;
            const isEditingType = editingClassification === asset.id;
            return (
              <div
                key={asset.id}
                style={{
                  padding: '12px',
                  border: isSelected ? '1px solid #ff2d7b' : `1px solid ${C.border}`,
                  background: isSelected ? 'rgba(255,45,123,0.1)' : C.card,
                  cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = '#1a1a1a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = isSelected ? '#ff2d7b' : C.border; e.currentTarget.style.background = isSelected ? 'rgba(255,45,123,0.1)' : C.card; }}
              >
                {/* Thumbnail */}
                <div
                  style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', overflow: 'hidden', background: C.surface }}
                  onClick={() => { setSelectedAsset(asset.id); setShowShotAssign(true); }}
                >
                  {asset.thumbnail_url ? (
                    <img src={asset.thumbnail_url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: typeInfo.color, opacity: 0.6 }}>
                      <AssetIcon type={typeInfo.icon} size={28} />
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff', fontFamily: 'Raleway, sans-serif' }}>{asset.name}</h4>

                    {/* Classification badge - clickable to edit */}
                    {isEditingType ? (
                      <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {ASSET_TYPES.map((t) => (
                          <button
                            key={t}
                            onClick={(e) => { e.stopPropagation(); updateAssetClassification(asset.id, t); }}
                            style={{
                              padding: '2px 6px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                              letterSpacing: '0.04em', textTransform: 'uppercase',
                              background: asset.asset_type === t ? C.accentBg : C.surface,
                              border: asset.asset_type === t ? '1px solid rgba(255,45,123,0.3)' : `1px solid ${C.border}`,
                              color: asset.asset_type === t ? C.accent : C.text2,
                              cursor: 'pointer',
                            }}
                          >
                            {ASSET_TYPE_LABELS[t]?.label || t}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span
                        onClick={(e) => { e.stopPropagation(); setEditingClassification(asset.id); }}
                        title="Click to change classification"
                        style={{
                          display: 'inline-block', fontSize: '10px', fontWeight: 600,
                          padding: '2px 6px', marginTop: '4px',
                          color: typeInfo.color, backgroundColor: `${typeInfo.color}15`,
                          fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        {typeInfo.label}
                      </span>
                    )}

                    {asset.linked_shots && asset.linked_shots.length > 0 && (
                      <p style={{ fontSize: '10px', marginTop: '4px', color: C.accent, fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                        Linked: {asset.linked_shots.length}
                      </p>
                    )}
                  </div>

                  {/* Action buttons column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                    {/* Assign to shots */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset.id); setShowShotAssign(true); }}
                      style={{ padding: '3px', color: C.text3, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = C.accent; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = C.text3; }}
                      title="Assign to shots"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </button>
                    {/* Add to folder */}
                    {folders.length > 0 && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Quick add to first folder or show picker
                            if (folders.length === 1) {
                              addAssetToFolder(asset.id, folders[0].id);
                            } else {
                              // Toggle a simple folder picker
                              const menu = e.currentTarget.nextElementSibling as HTMLElement;
                              if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                            }
                          }}
                          style={{ padding: '3px', color: C.text3, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#f0a030'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = C.text3; }}
                          title="Add to folder"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        {folders.length > 1 && (
                          <div style={{ display: 'none', position: 'absolute', right: 0, top: '20px', zIndex: 10, background: '#1a1a1a', border: `1px solid ${C.border}`, minWidth: '120px' }}>
                            {folders.map(f => (
                              <button
                                key={f.id}
                                onClick={(e) => { e.stopPropagation(); addAssetToFolder(asset.id, f.id); (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                                style={{ display: 'block', width: '100%', padding: '8px 12px', fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: '#fff', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = C.surface)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                {f.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Set as folder cover */}
                    {activeFolder && asset.thumbnail_url && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAsFolderCover(asset.id); }}
                        style={{ padding: '3px', color: C.text3, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#2dc878'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = C.text3; }}
                        title="Set as folder cover"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </button>
                    )}
                    {/* Set as project cover */}
                    {asset.thumbnail_url && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAsProjectCover(asset.id); }}
                        style={{ padding: '3px', color: C.text3, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#6c63ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = C.text3; }}
                        title="Set as project cover"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    )}
                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                      style={{ padding: '3px', color: C.text3, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ff264a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = C.text3; }}
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shot Assignment Modal */}
      {showShotAssign && selectedAsset && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => { setShowShotAssign(false); setSelectedShotIds([]); }}
        >
          <div
            style={{ background: C.card, border: `1px solid ${C.border}`, padding: '24px', maxWidth: '440px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: '#fff', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Assign to Shots
            </h3>
            <p style={{ fontSize: '11px', color: C.text3, fontFamily: 'Raleway, sans-serif', marginBottom: '16px' }}>
              Select one or more shots, then click Assign. Already-linked shots are marked.
            </p>

            {shots.length === 0 ? (
              <p style={{ fontSize: '13px', color: C.text2, fontFamily: 'Raleway, sans-serif' }}>No shots available in this project</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    onClick={() => setSelectedShotIds(shots.map(s => s.id))}
                    style={{ padding: '6px 12px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: C.accentBg, border: 'none', color: C.accent, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedShotIds([])}
                    style={{ padding: '6px 12px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: C.surface, border: `1px solid ${C.border}`, color: C.text3, cursor: 'pointer' }}
                  >
                    Deselect All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
                  {shots.map((shot) => {
                    const asset = assets.find(a => a.id === selectedAsset);
                    const alreadyLinked = asset?.linked_shots?.includes(shot.id) || false;
                    const isChecked = selectedShotIds.includes(shot.id);
                    return (
                      <label
                        key={shot.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 12px',
                          background: isChecked ? 'rgba(255,45,123,0.08)' : '#1a1a1a',
                          border: isChecked ? '1px solid rgba(255,45,123,0.3)' : `1px solid rgba(255,255,255,0.06)`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedShotIds(prev => prev.includes(shot.id) ? prev.filter(id => id !== shot.id) : [...prev, shot.id])}
                          style={{ accentColor: C.accent, width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontFamily: 'Raleway, sans-serif', color: '#fff', flex: 1 }}>
                          {shot.name}
                        </span>
                        {alreadyLinked && (
                          <span style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px', background: C.successBg, color: C.success }}>
                            Linked
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <button
                  onClick={() => { if (selectedAsset && selectedShotIds.length > 0) assignToShots(selectedAsset, selectedShotIds); }}
                  disabled={selectedShotIds.length === 0}
                  style={{
                    width: '100%', height: '36px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: selectedShotIds.length > 0 ? 'linear-gradient(135deg, #ff264a, #ff2d7b)' : C.surface,
                    color: selectedShotIds.length > 0 ? '#fff' : C.text3,
                    border: 'none', cursor: selectedShotIds.length > 0 ? 'pointer' : 'not-allowed', marginBottom: '8px',
                  }}
                >
                  {selectedShotIds.length > 0 ? `Assign to ${selectedShotIds.length} Shot${selectedShotIds.length > 1 ? 's' : ''}` : 'Select Shots to Assign'}
                </button>
              </>
            )}

            <button
              onClick={() => { setShowShotAssign(false); setSelectedShotIds([]); }}
              style={{ width: '100%', height: '32px', background: C.surface, border: `1px solid ${C.border}`, color: '#fff', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
