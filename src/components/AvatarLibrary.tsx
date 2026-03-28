'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Avatar, ProjectCharacter } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/client';

// ============================================================
// Avatar Library: Video Game Style Character Select
// "Choose your party" before entering the production pipeline.
// Characters display as selectable cards with preview images,
// click to view details and add to project roster.
// ============================================================

interface AvatarLibraryProps {
  projectId: string;
  onCharactersChanged?: (characters: ProjectCharacter[]) => void;
}

type ViewMode = 'library' | 'project_roster';

const AGE_LABELS: Record<string, string> = {
  child: 'Child', teen: 'Teen', young_adult: 'Young Adult',
  adult: 'Adult', senior: 'Senior',
};

const GENDER_LABELS: Record<string, string> = {
  masculine: 'Masculine', feminine: 'Feminine',
  androgynous: 'Androgynous', other: 'Other',
};

// Placeholder silhouette SVG for avatars without thumbnails
function AvatarPlaceholder() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)',
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#505068" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

interface CreateCharacterFormProps {
  onSubmit: (data: {
    name: string;
    description: string;
    gender_presentation: string;
    age_appearance: string;
    ethnicity_appearance: string;
    mood_expression: string;
    imageFile?: File;
  }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function CreateCharacterModal({ onSubmit, onClose, isLoading }: CreateCharacterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gender_presentation: 'other',
    age_appearance: 'adult',
    ethnicity_appearance: '',
    mood_expression: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ ...formData, imageFile: imageFile || undefined });
  };

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '8px',
    fontFamily: 'Montserrat',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    outline: 'none' as const,
    fontFamily: 'Raleway',
  };

  const selectStyle = {
    ...inputStyle,
    background: '#1a1a1a',
    cursor: 'pointer' as const,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.08)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '20px',
          fontFamily: 'Montserrat',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>Create Character</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Character Image Upload */}
          <div>
            <label style={labelStyle}>Character Image</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '80px', height: '80px', flexShrink: 0, overflow: 'hidden',
                border: '2px dashed rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                position: 'relative',
              }}
                onClick={() => (document.getElementById('char-image-upload') as HTMLInputElement)?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
                <input
                  id="char-image-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway', margin: 0, lineHeight: '1.5' }}>
                  Upload a headshot or reference image for this character. This will be used as their thumbnail and can be used as a reference for image generation.
                </p>
                {imageFile && (
                  <p style={{ fontSize: '10px', color: '#ff2d7b', fontFamily: 'Montserrat', fontWeight: 600, marginTop: '6px' }}>
                    {imageFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Sarah Chen"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Physical traits, wardrobe, personality notes..."
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical' as const,
              }}
            />
          </div>

          {/* Gender + Age on same row */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Gender Presentation</label>
              <select
                value={formData.gender_presentation}
                onChange={e => setFormData({...formData, gender_presentation: e.target.value})}
                style={selectStyle}
              >
                <option value="masculine" style={{ background: '#1a1a1a', color: '#fff' }}>Masculine</option>
                <option value="feminine" style={{ background: '#1a1a1a', color: '#fff' }}>Feminine</option>
                <option value="androgynous" style={{ background: '#1a1a1a', color: '#fff' }}>Androgynous</option>
                <option value="other" style={{ background: '#1a1a1a', color: '#fff' }}>Other</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Age Appearance</label>
              <select
                value={formData.age_appearance}
                onChange={e => setFormData({...formData, age_appearance: e.target.value})}
                style={selectStyle}
              >
                <option value="child" style={{ background: '#1a1a1a', color: '#fff' }}>Child</option>
                <option value="teen" style={{ background: '#1a1a1a', color: '#fff' }}>Teen</option>
                <option value="young_adult" style={{ background: '#1a1a1a', color: '#fff' }}>Young Adult</option>
                <option value="adult" style={{ background: '#1a1a1a', color: '#fff' }}>Adult</option>
                <option value="senior" style={{ background: '#1a1a1a', color: '#fff' }}>Senior</option>
              </select>
            </div>
          </div>

          {/* Ethnicity + Mood on same row */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Ethnicity Appearance</label>
              <input
                type="text"
                value={formData.ethnicity_appearance}
                onChange={e => setFormData({...formData, ethnicity_appearance: e.target.value})}
                placeholder="e.g. East Asian"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Mood/Expression</label>
              <input
                type="text"
                value={formData.mood_expression}
                onChange={e => setFormData({...formData, mood_expression: e.target.value})}
                placeholder="e.g. Confident"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ff264a, #ff2d7b)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AvatarLibrary({ projectId, onCharactersChanged }: AvatarLibraryProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [projectCharacters, setProjectCharacters] = useState<ProjectCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterAge, setFilterAge] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingCharacter, setCreatingCharacter] = useState(false);

  const supabase = createClient();

  // Load avatars and project characters
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [avatarRes, charRes] = await Promise.all([
        supabase.from('avatars').select('*').order('created_at', { ascending: false }),
        supabase.from('project_characters').select('*, avatar:avatars(*)').eq('project_id', projectId),
      ]);

      if (avatarRes.data) setAvatars(avatarRes.data as Avatar[]);
      if (charRes.data) {
        const chars = charRes.data as ProjectCharacter[];
        setProjectCharacters(chars);
        onCharactersChanged?.(chars);
      }
    } catch {
      setError('Failed to load avatars');
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, onCharactersChanged]);

  useEffect(() => { loadData(); }, [loadData]);

  // Create new avatar
  async function createCharacter(data: {
    name: string;
    description: string;
    gender_presentation: string;
    age_appearance: string;
    ethnicity_appearance: string;
    mood_expression: string;
    imageFile?: File;
  }) {
    setCreatingCharacter(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); setCreatingCharacter(false); return; }

      let thumbnailUrl: string | null = null;
      const referenceImages: { url: string; angle: string; description: string }[] = [];

      // Upload image if provided
      if (data.imageFile) {
        const ext = data.imageFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${user.id}/avatars/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('generated-media')
          .upload(path, data.imageFile, { contentType: data.imageFile.type, upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('generated-media')
            .getPublicUrl(path);
          thumbnailUrl = urlData.publicUrl;
          referenceImages.push({ url: urlData.publicUrl, angle: 'front', description: data.name });
        }
      }

      const { data: newAvatar, error: insertError } = await supabase
        .from('avatars')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description,
          gender_presentation: data.gender_presentation,
          age_appearance: data.age_appearance,
          ethnicity_appearance: data.ethnicity_appearance,
          mood_expression: data.mood_expression,
          thumbnail_url: thumbnailUrl,
          style_tags: [],
          reference_images: referenceImages,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (newAvatar) {
        setAvatars([newAvatar as Avatar, ...avatars]);
        setShowCreateModal(false);
        setError(null);
      }
    } catch (err) {
      setError('Failed to create character');
      console.error(err);
    } finally {
      setCreatingCharacter(false);
    }
  }

  // Add avatar to project roster
  async function addToProject(avatar: Avatar) {
    if (projectCharacters.some(pc => pc.avatar_id === avatar.id)) return;
    if (projectCharacters.length >= 5) {
      setError('Maximum 5 characters per project in v1');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('project_characters')
        .insert({ project_id: projectId, avatar_id: avatar.id, role_name: avatar.name })
        .select('*, avatar:avatars(*)')
        .single();

      if (insertError) throw insertError;
      if (data) {
        const updated = [...projectCharacters, data as ProjectCharacter];
        setProjectCharacters(updated);
        onCharactersChanged?.(updated);
      }
    } catch {
      setError('Failed to add character');
    }
  }

  // Remove avatar from project roster
  async function removeFromProject(characterId: string) {
    try {
      await supabase.from('project_characters').delete().eq('id', characterId);
      const updated = projectCharacters.filter(pc => pc.id !== characterId);
      setProjectCharacters(updated);
      onCharactersChanged?.(updated);
    } catch {
      setError('Failed to remove character');
    }
  }

  // Filter logic
  const filteredAvatars = avatars.filter(a => {
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterGender !== 'all' && a.gender_presentation !== filterGender) return false;
    if (filterAge !== 'all' && a.age_appearance !== filterAge) return false;
    return true;
  });

  const isInProject = (avatarId: string) => projectCharacters.some(pc => pc.avatar_id === avatarId);

  // Character Detail Panel
  function CharacterSheet({ avatar }: { avatar: Avatar }) {
    const inProject = isInProject(avatar.id);

    return (
      <div style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header image */}
        <div style={{
          position: 'relative',
          height: '192px',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {avatar.thumbnail_url ? (
            <img src={avatar.thumbnail_url} alt={avatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <AvatarPlaceholder />
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #111, transparent 60%)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            right: '16px',
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'Montserrat',
            }}>{avatar.name}</h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginTop: '8px',
            }}>
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                fontWeight: 700,
                background: 'rgba(255,45,123,0.12)',
                color: '#ff2d7b',
                fontFamily: 'Raleway',
              }}>
                {AGE_LABELS[avatar.age_appearance] || avatar.age_appearance}
              </span>
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                fontWeight: 700,
                background: 'rgba(255,45,123,0.12)',
                color: '#ff2d7b',
                fontFamily: 'Raleway',
              }}>
                {GENDER_LABELS[avatar.gender_presentation] || avatar.gender_presentation}
              </span>
              {avatar.ethnicity_appearance && (
                <span style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  fontWeight: 700,
                  background: 'rgba(255,45,123,0.12)',
                  color: '#ff2d7b',
                  fontFamily: 'Raleway',
                }}>
                  {avatar.ethnicity_appearance}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {avatar.description && (
            <div>
              <p style={{
                fontSize: '12px',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'Raleway',
                margin: 0,
              }}>{avatar.description}</p>
            </div>
          )}

          {avatar.mood_expression && (
            <div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'Montserrat',
                display: 'block',
                marginBottom: '6px',
              }}>Default Expression</span>
              <p style={{
                fontSize: '13px',
                color: '#fff',
                fontFamily: 'Raleway',
                margin: 0,
              }}>{avatar.mood_expression}</p>
            </div>
          )}

          {/* Style tags */}
          {avatar.style_tags && avatar.style_tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {avatar.style_tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '10px',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'Raleway',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Reference images grid */}
          {avatar.reference_images && avatar.reference_images.length > 0 && (
            <div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'Montserrat',
                display: 'block',
                marginBottom: '8px',
              }}>
                Reference Angles ({avatar.reference_images.length})
              </span>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
              }}>
                {avatar.reference_images.map((ref, i) => (
                  <div key={i} style={{
                    aspectRatio: '1',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <img src={ref.url} alt={ref.angle || `Ref ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={() => inProject ? undefined : addToProject(avatar)}
            disabled={inProject}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              background: inProject ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #ff264a, #ff2d7b)',
              color: inProject ? 'rgba(255,255,255,0.3)' : '#fff',
              border: inProject ? '1px solid rgba(255,255,255,0.08)' : 'none',
              cursor: inProject ? 'default' : 'pointer',
              fontFamily: 'Raleway',
              marginTop: 'auto',
            }}
          >
            {inProject ? 'Already Cast' : 'Cast in Project'}
          </button>
        </div>
      </div>
    );
  }

  // Main Render
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '256px',
      }}>
        <div style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'Raleway',
        }}>Loading character roster...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      {/* Left side: Avatar grid */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Mode toggle + search + filters + create button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}>
          {/* View mode tabs */}
          <div style={{ display: 'flex', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewMode('library')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                background: viewMode === 'library' ? 'rgba(255,45,123,0.12)' : 'transparent',
                color: viewMode === 'library' ? '#ff2d7b' : 'rgba(255,255,255,0.3)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Raleway',
                transition: 'all 0.2s',
              }}
            >
              All Characters
            </button>
            <button
              onClick={() => setViewMode('project_roster')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                background: viewMode === 'project_roster' ? 'rgba(255,45,123,0.12)' : 'transparent',
                color: viewMode === 'project_roster' ? '#ff2d7b' : 'rgba(255,255,255,0.3)',
                border: 'none',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                fontFamily: 'Raleway',
                transition: 'all 0.2s',
              }}
            >
              Party ({projectCharacters.length}/5)
            </button>
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <svg style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
            }} width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="#505068" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                fontFamily: 'Raleway',
              }}
            />
          </div>

          {/* Filters */}
          <select
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '11px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'Raleway',
            }}
          >
            <option value="all" style={{ background: '#1a1a1a', color: '#fff' }}>All Genders</option>
            <option value="masculine" style={{ background: '#1a1a1a', color: '#fff' }}>Masculine</option>
            <option value="feminine" style={{ background: '#1a1a1a', color: '#fff' }}>Feminine</option>
            <option value="androgynous" style={{ background: '#1a1a1a', color: '#fff' }}>Androgynous</option>
          </select>

          <select
            value={filterAge}
            onChange={e => setFilterAge(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '11px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'Raleway',
            }}
          >
            <option value="all" style={{ background: '#1a1a1a', color: '#fff' }}>All Ages</option>
            <option value="child" style={{ background: '#1a1a1a', color: '#fff' }}>Child</option>
            <option value="teen" style={{ background: '#1a1a1a', color: '#fff' }}>Teen</option>
            <option value="young_adult" style={{ background: '#1a1a1a', color: '#fff' }}>Young Adult</option>
            <option value="adult" style={{ background: '#1a1a1a', color: '#fff' }}>Adult</option>
            <option value="senior" style={{ background: '#1a1a1a', color: '#fff' }}>Senior</option>
          </select>

          {/* Create Character button */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ff264a, #ff2d7b)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Raleway',
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            + Create Character
          </button>
        </div>

        {/* Character Grid */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {viewMode === 'library' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
            }}>
              {filteredAvatars.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  paddingTop: '64px',
                  paddingBottom: '64px',
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#505068" strokeWidth="1.5"
                    strokeLinecap="round" style={{ margin: '0 auto 12px' }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <p style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'Raleway',
                  }}>
                    {avatars.length === 0 ? 'No characters yet. Create your first character.' : 'No characters match filters.'}
                  </p>
                </div>
              ) : (
                filteredAvatars.map(avatar => {
                  const inProject = isInProject(avatar.id);
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar)}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        textAlign: 'left',
                        background: '#111',
                        border: selectedAvatar?.id === avatar.id
                          ? '2px solid #ff2d7b'
                          : inProject
                            ? '2px solid rgba(255,45,123,0.3)'
                            : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        padding: 0,
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        aspectRatio: '3/4',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        {avatar.thumbnail_url ? (
                          <img src={avatar.thumbnail_url} alt={avatar.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.2s',
                            }} />
                        ) : (
                          <AvatarPlaceholder />
                        )}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, #111, transparent 50%)',
                        }} />

                        {/* "In Party" badge */}
                        {inProject && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            padding: '4px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: 'rgba(255,45,123,0.9)',
                            color: '#fff',
                            fontFamily: 'Raleway',
                          }}>
                            IN PARTY
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                          onMouseEnter={e => {
                            const elem = (e.currentTarget as HTMLElement).style;
                            elem.opacity = '1';
                          }}
                          onMouseLeave={e => {
                            const elem = (e.currentTarget as HTMLElement).style;
                            elem.opacity = '0';
                          }}
                        >
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '6px 12px',
                            background: 'rgba(255,45,123,0.9)',
                            color: '#fff',
                            fontFamily: 'Raleway',
                          }}>
                            View Stats
                          </span>
                        </div>
                      </div>

                      {/* Name + meta */}
                      <div style={{ padding: '10px' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#fff',
                          fontFamily: 'Raleway',
                        }}>{avatar.name}</div>
                        <div style={{
                          fontSize: '11px',
                          marginTop: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'rgba(255,255,255,0.3)',
                          fontFamily: 'Raleway',
                        }}>
                          {AGE_LABELS[avatar.age_appearance] || 'Adult'} / {GENDER_LABELS[avatar.gender_presentation] || 'Other'}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* Project Roster View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projectCharacters.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  paddingTop: '64px',
                  paddingBottom: '64px',
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#505068" strokeWidth="1.5"
                    strokeLinecap="round" style={{ margin: '0 auto 12px' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'Raleway',
                  }}>
                    No characters in your party yet. Browse the library to recruit.
                  </p>
                </div>
              ) : (
                projectCharacters.map(pc => {
                  const avatar = pc.avatar || avatars.find(a => a.id === pc.avatar_id);
                  if (!avatar) return null;
                  return (
                    <div key={pc.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px',
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        {avatar.thumbnail_url ? (
                          <img src={avatar.thumbnail_url} alt={avatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <AvatarPlaceholder />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#fff',
                          fontFamily: 'Raleway',
                        }}>{avatar.name}</div>
                        <div style={{
                          fontSize: '11px',
                          color: 'rgba(255,255,255,0.3)',
                          fontFamily: 'Raleway',
                        }}>
                          {pc.role_name || 'No role assigned'}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAvatar(avatar)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          fontFamily: 'Raleway',
                          transition: 'all 0.2s',
                        }}
                      >
                        Stats
                      </button>
                      <button
                        onClick={() => removeFromProject(pc.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(240,64,80,0.1)',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        title="Remove from party"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f04050" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Character detail sheet */}
      <div style={{
        width: '300px',
        flexShrink: 0,
      }}>
        {selectedAvatar ? (
          <CharacterSheet avatar={selectedAvatar} />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#111',
            border: '1px dashed rgba(255,255,255,0.08)',
            padding: '24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#505068" strokeWidth="1.5"
              strokeLinecap="round" style={{ marginBottom: '12px' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p style={{
              fontSize: '12px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Raleway',
            }}>
              Select a character to view their stats and reference sheet
            </p>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '10px 16px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 50,
          background: 'rgba(240,64,80,0.95)',
          color: '#fff',
          fontFamily: 'Raleway',
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}>&times;</button>
        </div>
      )}

      {/* Create Character Modal */}
      {showCreateModal && (
        <CreateCharacterModal
          onSubmit={createCharacter}
          onClose={() => setShowCreateModal(false)}
          isLoading={creatingCharacter}
        />
      )}
    </div>
  );
}