import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export default function Waveform({ isListening }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef(null);

  useEffect(() => {
    if (isListening) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animationRef.current.start();
    } else {
      scaleAnim.setValue(1);
      animationRef.current?.stop();
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [isListening]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          { transform: [{ scale: scaleAnim }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4caf50',
  },
});
