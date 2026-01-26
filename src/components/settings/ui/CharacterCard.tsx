import type { Character } from '../../../stores/settingsStore';

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

export function CharacterCard({ character, isSelected, onSelect, onDelete }: CharacterCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        relative flex flex-col items-center p-3 rounded-xl cursor-pointer
        border-2 transition-all duration-200
        ${isSelected
          ? 'border-[#7C9A72] bg-[#7C9A72]/5 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="w-16 h-16 flex items-center justify-center mb-2">
        <img
          src={character.spriteUrl}
          alt={character.name}
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <span className="text-sm text-gray-700 font-medium">{character.name}</span>

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
