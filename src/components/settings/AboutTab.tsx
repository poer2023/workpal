import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settingsStore';
import { isLocalFileUrl } from '../../utils/characterStorage';
import { useSprite } from '../../hooks/useSprite';

const APP_VERSION = '0.1.0';

export function AboutTab() {
  const { t } = useTranslation();
  const { currentCharacter, backgroundRemovalAlgorithm } = useSettingsStore();
  const character =
    currentCharacter || {
      id: 'default-cat',
      name: 'Cat',
      spriteUrl: '/sprites/cat.png',
      isCustom: false,
      backgroundRemoved: true,
    };

  const { canvasRef, scaledSize, canvasSize } = useSprite({
    spriteUrl: character.spriteUrl,
    spriteName:
      character.isCustom || isLocalFileUrl(character.spriteUrl) ? character.name : undefined,
    state: 'happy',
    size: 96,
    fps: 8,
    backgroundRemovalAlgorithm: character.backgroundRemoved ? undefined : backgroundRemovalAlgorithm,
  });

  return (
    <div className="space-y-6 p-1">
      {/* App Info */}
      <section className="flex flex-col items-center text-center py-4">
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className="w-24 h-24 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              style={{ width: scaledSize.width, height: scaledSize.height, imageRendering: 'pixelated' }}
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('about.welcome')}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('about.appName')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('about.tagline')}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500">{t('about.version')} {APP_VERSION}</span>
      </section>

      {/* Description */}
      <section className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <p>{t('about.description')}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('about.summary')}</p>
      </section>
    </div>
  );
}
