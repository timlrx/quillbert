import { formatKey, sortKeys } from "@/utils/keyboardUtils";
import { X } from "lucide-react";

export type Shortcut = string[];

interface ShortcutItemProps {
  shortcut: string[];
  isEditing: boolean;
  currentKeys: string[];
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ShortcutItem({
  shortcut,
  isEditing,
  currentKeys,
  onEdit,
  onSave,
  onCancel,
}: ShortcutItemProps) {
  const renderKeys = (keys: string[]) => {
    const sortedKeys = sortKeys(keys);
    return sortedKeys.map((key, index) => (
      <kbd
        key={index}
        className="px-2 py-1 text-sm font-semibold rounded shadow-sm bg-gray-100 border border-gray-300 text-gray-800"
      >
        {formatKey(key)}
      </kbd>
    ));
  };

  return (
    <div className="flex items-center">
      {isEditing ? (
        <>
          <div className="flex gap-1 min-w-[150px]">
            {currentKeys.length > 0 ? (
              renderKeys(currentKeys)
            ) : (
              <span className="italic text-gray-500 px-2 py-1">
                Press keys...
              </span>
            )}
          </div>
          <div className="flex gap-2 ml-3">
            <button
              onClick={onSave}
              disabled={currentKeys.length < 2}
              className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1">
            {shortcut.length > 0 ? (
              renderKeys(shortcut)
            ) : (
              <span className="text-gray-400 text-sm italic">
                No shortcut set
              </span>
            )}
          </div>
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors ml-3"
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}
