interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function Select({ value, options, onChange }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        px-3 py-2 bg-white border border-gray-200 rounded-lg
        text-sm text-gray-700 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[#7C9A72] focus:border-transparent
        hover:border-gray-300 transition-colors
      "
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
