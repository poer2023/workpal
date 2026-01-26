interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit?: string;
}

export function Slider({ value, min, max, onChange, unit = '' }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3 w-full">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-[#7C9A72]
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110"
        style={{
          background: `linear-gradient(to right, #7C9A72 0%, #7C9A72 ${percentage}%, #E5E5E5 ${percentage}%, #E5E5E5 100%)`,
        }}
      />
      <span className="text-sm text-gray-600 min-w-[60px] text-right">
        {value}{unit}
      </span>
    </div>
  );
}
