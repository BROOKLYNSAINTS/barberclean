// src/components/LoadingOverlay.js

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const LoadingOverlay = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // transparent dark background
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  },
});

export default LoadingOverlay;
