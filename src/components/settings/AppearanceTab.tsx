import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Character } from '../../stores/settingsStore';
import { CharacterCard } from './ui/CharacterCard';
import { CharacterPreview } from './ui/CharacterPreview';
import { Slider } from './ui/Slider';
import { Select } from './ui/Select';
import { Toggle } from './ui/Toggle';
import {
  saveCharacterImage,
  deleteCharacterImage,
  readCharacterImageBytes,
  bytesToPngDataUrl,
  detectImageMime,
  isLocalFileUrl,
} from '../../utils/characterStorage';
import { applyBackgroundRemoval, loadSpriteSheet } from '../../utils/spriteLoader';

const AI_PROMPT_TEMPLATE = `Create ONE pixel-art sprite sheet for a desktop pet character.
Use the uploaded reference image to match the character's identity (shape, colors, outfit).
Only replace the [CHARACTER DESCRIPTION] line; keep everything else unchanged.

ABSOLUTE REQUIREMENTS (must be exact):
- Output format: PNG
- Canvas size: 2208x1920 px
- Grid: 8 columns x 7 rows (56 frames total)
- Each frame: 276x274 px
- No padding, no margins, no borders; frames align perfectly to the grid
- Background: solid #FF00FF (magenta) everywhere outside the character
- No transparency or alpha channel; background stays pure #FF00FF
- Single sprite sheet only (not separate images, not a collage)
- No text, no watermark, no UI elements

PIXEL ART STYLE:
- Crisp pixel art, hard edges, no blur, no anti-aliasing
- Consistent scale/position across all frames
- Keep character centered with a fixed baseline (feet aligned)

ANIMATION ROWS (top to bottom), 8 frames each:
1) Idle: gentle breathing/blink
2) Happy: celebrate/jump
3) Excited: energetic movement
4) Sleepy: yawn/nod
5) Working: typing/focused
6) Angry: frustrated
7) Dragging: being picked up/dragged

Character description:
[CHARACTER DESCRIPTION]

Negative (avoid):
3D, realistic rendering, painterly, gradients, shadows outside character, soft edges, blur, anti-aliasing, extra borders, wrong size, wrong grid, multiple sheets`;

