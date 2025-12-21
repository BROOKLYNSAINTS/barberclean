import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

export default function BuildFooter() {
  const fingerprint =
    Constants.expoConfig?.extra?.buildFingerprint ||
    Constants.manifest2?.extra?.buildFingerprint ||
    'UNKNOWN-BUILD';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Build: {fingerprint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
  },
  text: {
    fontSize: 11,
    color: '#999',
  },
});
