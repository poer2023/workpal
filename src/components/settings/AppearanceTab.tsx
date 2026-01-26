import { useState, useRef } from 'react';
import { useSettingsStore, type Character } from '../../stores/settingsStore';
import { CharacterCard } from './ui/CharacterCard';
import { Slider } from './ui/Slider';
import { Select } from './ui/Select';
import { Toggle } from './ui/Toggle';

const presetCharacters = [
  { id: 'blob', name: 'Blob', spriteUrl: '/sprites/blob.png', isCustom: false },
  { id: 'cat', name: 'Cat', spriteUrl: '/sprites/cat.png', isCustom: false },
  { id: 'robot', name: 'Robot', spriteUrl: '/sprites/robot.png', isCustom: false },
  { id: 'fox', name: 'Fox', spriteUrl: '/sprites/fox.png', isCustom: false },
  { id: 'clippy', name: 'Clippy', spriteUrl: '/sprites/clippy.png', isCustom: false },
  { id: 'kaka', name: 'Kaka', spriteUrl: '/sprites/kaka.png', isCustom: false },
];

const AI_PROMPT_TEMPLATE = `Create a pixel art sprite sheet for a desktop pet character.

Specifications:
- Size: 1024x896 pixels (8 columns × 7 rows)
- Frame size: 128x128 pixels per frame
- Background: #ff00ff (magenta, will be transparent)
- Style: Cute, expressive pixel art

Animation rows (top to bottom):
Row 1: Idle animation (8 frames) - gentle breathing/blinking
Row 2: Happy animation (8 frames) - celebrating, jumping
Row 3: Excited animation (8 frames) - very energetic movement
Row 4: Sleepy animation (8 frames) - yawning, nodding off
Row 5: Working animation (8 frames) - typing, focused
Row 6: Angry animation (8 frames) - frustrated expression
Row 7: Dragging animation (8 frames) - being picked up

Make the character [YOUR CHARACTER DESCRIPTION HERE].`;

export function AppearanceTab() {
  const {
    currentCharacter,
    characters,
    petSize,
    characterName,
    theme,
    idleAnimations,
    alwaysOnTop,
    backgroundRemovalAlgorithm,
    setCurrentCharacter,
    addCharacter,
    removeCharacter,
    setPetSize,
    setCharacterName,
    setTheme,
    setIdleAnimations,
    setAlwaysOnTop,
    setBackgroundRemovalAlgorithm,
  } = useSettingsStore();

  const [customName, setCustomName] = useState('');
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customCharacters = characters.filter((c) => c.isCustom);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newChar: Character = {
        id: `custom-${Date.now()}`,
        name: customName || file.name.replace(/\.[^/.]+$/, ''),
        spriteUrl: dataUrl,
        isCustom: true,
      };
      addCharacter(newChar);
      setCustomName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
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
        <h3 className="text-base font-semibold text-gray-800 mb-1">Character</h3>
        <p className="text-sm text-gray-500 mb-3">Choose your desktop companion</p>
        <div className="grid grid-cols-4 gap-3">
          {presetCharacters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={currentCharacter?.id === char.id}
              onSelect={() => setCurrentCharacter(char)}
            />
          ))}
        </div>
      </section>

      {/* Custom Character Upload */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-800">Custom Character</h3>
          <button
            onClick={() => setShowFormatInfo(!showFormatInfo)}
            className="text-xs text-[#7C9A72] hover:underline"
          >
            {showFormatInfo ? 'Hide format info' : 'Show format info'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Upload your own sprite sheet</p>

        {showFormatInfo && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 space-y-1">
            <p>• Recommended size: <strong>1024x896px</strong> (8 frames/row × 7 rows)</p>
            <p>• Frame size: <strong>128x128px</strong> per frame</p>
            <p>• Aspect ratio: ≈8:7 (≈1.1429)</p>
            <p>• Background: <strong>#ff00ff</strong> (magenta, auto-transparent)</p>
            <p>• Rows: Idle, Happy, Excited, Sleepy, Working, Angry, Dragging</p>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Name (optional)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-[#7C9A72] focus:border-transparent"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#7C9A72] text-white rounded-lg text-sm hover:bg-[#6B8A62] transition-colors"
          >
            Choose File
          </button>
        </div>

        {customCharacters.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {customCharacters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                isSelected={currentCharacter?.id === char.id}
                onSelect={() => setCurrentCharacter(char)}
                onDelete={() => removeCharacter(char.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* AI Prompt Template */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-800">AI Prompt Template</h3>
          <button
            onClick={copyPrompt}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              copySuccess
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {copySuccess ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <textarea
          readOnly
          value={AI_PROMPT_TEMPLATE}
          className="w-full h-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs
            text-gray-600 font-mono resize-none focus:outline-none"
        />
      </section>

      {/* Background Removal Algorithm */}
      <section>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Background Removal Algorithm</label>
          <Select
            value={backgroundRemovalAlgorithm}
            options={[
              { value: 'hsl', label: 'HSL Color Space' },
              { value: 'rgb', label: 'RGB Color Space' },
            ]}
            onChange={(v) => setBackgroundRemovalAlgorithm(v as 'hsl' | 'rgb')}
          />
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">Settings</h3>

        {/* Character Name */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Character Name</label>
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-[#7C9A72] focus:border-transparent
              w-40"
          />
        </div>

        {/* Character Size */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Character Size</label>
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

        {/* Theme */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Theme</label>
          <Select
            value={theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(v) => setTheme(v as 'system' | 'light' | 'dark')}
          />
        </div>

        {/* Idle Animations */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700">Idle Animations</label>
            <p className="text-xs text-gray-500">Play animations when idle</p>
          </div>
          <Toggle checked={idleAnimations} onChange={setIdleAnimations} />
        </div>

        {/* Always on Top */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700">Always on Top</label>
            <p className="text-xs text-gray-500">Keep pet window above others</p>
          </div>
          <Toggle checked={alwaysOnTop} onChange={setAlwaysOnTop} />
        </div>
      </section>
    </div>
  );
}
