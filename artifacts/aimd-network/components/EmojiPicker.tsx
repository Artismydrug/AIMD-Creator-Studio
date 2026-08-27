import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const EMOJIS = ['❤️', '🔥', '👏', '😍', '😂', '✨', '🙌', '🎨', '💯', '🙏', '😊', '🤝'];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      {open ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.foreground,
            },
          ]}
        >
          {EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`Add ${emoji}`}
              onPress={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              style={styles.emojiButton}
              testID={`emoji-${emoji.codePointAt(0)}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add an emoji"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((visible) => !visible)}
        style={styles.toggle}
        testID="open-emoji-picker"
      >
        <Feather name="smile" size={19} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 2,
  },
  panel: {
    position: 'absolute',
    bottom: 42,
    right: 0,
    width: 224,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    borderWidth: 1,
    borderRadius: 10,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  emojiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 35,
    height: 35,
  },
  emoji: {
    fontSize: 21,
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 40,
  },
});