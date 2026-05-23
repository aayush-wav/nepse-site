import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, X, FileSpreadsheet, CheckCircle2, Info } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  symbol?: string;
  createdAt: number;
  updatedAt: number;
}

export default function TradingNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', symbol: '' });

  useEffect(() => {
    const saved = localStorage.getItem('nepse_elite_notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse notes', e);
      }
    }
  }, []);

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem('nepse_elite_notes', JSON.stringify(newNotes));
  };

  const handleCreate = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Trading Note',
      content: '',
      symbol: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setActiveNote(newNote);
    setEditForm({ title: newNote.title, content: newNote.content, symbol: newNote.symbol || '' });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!activeNote) return;
    
    const updatedNote: Note = {
      ...activeNote,
      title: editForm.title || 'Untitled Note',
      content: editForm.content,
      symbol: editForm.symbol.toUpperCase(),
      updatedAt: Date.now(),
    };

    const isNew = !notes.find(n => n.id === activeNote.id);
    const newNotes = isNew 
      ? [updatedNote, ...notes]
      : notes.map(n => n.id === activeNote.id ? updatedNote : n);
      
    saveNotes(newNotes);
    setActiveNote(updatedNote);
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newNotes = notes.filter(n => n.id !== id);
    saveNotes(newNotes);
    if (activeNote?.id === id) {
      setActiveNote(null);
      setIsEditing(false);
    }
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setEditForm({ title: note.title, content: note.content, symbol: note.symbol || '' });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-gold">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold">Trading Notes</h1>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Your personal trade journal</p>
          </div>
        </div>
        <button onClick={handleCreate} className="btn-primary py-2 px-4 flex items-center gap-2">
          <Plus size={16} /> New Note
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-3 shrink-0 overflow-y-auto pr-2 custom-scrollbar hidden md:flex">
          {notes.length === 0 ? (
            <div className="card p-8 text-center text-text-muted border-dashed border-bg-border flex-1 flex flex-col items-center justify-center">
              <BookOpen size={32} className="opacity-20 mb-3" />
              <p className="text-sm">No notes yet.</p>
              <p className="text-xs mt-1">Create one to log your trade thesis.</p>
            </div>
          ) : (
            notes.map(note => (
              <div 
                key={note.id}
                onClick={() => selectNote(note)}
                className={`card p-4 cursor-pointer transition-all hover:border-brand-gold/30 ${activeNote?.id === note.id ? 'border-brand-gold shadow-glow-gold/10 bg-brand-gold/5' : 'border-bg-border'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm line-clamp-1 flex-1 pr-2">{note.title}</h3>
                  <button onClick={(e) => handleDelete(e, note.id)} className="text-text-muted hover:text-bear-red transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
                {note.symbol && (
                  <span className="inline-block px-2 py-0.5 rounded bg-bg-elevated text-[10px] font-jetbrains font-bold mb-2">
                    {note.symbol}
                  </span>
                )}
                <p className="text-xs text-text-secondary line-clamp-2 mb-3">{note.content || 'Empty note...'}</p>
                <div className="text-[10px] text-text-muted flex items-center gap-1">
                  <Info size={10} /> {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 card flex flex-col overflow-hidden relative border-bg-border/50">
          {!activeNote && !isEditing ? (
             <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-8 text-center">
               <BookOpen size={64} className="opacity-10 mb-4" />
               <h3 className="text-lg font-bold mb-2 text-text-primary">Select a Note</h3>
               <p className="text-sm">Or create a new one to start writing your trading journal.</p>
             </div>
          ) : (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-6 shrink-0">
                {isEditing ? (
                  <div className="flex-1 space-y-3 mr-4">
                    <input 
                      type="text" 
                      value={editForm.title} 
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      className="w-full bg-transparent border-b border-bg-border focus:border-brand-gold outline-none py-2 font-syne text-2xl font-bold text-text-primary placeholder:text-text-muted"
                      placeholder="Note Title"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-muted uppercase">Symbol Tag:</span>
                      <input 
                        type="text" 
                        value={editForm.symbol} 
                        onChange={e => setEditForm({...editForm, symbol: e.target.value})}
                        className="bg-bg-elevated border border-bg-border rounded px-2 py-1 text-xs font-jetbrains outline-none focus:border-brand-gold w-32 uppercase"
                        placeholder="e.g. NICA"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 mr-4">
                    <h2 className="font-syne text-2xl font-bold mb-2">{activeNote!.title}</h2>
                    <div className="flex items-center gap-3">
                      {activeNote!.symbol && (
                        <span className="px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold border border-brand-gold/20 text-xs font-jetbrains font-bold">
                          {activeNote!.symbol}
                        </span>
                      )}
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Info size={12} /> Last updated: {new Date(activeNote!.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => {
                        if (!notes.find(n => n.id === activeNote!.id)) setActiveNote(null);
                        setIsEditing(false);
                      }} className="p-2 rounded-lg text-text-muted hover:bg-bg-elevated transition-colors">
                        <X size={18} />
                      </button>
                      <button onClick={handleSave} className="btn-primary py-2 px-4 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Save
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="btn-secondary py-2 px-4 flex items-center gap-2 text-brand-gold hover:text-brand-gold hover:border-brand-gold/50">
                      <FileSpreadsheet size={16} /> Edit
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea 
                  value={editForm.content}
                  onChange={e => setEditForm({...editForm, content: e.target.value})}
                  className="flex-1 w-full bg-transparent resize-none outline-none text-sm text-text-secondary leading-relaxed font-inter custom-scrollbar"
                  placeholder="Write your trade thesis, support/resistance levels, and thoughts here..."
                />
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {activeNote!.content || <span className="italic opacity-50">Empty note...</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
