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
        px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg
        text-sm text-gray-700 dark:text-gray-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[#7C9A72] focus:border-transparent
        hover:border-gray-300 dark:hover:border-gray-500 transition-colors
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
