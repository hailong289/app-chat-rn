import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image } from 'react-native';

type TypingUser = {
  userId: string;
  fullname: string;
  avatar?: string;
};

type TypingIndicatorProps = {
  users: TypingUser[];
  currentUserId?: string;
};

function DotBounce({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: -6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(300),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY: anim }] }]}
    />
  );
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  currentUserId,
}) => {
  const filteredUsers = users.filter(
    (u) => u.userId !== currentUserId && u.fullname?.trim(),
  );

  if (filteredUsers.length === 0) return null;

  let typingText = '';
  if (filteredUsers.length > 2) {
    typingText = 'Nhiều người đang nhập...';
  } else if (filteredUsers.length === 2) {
    typingText = `${filteredUsers[0].fullname} và ${filteredUsers[1].fullname} đang nhập`;
  } else {
    typingText = `${filteredUsers[0].fullname} đang nhập`;
  }

  return (
    <View style={styles.container}>
      {/* Avatars */}
      <View style={styles.avatarRow}>
        {filteredUsers.slice(0, 3).map((u) =>
          u.avatar ? (
            <Image
              key={u.userId}
              source={{ uri: u.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View key={u.userId} style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {u.fullname?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
          ),
        )}
      </View>

      {/* Bubble with dots */}
      <View style={styles.bubble}>
        <DotBounce delay={0} />
        <DotBounce delay={150} />
        <DotBounce delay={300} />
      </View>

      {/* Text label */}
      <Text style={styles.text} numberOfLines={1}>
        {typingText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: -6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  avatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    marginLeft: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
  },
  text: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
    maxWidth: 140,
  },
});

export default TypingIndicator;
