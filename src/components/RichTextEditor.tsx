
import React, { useMemo, useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface Props {
  value: string;
  onChange: (content: string) => void;
  label?: string;
}

export default function RichTextEditor({ value, onChange, label }: Props) {
  const [internalValue, setInternalValue] = useState(value || '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal value if prop changes externally (e.g. on Save/Reset)
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value || '');
    }
  }, [value]);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'direction': 'rtl' }, { 'align': [] }],
      ['link', 'clean']
    ],
  }), []);

  const formats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'direction', 'align',
    'link'
  ], []);

  const handleChange = (content: string) => {
    setInternalValue(content);
    
    // Use debounce to prevent frequent parent state updates
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(content);
    }, 500);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-bold text-gray-700">{label}</label>}
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
        <ReactQuill 
          theme="snow" 
          value={internalValue} 
          onChange={handleChange} 
          modules={modules}
          formats={formats}
          className="min-h-[200px]"
        />
      </div>
    </div>
  );
}
