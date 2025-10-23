import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  size = 40,
  backgroundColor,
  textColor = '#FFFFFF',
}) => {
  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    
    // Generate color based on name
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Orange
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
    ];
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <Text style={[styles.initialsText, { color: textColor, fontSize: size * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontWeight: '600',
  },
});

export default Avatar;

