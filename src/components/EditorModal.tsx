import React, { useState } from 'react';
import { 
  X, Save, Download, Copy, RotateCcw, Plus, Trash2, Check,
  User, Layers, Code, Sparkles, AlertCircle, ArrowUp, ArrowDown, 
  Eye, EyeOff, Gamepad2, Car, Mail, Bookmark, Trophy, Quote, Rocket
} from 'lucide-react';
import { GreetingConfig, PuzzleBlock, GamingContent } from '../types/greeting';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GreetingConfig;
  onSaveConfig: (newConfig: GreetingConfig) => void;
  onResetConfig: () => void;
}

type TabType = 'profile' | 'blocks' | 'export';

export const EditorModal: React.FC<EditorModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetConfig,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('blocks');
  const [formData, setFormData] = useState<GreetingConfig>(config);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Синхронизация при открытии
  React.useEffect(() => {
    setFormData(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  // Изменение данных профиля друга
  const handleProfileChange = (field: keyof typeof formData.friend, value: string) => {
    setFormData(prev => ({
      ...prev,
      friend: {
        ...prev.friend,
        [field]: value
      }
    }));
  };

  // Перемещение блоков вверх/вниз
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.blocks.length) return;

    const newBlocks = [...formData.blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    // Пересчитываем order
    const updated = newBlocks.map((b, i) => ({ ...b, order: i + 1 }));
    setFormData(prev => ({ ...prev, blocks: updated }));
  };

  // Скрытие / отображение блока
  const handleToggleHideBlock = (blockId: string) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, hidden: !b.hidden } : b)
    }));
  };

  // Изменение заголовка/подзаголовка блока
  const handleBlockTitleChange = (blockId: string, newTitle: string) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, title: newTitle } : b)
    }));
  };

  const handleBlockSubtitleChange = (blockId: string, newSubtitle: string) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, subtitle: newSubtitle } : b)
    }));
  };

  // Изменение конкретного поля в data блока
  const handleBlockDataFieldChange = (blockId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? {
        ...b,
        data: {
          ...b.data,
          [field]: value
        }
      } : b)
    }));
  };

  // Поля тачки и сабвуфера
  const handleCarBassWishChange = (blockId: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id === blockId) {
          const currentWishes = [...(b.data.wishes || [])];
          currentWishes[index] = value;
          return {
            ...b,
            data: {
              ...b.data,
              wishes: currentWishes
            }
          };
        }
        return b;
      })
    }));
  };

  // Поля письма
  const handleLetterMessageChange = (blockId: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id === blockId) {
          const currentMsgs = [...(b.data.message || [])];
          currentMsgs[index] = value;
          return {
            ...b,
            data: {
              ...b.data,
              message: currentMsgs
            }
          };
        }
        return b;
      })
    }));
  };

  // Поля игрового блока (Мир Танков / Blitz / Steam)
  const handleGamingSubFieldChange = (
    blockId: string, 
    subKey: 'tanki' | 'blitz' | 'steam', 
    field: string, 
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => {
        if (b.id === blockId) {
          const gaming = b.data as GamingContent;
          return {
            ...b,
            data: {
              ...gaming,
              [subKey]: {
                ...gaming[subKey],
                [field]: value
              }
            }
          };
        }
        return b;
      })
    }));
  };

  // Добавление нового блока воспоминания
  const handleAddNewMemoryBlock = () => {
    const newId = `block-memory-${Date.now()}`;
    const newBlock: PuzzleBlock = {
      id: newId,
      type: 'memory',
      title: 'Новая общая история',
      subtitle: `Кусочек пазла #${formData.blocks.length + 1} • Нажми, чтобы раскрыть`,
      order: formData.blocks.length + 1,
      data: {
        tag: 'Свежее воспоминание',
        dateOrPlace: 'Памятное событие',
        summary: 'Напишите здесь саму историю или забавный случай из вашей дружбы...',
        secretDetail: 'А здесь напишите скрытую деталь, которая откроется по клику!',
      }
    };

    setFormData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
  };

  // Удаление блока
  const handleDeleteBlock = (blockId: string) => {
    if (window.confirm('Удалить этот блок из поздравления?')) {
      const remaining = formData.blocks.filter(b => b.id !== blockId);
      const reordered = remaining.map((b, i) => ({ ...b, order: i + 1 }));
      setFormData(prev => ({
        ...prev,
        blocks: reordered
      }));
    }
  };

  // Сохранение
  const handleSave = () => {
    onSaveConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const generateTsCode = () => {
    return `import { GreetingConfig } from '../types/greeting';\n\nexport const INITIAL_GREETING_CONFIG: GreetingConfig = ${JSON.stringify(formData, null, 2)};\n`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateTsCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `greeting-${formData.friend.name.toLowerCase() || 'friend'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'letter': return <Mail className="w-4 h-4 text-amber-400" />;
      case 'car_bass': return <Car className="w-4 h-4 text-emerald-400" />;
      case 'gaming': return <Gamepad2 className="w-4 h-4 text-orange-400" />;
      case 'memory': return <Bookmark className="w-4 h-4 text-sky-400" />;
      case 'achievement': return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'quote': return <Quote className="w-4 h-4 text-rose-400" />;
      case 'finale': return <Rocket className="w-4 h-4 text-yellow-400" />;
      default: return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Шапка модального окна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Редактор поздравления & Структура</h2>
              <p className="text-xs text-slate-400">Меняйте порядок блоков, скрывайте ненужные и правьте любые цифры</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранено!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Вкладки навигации редактора */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/60 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('blocks')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'blocks'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Структура и блоки ({formData.blocks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>О друге и поводе</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Экспорт и хостинг</span>
          </button>
        </div>

        {/* Содержимое вкладки */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ВКЛАДКА 1: Блоки пазла & Смена порядка */}
          {activeTab === 'blocks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Управление порядком и видимостью блоков</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Используйте стрелочки <span className="text-amber-400 font-bold">▲ Вверх</span> и <span className="text-amber-400 font-bold">▼ Вниз</span> для смены позиций, или глазок <span className="text-amber-400 font-bold">👁</span> чтобы временно скрыть блок.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewMemoryBlock}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить историю</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.blocks.map((block, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === formData.blocks.length - 1;

                  return (
                    <div
                      key={block.id}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        block.hidden
                          ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Верхняя строка управления блоком */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                            #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getBlockIcon(block.type)}
                            <span className="text-xs font-bold text-slate-300">
                              {block.title}
                            </span>
                          </div>
                          {block.hidden && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                              Скрыт на сайте
                            </span>
                          )}
                        </div>

                        {/* Кнопки перемещения и скрытия */}
                        <div className="flex items-center gap-1.5">
                          {/* Вверх */}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveBlock(idx, 'up')}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Переместить блок выше"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Вниз */}
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveBlock(idx, 'down')}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Переместить блок ниже"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Скрыть / Показать */}
                          <button
                            type="button"
                            onClick={() => handleToggleHideBlock(block.id)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                              block.hidden
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-800'
                            }`}
                            title={block.hidden ? 'Показать блок на странице' : 'Скрыть блок со страницы'}
                          >
                            {block.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {/* Удалить (для историй) */}
                          {block.type === 'memory' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBlock(block.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
                              title="Удалить блок"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Общие заголовки блока */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Заголовок блока:</label>
                          <input
                            type="text"
                            value={block.title}
                            onChange={(e) => handleBlockTitleChange(block.id, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Подзаголовок / подсказка:</label>
                          <input
                            type="text"
                            value={block.subtitle || ''}
                            onChange={(e) => handleBlockSubtitleChange(block.id, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* ========================================================
                          РЕДАКТИРОВАНИЕ: ПИСЬМО
                          ======================================================== */}
                      {block.type === 'letter' && block.data?.message && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <label className="block text-[11px] text-slate-400">Текст письма (абзацы):</label>
                          {block.data.message.map((para: string, pIdx: number) => (
                            <textarea
                              key={pIdx}
                              rows={2}
                              value={para}
                              onChange={(e) => handleLetterMessageChange(block.id, pIdx, e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                            />
                          ))}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">Обращение:</label>
                              <input
                                type="text"
                                value={block.data.salutation || ''}
                                onChange={(e) => handleBlockDataFieldChange(block.id, 'salutation', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">Подпись:</label>
                              <input
                                type="text"
                                value={block.data.signature || ''}
                                onChange={(e) => handleBlockDataFieldChange(block.id, 'signature', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================
                          РЕДАКТИРОВАНИЕ: ТАЧКА И САБВУФЕР
                          ======================================================== */}
                      {block.type === 'car_bass' && (
                        <div className="space-y-3 pt-2 border-t border-slate-800">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Слоган / обращение:</label>
                            <input
                              type="text"
                              value={block.data.carHeadline || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'carHeadline', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[11px] text-slate-400">Пожелания (для машины, бензина и сабвуфера):</label>
                            {(block.data.wishes || []).map((wish: string, wIdx: number) => (
                              <textarea
                                key={wIdx}
                                rows={2}
                                value={wish}
                                onChange={(e) => handleCarBassWishChange(block.id, wIdx, e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                              />
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-[11px] text-amber-400 mb-1">Ссылка на фото машины (URL):</label>
                              <input
                                type="text"
                                value={block.data.imageUrl || ''}
                                onChange={(e) => handleBlockDataFieldChange(block.id, 'imageUrl', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">Подпись к фотографии:</label>
                              <input
                                type="text"
                                value={block.data.imageCaption || ''}
                                onChange={(e) => handleBlockDataFieldChange(block.id, 'imageCaption', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] text-amber-400 mb-1">Название аудиодорожки:</label>
                              <input
                                type="text"
                                value={block.data.trackName || ''}
                                onChange={(e) => handleBlockDataFieldChange(block.id, 'trackName', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">Ссылка на трек (MP3 URL):</label>
                              <input
                                type="text"
                                value={block.data.audioUrl || ''}
                                onChange={(e) => handleBlockDataFieldChange(block.id, 'audioUrl', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================
                          РЕДАКТИРОВАНИЕ: ИГРЫ (3 ОТДЕЛЬНЫХ ПРОФИЛЯ: WOT, BLITZ, STEAM)
                          ======================================================== */}
                      {block.type === 'gaming' && (
                        <div className="space-y-3 pt-2 border-t border-slate-800">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Подзаголовок игрового блока:</label>
                            <input
                              type="text"
                              value={block.data.headline || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'headline', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                            />
                          </div>

                          {/* 1. Мир Танков (Lesta) */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/20 space-y-2">
                            <span className="text-xs font-bold text-amber-400 block">
                              1. Мир Танков (Lesta Games — отдельный ник):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400">Никнейм в Мире Танков:</label>
                                <input
                                  type="text"
                                  value={block.data.tanki?.nickname || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'tanki', 'nickname', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Бои:</label>
                                <input
                                  type="number"
                                  value={block.data.tanki?.battles || 0}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'tanki', 'battles', parseInt(e.target.value, 10) || 0)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Винрейт (%):</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={block.data.tanki?.winrate || 58.4}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'tanki', 'winrate', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">WN8 рейтинг:</label>
                                <input
                                  type="number"
                                  value={block.data.tanki?.ratingWN8 || 2450}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'tanki', 'ratingWN8', parseInt(e.target.value, 10) || 0)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400">Любимые танки (через запятую):</label>
                                <input
                                  type="text"
                                  value={block.data.tanki?.favoriteTanks?.join(', ') || ''}
                                  onChange={(e) => handleGamingSubFieldChange(
                                    block.id, 
                                    'tanki', 
                                    'favoriteTanks', 
                                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  )}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Мемное звание:</label>
                                <input
                                  type="text"
                                  value={block.data.tanki?.funnyTitle || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'tanki', 'funnyTitle', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-amber-300">Аватарка / эмблема в Мире Танков (URL):</label>
                                <input
                                  type="text"
                                  value={block.data.tanki?.avatarUrl || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'tanki', 'avatarUrl', e.target.value)}
                                  placeholder="Эмблема клана, медаль или свой URL..."
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Значок медали в углу (URL):</label>
                                <input
                                  type="text"
                                  value={block.data.tanki?.badgeUrl || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'tanki', 'badgeUrl', e.target.value)}
                                  placeholder="Медаль Lesta в углу аватарки..."
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 2. Tanks Blitz (Lesta) */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-orange-500/20 space-y-2">
                            <span className="text-xs font-bold text-orange-400 block">
                              2. Tanks Blitz (Lesta — отдельный ник):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400">Никнейм в Blitz:</label>
                                <input
                                  type="text"
                                  value={block.data.blitz?.nickname || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'blitz', 'nickname', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Бои в Blitz:</label>
                                <input
                                  type="number"
                                  value={block.data.blitz?.battles || 0}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'blitz', 'battles', parseInt(e.target.value, 10) || 0)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Винрейт Blitz (%):</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={block.data.blitz?.winrate || 60}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'blitz', 'winrate', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Средний урон:</label>
                                <input
                                  type="number"
                                  value={block.data.blitz?.avgDamage || 2000}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'blitz', 'avgDamage', parseInt(e.target.value, 10) || 0)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400">Любимые танки Blitz (через запятую):</label>
                                <input
                                  type="text"
                                  value={block.data.blitz?.favoriteTanks?.join(', ') || ''}
                                  onChange={(e) => handleGamingSubFieldChange(
                                    block.id,
                                    'blitz',
                                    'favoriteTanks',
                                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  )}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Стиль игры / звание Blitz:</label>
                                <input
                                  type="text"
                                  value={block.data.blitz?.funnyTitle || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'blitz', 'funnyTitle', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-orange-300">Аватарка / эмблема в Tanks Blitz (URL):</label>
                                <input
                                  type="text"
                                  value={block.data.blitz?.avatarUrl || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'blitz', 'avatarUrl', e.target.value)}
                                  placeholder="Боевая медаль, знак Мастер или свой URL..."
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Значок медали в углу (URL):</label>
                                <input
                                  type="text"
                                  value={block.data.blitz?.badgeUrl || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'blitz', 'badgeUrl', e.target.value)}
                                  placeholder="Знак отличия в углу..."
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 3. Steam */}
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-cyan-500/20 space-y-2">
                            <span className="text-xs font-bold text-cyan-400 block">
                              3. Steam профиль (отдельный ник):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400">Никнейм в Steam:</label>
                                <input
                                  type="text"
                                  value={block.data.steam?.steamNick || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'steam', 'steamNick', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Часов всего в Steam:</label>
                                <input
                                  type="number"
                                  value={block.data.steam?.totalHours || 4850}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'steam', 'totalHours', parseInt(e.target.value, 10) || 0)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Статус в сети:</label>
                                <input
                                  type="text"
                                  value={block.data.steam?.statusText || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'steam', 'statusText', e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Аватарка Steam (URL):</label>
                                <input
                                  type="text"
                                  value={block.data.steam?.avatarUrl || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'steam', 'avatarUrl', e.target.value)}
                                  placeholder="URL аватарки..."
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400">Рамка аватарки Steam (URL):</label>
                                <input
                                  type="text"
                                  value={block.data.steam?.avatarFrameUrl || ''}
                                  onChange={(e) => handleGamingSubFieldChange(block.id, 'steam', 'avatarFrameUrl', e.target.value)}
                                  placeholder="URL рамки профиля..."
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================
                          РЕДАКТИРОВАНИЕ: ВОСПОМИНАНИЕ / МЕМ
                          ======================================================== */}
                      {block.type === 'memory' && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Основной текст истории:</label>
                            <textarea
                              rows={2}
                              value={block.data.summary || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'summary', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-amber-400 mb-1">Секретная деталь (раскрывается по кнопке):</label>
                            <textarea
                              rows={2}
                              value={block.data.secretDetail || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'secretDetail', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-lg text-xs text-amber-200"
                            />
                          </div>
                        </div>
                      )}

                      {/* ========================================================
                          РЕДАКТИРОВАНИЕ: ДОСТИЖЕНИЯ
                          ======================================================== */}
                      {block.type === 'achievement' && block.data?.items && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <label className="block text-[11px] text-slate-400">Достижения именинника:</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {block.data.items.map((item: any, iIdx: number) => (
                              <div key={item.id || iIdx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => {
                                    const updated = [...block.data.items];
                                    updated[iIdx] = { ...updated[iIdx], title: e.target.value };
                                    handleBlockDataFieldChange(block.id, 'items', updated);
                                  }}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white font-bold"
                                  placeholder="Название ачивки"
                                />
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = [...block.data.items];
                                    updated[iIdx] = { ...updated[iIdx], description: e.target.value };
                                    handleBlockDataFieldChange(block.id, 'items', updated);
                                  }}
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] text-slate-300"
                                  placeholder="Описание"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ========================================================
                          РЕДАКТИРОВАНИЕ: ЦИТАТА
                          ======================================================== */}
                      {block.type === 'quote' && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Текст цитаты:</label>
                            <input
                              type="text"
                              value={block.data.quote || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'quote', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white font-serif"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Контекст / пояснение:</label>
                            <input
                              type="text"
                              value={block.data.context || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'context', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* ========================================================
                          РЕДАКТИРОВАНИЕ: ФИНАЛ
                          ======================================================== */}
                      {block.type === 'finale' && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Главный тост:</label>
                            <input
                              type="text"
                              value={block.data.heading || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'heading', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Текст кнопки салюта:</label>
                            <input
                              type="text"
                              value={block.data.callToAction || ''}
                              onChange={(e) => handleBlockDataFieldChange(block.id, 'callToAction', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ВКЛАДКА 2: О друге */}
          {activeTab === 'profile' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Имя друга
                </label>
                <input
                  type="text"
                  value={formData.friend.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Артём"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Прозвище / Краткое описание
                </label>
                <input
                  type="text"
                  value={formData.friend.nickname}
                  onChange={(e) => handleProfileChange('nickname', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Бро / Шеф / Легенда"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Повод (заголовок бейджа)
                </label>
                <input
                  type="text"
                  value={formData.friend.occasion}
                  onChange={(e) => handleProfileChange('occasion', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="С Днём Рождения, Легенда!"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Дата события
                  </label>
                  <input
                    type="text"
                    value={formData.friend.dateText}
                    onChange={(e) => handleProfileChange('dateText', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                    placeholder="26 октября"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Эмодзи или иконка
                  </label>
                  <input
                    type="text"
                    value={formData.friend.avatarEmoji || '⚡'}
                    onChange={(e) => handleProfileChange('avatarEmoji', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                    placeholder="⚡, 🔥, 👑"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Статус / Длительность дружбы
                </label>
                <input
                  type="text"
                  value={formData.friend.friendshipDuration}
                  onChange={(e) => handleProfileChange('friendshipDuration', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Много лет совместных приключений и угара"
                />
              </div>
            </div>
          )}

          {/* ВКЛАДКА 3: Экспорт и хостинг */}
          {activeTab === 'export' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-bold text-white mb-1">Как запустить сайт на своем хостинге:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Отредактируйте текст прямо здесь или в файле <code className="text-amber-300">src/data/initialConfig.ts</code>.</li>
                    <li>Выполните команду сборки: <code className="text-amber-300 font-mono">npm run build</code>.</li>
                    <li>Папка <code className="text-amber-300 font-mono">dist/</code> будет содержать готовый сайт (HTML, JS, CSS).</li>
                    <li>Загрузите файлы из <code className="text-amber-300 font-mono">dist/</code> на любой хостинг (Beget, Timeweb, GitHub Pages, Vercel и т.д.).</li>
                  </ol>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Скачать конфигурацию</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Сохраните файл JSON с вашими текстами и порядком блоков на компьютер.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 flex items-center justify-center gap-2 transition-all"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{copiedJson ? 'Скачано!' : 'Скачать config.json'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Код для initialConfig.ts</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Скопируйте готовый TypeScript-код и вставьте в файл проекта, чтобы зафиксировать навсегда.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 flex items-center justify-center gap-2 transition-all"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Скопировано в буфер!' : 'Скопировать код'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={onResetConfig}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить всё к начальным настройкам</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Подвал модального окна */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>Все правки мгновенно сохраняются в браузере</span>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all"
          >
            Применить и закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
