import { useState } from 'react';
import { Smile } from 'lucide-react';

const EMOJIS = ['❤️', '🔥', '👏', '😍', '😂', '✨', '🙌', '🎨', '💯', '🙏', '😊', '🤝'];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      {open && (
        <div
          className="absolute bottom-11 right-0 z-20 grid grid-cols-6 gap-0.5 w-56 rounded-lg border border-border bg-card p-1.5 shadow-xl"
          role="listbox"
          aria-label="Choose an emoji"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted transition-colors text-lg"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              aria-label={`Add ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((visible) => !visible)}
        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        aria-label="Add an emoji"
        aria-expanded={open}
      >
        <Smile className="h-4 w-4" />
      </button>
    </div>
  );
}