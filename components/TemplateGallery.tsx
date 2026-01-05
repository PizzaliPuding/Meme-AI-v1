
import React from 'react';
import { MemeTemplate } from '../types';

const TEMPLATES: MemeTemplate[] = [
  { id: '1', name: 'Distracted Boyfriend', url: 'https://picsum.photos/id/1011/600/400' },
  { id: '2', name: 'Two Buttons', url: 'https://picsum.photos/id/1025/600/400' },
  { id: '3', name: 'Woman Yelling at Cat', url: 'https://picsum.photos/id/1033/600/400' },
  { id: '4', name: 'Surprised Pikachu', url: 'https://picsum.photos/id/1040/600/400' },
  { id: '5', name: 'Thinking Guy', url: 'https://picsum.photos/id/1060/600/400' },
  { id: '6', name: 'Disaster Girl', url: 'https://picsum.photos/id/1074/600/400' },
];

interface Props {
  onSelect: (url: string) => void;
}

const TemplateGallery: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[400px] p-2">
      {TEMPLATES.map((tmpl) => (
        <button
          key={tmpl.id}
          onClick={() => onSelect(tmpl.url)}
          className="relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 transition-all"
        >
          <img src={tmpl.url} alt={tmpl.name} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end p-2 transition-opacity">
            <span className="text-xs font-bold text-white truncate">{tmpl.name}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default TemplateGallery;
