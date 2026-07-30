import { useRef } from 'react';

export function ImageUploader({
  label,
  hint,
  multiple,
  files,
  onChange,
}: {
  label: string;
  hint?: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-300">{label}</label>
      {hint && <p className="mb-2 text-xs text-neutral-500">{hint}</p>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
          onChange(multiple ? [...files, ...dropped] : dropped.slice(0, 1));
        }}
        className="cursor-pointer rounded-lg border-2 border-dashed border-neutral-800 p-6 text-center transition hover:border-neutral-600"
      >
        <p className="text-sm text-neutral-400">Click or drag {multiple ? 'images' : 'an image'} here</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            onChange(multiple ? [...files, ...picked] : picked.slice(0, 1));
            e.target.value = '';
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {files.map((file, i) => (
            <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-md border border-neutral-800">
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute right-0.5 top-0.5 hidden h-5 w-5 place-items-center rounded-full bg-black/70 text-xs text-white group-hover:grid"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
