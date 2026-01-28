import { useState, useEffect } from 'react';
import type { Character } from '../../../stores/settingsStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { CharacterPreview } from './CharacterPreview';
import { isLocalFileUrl } from '../../../utils/characterStorage';

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

export function CharacterCard({ character, isSelected, onSelect, onDelete }: CharacterCardProps) {
  const { setCharacterName, updateCharacter, backgroundRemovalAlgorithm } = useSettingsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(character.name);
  const canEditName = isSelected && !character.isCustom;

  useEffect(() => {
    if (!isEditing) {
      setEditValue(character.name);
    }
  }, [character.name, isEditing]);

  const handleNameClick = (e: React.MouseEvent) => {
    if (canEditName) {
      e.stopPropagation();
      setEditValue(character.name);
      setIsEditing(true);
    }
  };

  const handleNameBlur = () => {
    setIsEditing(false);
    const nextName = editValue.trim();
    if (nextName && nextName !== character.name) {
      updateCharacter(character.id, { name: nextName });
      setCharacterName(nextName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(character.name);
    }
  };

  const needsRemoval =
    (character.isCustom || isLocalFileUrl(character.spriteUrl)) && !character.backgroundRemoved;
  const displayName = character.name;

  return (
    <div
      onClick={onSelect}
      className={`
        relative flex flex-col items-center p-3 rounded-xl cursor-pointer
        border-2 transition-all duration-200
        ${isSelected
          ? 'border-[#7C9A72] bg-[#7C9A72]/5 shadow-sm'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
        }
      `}
    >
      <div className="w-16 h-16 flex items-center justify-center mb-2">
        <CharacterPreview
          spriteUrl={character.spriteUrl}
          spriteName={character.isCustom || isLocalFileUrl(character.spriteUrl) ? character.name : undefined}
          size={64}
          backgroundRemovalAlgorithm={needsRemoval ? backgroundRemovalAlgorithm : undefined}
        />
      </div>

      {canEditName && isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="text-sm text-center font-medium w-full px-1 py-0.5
            border border-[#7C9A72] rounded bg-white dark:bg-gray-800
            text-gray-700 dark:text-gray-200
            focus:outline-none focus:ring-1 focus:ring-[#7C9A72]"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          onClick={handleNameClick}
          className={`text-sm text-gray-700 dark:text-gray-200 font-medium ${
            canEditName ? 'cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded' : ''
          }`}
        >
          {displayName}
        </span>
      )}

      {onDelete && character.isCustom && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            absolute -top-2 -right-2 w-5 h-5 rounded-full
            bg-red-500 text-white text-xs flex items-center justify-center
            hover:bg-red-600 transition-colors
          "
        >
          ×
        </button>
      )}
    </div>
  );
}