export function AppearanceTab() {
  const { t } = useTranslation();
  const {
    currentCharacter,
    characters,
    petSize,
    idleAnimations,
    alwaysOnTop,
    backgroundRemovalAlgorithm,
    setCurrentCharacter,
    addCharacter,
    removeCharacter,
    updateCharacter,
    setPetSize,
    setIdleAnimations,
    setAlwaysOnTop,
    setBackgroundRemovalAlgorithm,
  } = useSettingsStore();

  const [customName, setCustomName] = useState('');
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [repairStatus, setRepairStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const repairingRef = useRef<Set<string>>(new Set());

  const nameRequired = Boolean(selectedFile) && !customName.trim();
  const availableCharacters = characters;

  useEffect(() => {
    let cancelled = false;
    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (fn: () => void) =>
            (window as Window & {
              requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
            }).requestIdleCallback(fn, { timeout: 2000 })
        : (fn: () => void) => window.setTimeout(fn, 50);

    const handle = schedule(async () => {
      for (const char of characters) {
        if (cancelled) return;
        const isLocal = char.isCustom || isLocalFileUrl(char.spriteUrl);
        const needsRemoval = isLocal && !char.backgroundRemoved;
        try {
          await loadSpriteSheet(
            char.spriteUrl,
            needsRemoval ? backgroundRemovalAlgorithm : undefined,
            isLocal ? char.name : undefined
          );
        } catch {}
        // Yield between characters to keep UI responsive
        await new Promise((r) => setTimeout(r, 0));
      }
    });

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle as number);
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [characters, backgroundRemovalAlgorithm]);

  const ensureCustomCharacterReady = async (character: Character) => {
    if (!character.isCustom) return;
    if (repairingRef.current.has(character.id)) return;
    repairingRef.current.add(character.id);
    try {
      const bytes = await readCharacterImageBytes(character.name);
      const mime = detectImageMime(bytes);
      let updated = false;
      if (mime && mime !== 'image/png') {
        const pngDataUrl = await bytesToPngDataUrl(bytes, mime);
        const spriteUrl = await saveCharacterImage(character.name, pngDataUrl);
        updateCharacter(character.id, { spriteUrl });
        updated = true;
      }

      if (backgroundRemovalAlgorithm && !character.backgroundRemoved) {
        const latestBytes = updated ? await readCharacterImageBytes(character.name) : bytes;
        const latestMime = updated ? detectImageMime(latestBytes) : mime;
        const blob = new Blob([latestBytes], { type: latestMime || 'application/octet-stream' });
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.decoding = 'async';
        const decoded = await new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to decode image'));
          img.src = objectUrl;
        });
        URL.revokeObjectURL(objectUrl);
        const processed = applyBackgroundRemoval(decoded, backgroundRemovalAlgorithm);
        if (processed instanceof HTMLCanvasElement) {
          const dataUrl = processed.toDataURL('image/png');
          const spriteUrl = await saveCharacterImage(character.name, dataUrl);
          updateCharacter(character.id, { spriteUrl, backgroundRemoved: true });
          updated = true;
        }
      }

      if (updated) {
        setRepairStatus({ type: 'success', message: t('appearance.repairSuccess') });
        setTimeout(() => setRepairStatus(null), 2000);
      }
    } catch (err) {
      console.error('Failed to repair custom character:', err);
      setRepairStatus({ type: 'error', message: t('appearance.repairFailed') });
      setTimeout(() => setRepairStatus(null), 2000);
      repairingRef.current.delete(character.id);
    }
  };

  // 处理文件选择（只预览，不上传）
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(t('appearance.uploadErrorInvalid'));
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    // 如果用户没有输入名字，自动填入文件名（去掉扩展名）
    if (!customName) {
      setCustomName(file.name.replace(/\.[^/.]+$/, ''));
    }

    // 创建预览 URL
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreviewUrl(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError(t('appearance.uploadErrorRead'));
      setSelectedFile(null);
      setFilePreviewUrl(null);
    };
    reader.readAsDataURL(file);
  };

  const normalizeName = (inputName: string, fileName: string) => {
    const baseName = inputName.trim() || fileName.replace(/\.[^/.]+$/, '').trim();
    return baseName || t('appearance.defaultCustomName');
  };

  const getUniqueName = (name: string) => {
    if (!characters.some((c) => c.name === name)) return name;
    let index = 2;
    let candidate = `${name} ${index}`;
    while (characters.some((c) => c.name === candidate)) {
      index += 1;
      candidate = `${name} ${index}`;
    }
    return candidate;
  };

  // 确认上传
  const handleUpload = async () => {
    if (!selectedFile || !filePreviewUrl) {
      setUploadError(t('appearance.uploadErrorMissing'));
      return;
    }

    const normalizedName = normalizeName(customName, selectedFile.name);
    if (!normalizedName.trim()) {
      setUploadError(t('appearance.uploadErrorName'));
      return;
    }

    const finalName = getUniqueName(normalizedName);

    try {
      // Save image to file system, get asset:// URL
      const spriteUrl = await saveCharacterImage(finalName, filePreviewUrl);

      const newChar: Character = {
        id: `custom-${Date.now()}`,
        name: finalName,
        spriteUrl,  // Now it's asset:// URL, not base64
        isCustom: true,
        backgroundRemoved: false,
      };
      addCharacter(newChar);
      setCurrentCharacter(newChar);
      setUploadError(null);

      // 清空状态
      setCustomName('');
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to save character image:', err);
      setUploadError(t('appearance.uploadErrorSave'));
    }
  };

  // 取消选择
  const handleCancelSelect = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setCustomName('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-6 p-1">
      {/* Character Selection */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{t('appearance.character')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('appearance.characterDesc')}</p>
        <div className="grid grid-cols-4 gap-3">
          {availableCharacters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={currentCharacter?.id === char.id}
              onSelect={() => {
                void ensureCustomCharacterReady(char);
                setCurrentCharacter(char);
              }}
              onDelete={
                char.isCustom
                  ? async () => {
                      const fallback =
                        characters.find((candidate) => candidate.id !== char.id) || null;

                      // Delete image file from disk
                      try {
                        await deleteCharacterImage(char.name);
                      } catch (err) {
                        console.error('Failed to delete character image:', err);
                      }

                      removeCharacter(char.id);
                      if (currentCharacter?.id === char.id) {
                        if (fallback) {
                          setCurrentCharacter(fallback);
                        } else {
                          setCurrentCharacter({
                            id: 'default-cat',
                            name: 'Cat',
                            spriteUrl: '/sprites/cat.png',
                            isCustom: false,
                          });
                        }
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Custom Character Upload */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('appearance.customCharacter')}</h3>
          <button
            onClick={() => setShowFormatInfo(!showFormatInfo)}
            className="text-xs text-[#7C9A72] hover:underline"
          >
            {showFormatInfo ? t('appearance.hideFormatInfo') : t('appearance.showFormatInfo')}
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('appearance.customCharacterDesc')}</p>

        {showFormatInfo && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <p>• {t('appearance.formatInfo.size')}</p>
            <p>• {t('appearance.formatInfo.frameSize')}</p>
            <p>• {t('appearance.formatInfo.aspectRatio')}</p>
            <p>• {t('appearance.formatInfo.background')}</p>
            <p>• {t('appearance.formatInfo.rows')}</p>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder={t('appearance.namePlaceholder')}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-[#7C9A72] focus:border-transparent"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#7C9A72] text-white rounded-lg text-sm hover:bg-[#6B8A62] transition-colors"
          >
            {t('appearance.chooseFile')}
          </button>
        </div>

        {uploadError && (
          <p className="text-xs text-red-500 mb-2">{uploadError}</p>
        )}
        {nameRequired && !uploadError && (
          <p className="text-xs text-amber-500 mb-2">{t('appearance.uploadNameRequired')}</p>
        )}
        {repairStatus && (
          <p className={`text-xs mb-2 ${repairStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {repairStatus.message}
          </p>
        )}

        {/* 文件预览和上传确认 */}
        {selectedFile && filePreviewUrl && (
          <div className="mb-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                <CharacterPreview
                  spriteUrl={filePreviewUrl}
                  size={64}
                  backgroundRemovalAlgorithm={backgroundRemovalAlgorithm}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {customName || selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedFile.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelSelect}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleUpload}
                  className="px-3 py-1.5 text-sm text-white bg-[#7C9A72] rounded-lg hover:bg-[#6B8A62] transition-colors"
                >
                  {t('appearance.upload')}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* AI Prompt Template */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('appearance.aiPromptTemplate')}</h3>
          <button
            onClick={copyPrompt}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              copySuccess
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {copySuccess ? `✓ ${t('appearance.copied')}` : t('appearance.copy')}
          </button>
        </div>
        <textarea
          readOnly
          value={AI_PROMPT_TEMPLATE}
          className="w-full h-32 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs
            text-gray-600 dark:text-gray-300 font-mono resize-none focus:outline-none"
        />
      </section>

      {/* Background Removal Algorithm */}
      <section>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-200">{t('appearance.backgroundRemoval')}</label>
          <Select
            value={backgroundRemovalAlgorithm}
            options={[
              { value: 'hsl', label: t('appearance.hslColorSpace') },
              { value: 'rgb', label: t('appearance.rgbColorSpace') },
            ]}
            onChange={(v) => setBackgroundRemovalAlgorithm(v as 'hsl' | 'rgb')}
          />
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('appearance.settingsSection')}</h3>

        {/* Character Size */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-200">{t('appearance.characterSize')}</label>
          <div className="w-48">
            <Slider
              value={petSize}
              min={60}
              max={200}
              onChange={setPetSize}
              unit="px"
            />
          </div>
        </div>

        {/* Idle Animations */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">{t('appearance.idleAnimations')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.idleAnimationsDesc')}</p>
          </div>
          <Toggle checked={idleAnimations} onChange={setIdleAnimations} />
        </div>

        {/* Always on Top */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">{t('appearance.alwaysOnTop')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.alwaysOnTopDesc')}</p>
          </div>
          <Toggle checked={alwaysOnTop} onChange={setAlwaysOnTop} />
        </div>
      </section>
    </div>
  );
}
