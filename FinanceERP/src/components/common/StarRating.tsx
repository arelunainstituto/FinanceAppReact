import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating?: number; // Current rating (1-5)
  onRatingChange?: (rating: number) => void; // Callback when rating changes
  size?: number; // Size of the stars
  editable?: boolean; // Whether the rating can be edited
  color?: string; // Color of filled stars
  emptyColor?: string; // Color of empty stars
}

const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  onRatingChange,
  size = 20,
  editable = true,
  color = '#FDB022',
  emptyColor = '#E2E8F0',
}) => {
  const [hoverRating, setHoverRating] = useState<number>(0);

  const handleStarPress = (starIndex: number) => {
    if (editable && onRatingChange) {
      onRatingChange(starIndex);
    }
  };

  const handleStarHoverIn = (starIndex: number) => {
    if (editable) {
      setHoverRating(starIndex);
    }
  };

  const handleStarHoverOut = () => {
    if (editable) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= displayRating;
        
        return (
          <TouchableOpacity
            key={starIndex}
            onPress={() => handleStarPress(starIndex)}
            onMouseEnter={() => handleStarHoverIn(starIndex)}
            onMouseLeave={handleStarHoverOut}
            disabled={!editable}
            style={styles.starButton}
            activeOpacity={editable ? 0.7 : 1}
          >
            <Ionicons
              name={isFilled ? 'star' : 'star-outline'}
              size={size}
              color={isFilled ? color : emptyColor}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
});

export default StarRating;

