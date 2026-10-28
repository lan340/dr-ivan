import React from 'react';
import { Quote } from 'lucide-react';
import { QuoteContent, PuzzleBlock } from '../../types/greeting';

interface QuoteBlockProps {
  block: PuzzleBlock;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({ block }) => {
  const content = block.data as QuoteContent;

  return (
    <div id={block.id} className="relative w-full max-w-3xl mx-auto my-14 scroll-mt-24">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-2xl p-8 sm:p-12 shadow-xl text-center">
        {/* Фоновая декоративная кавычка */}
        <Quote className="absolute -top-4 -left-4 w-32 h-32 text-amber-500/5 rotate-12 pointer-events-none" />

        <div className="text-xs font-semibold tracking-wider text-amber-400 uppercase mb-4">
          {block.subtitle || 'Цитата великих людей'}
        </div>

        <blockquote className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 font-handwriting leading-snug sm:leading-relaxed mb-6">
          {content.quote}
        </blockquote>

        <div className="inline-flex flex-col items-center">
          <div className="h-0.5 w-12 bg-amber-500/50 mb-3" />
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            {content.context}
          </p>
          {content.yearOrPlace && (
            <p className="text-xs text-slate-500 mt-1">
              {content.yearOrPlace}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
