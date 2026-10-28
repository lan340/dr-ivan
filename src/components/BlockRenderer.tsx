import React from 'react';
import { PuzzleBlock } from '../types/greeting';
import { LetterBlock } from './blocks/LetterBlock';
import { CarBassBlock } from './blocks/CarBassBlock';
import { GamingBlock } from './blocks/GamingBlock';
import { MemoryBlock } from './blocks/MemoryBlock';
import { AchievementBlock } from './blocks/AchievementBlock';
import { TriviaBlock } from './blocks/TriviaBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { FinaleBlock } from './blocks/FinaleBlock';

interface BlockRendererProps {
  block: PuzzleBlock;
  onUnlock?: () => void;
  isUnlocked?: boolean;
  onUpdateData?: (newData: any) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block, onUnlock, isUnlocked, onUpdateData }) => {
  switch (block.type) {
    case 'letter':
      return <LetterBlock block={block} onUnlock={onUnlock} isUnlocked={isUnlocked} />;
    case 'car_bass':
      return <CarBassBlock block={block} onUnlock={onUnlock} isUnlocked={isUnlocked} onUpdateData={onUpdateData} />;
    case 'gaming':
      return <GamingBlock block={block} onUnlock={onUnlock} isUnlocked={isUnlocked} onUpdateData={onUpdateData} />;
    case 'memory':
      return <MemoryBlock block={block} onUnlock={onUnlock} isUnlocked={isUnlocked} />;
    case 'achievement':
      return <AchievementBlock block={block} onUnlock={onUnlock} isUnlocked={isUnlocked} />;
    case 'trivia':
      return <TriviaBlock block={block} onUnlock={onUnlock} isUnlocked={isUnlocked} />;
    case 'quote':
      return <QuoteBlock block={block} />;
    case 'finale':
      return <FinaleBlock block={block} onUnlock={onUnlock} isUnlocked={isUnlocked} />;
    default:
      return null;
  }
};
