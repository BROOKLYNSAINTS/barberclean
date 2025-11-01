import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateHairStyleRecommendation } from '@/services/openai'; // Adjusted path
import { useRouter } from 'expo-router';

const HairStyleRecommendationScreen = () => {
  const router = useRouter();

  const [preferences, setPreferences] = useState({
    faceShape: '',
    hairType: '',
    hairLength: '',
    stylePreference: '',
    maintenanceLevel: '',
  });
  
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const faceShapeOptions = ['Round', 'Oval', 'Square', 'Heart', 'Diamond', 'Oblong'];
  const hairTypeOptions = ['Straight', 'Wavy', 'Curly', 'Coily', 'Thin', 'Thick'];
  const hairLengthOptions = ['Short', 'Medium', 'Long'];
  const stylePreferenceOptions = ['Classic', 'Modern', 'Trendy', 'Professional', 'Casual'];
  const maintenanceLevelOptions = ['Low', 'Medium', 'High'];

  const handleOptionSelect = (category, value) => {
    setPreferences(prev => ({ ...prev, [category]: value }));
  };

  const handleGetRecommendation = async () => {
    const selectedCount = Object.values(preferences).filter(val => val !== '').length;
    if (selectedCount < 3) {
      setError('Please select at least 3 preferences for a better recommendation');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await generateHairStyleRecommendation(preferences);
      if (result.success) {
        setRecommendation(result.recommendation);
      } else {
        setError('Failed to generate recommendation. Please try again.');
      }
    } catch (err) {
      console.error('Error getting hair style recommendation:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreferences({
      faceShape: '',
      hairType: '',
      hairLength: '',
      stylePreference: '',
      maintenanceLevel: '',
    });
    setRecommendation(null);
    setError('');
  };

  const renderOptionButtons = (category, options) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsContainer}>
      {options.map(option => (
        <TouchableOpacity
          key={option}
          style={[styles.optionButton, preferences[category] === option && styles.selectedOption]}
          onPress={() => handleOptionSelect(category, option)}
        >
          <Text style={[styles.optionText, preferences[category] === option && styles.selectedOptionText]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hair Style Recommendation</Text>
        <Text style={styles.subtitle}>Tell us about your preferences and we'll suggest the perfect haircut for you</Text>
      </View>

      {!recommendation ? (
        <View style={styles.preferencesContainer}>
          <View style={styles.preferenceSection}><Text style={styles.preferenceTitle}>Face Shape</Text>{renderOptionButtons('faceShape', faceShapeOptions)}</View>
          <View style={styles.preferenceSection}><Text style={styles.preferenceTitle}>Hair Type</Text>{renderOptionButtons('hairType', hairTypeOptions)}</View>
          <View style={styles.preferenceSection}><Text style={styles.preferenceTitle}>Hair Length</Text>{renderOptionButtons('hairLength', hairLengthOptions)}</View>
          <View style={styles.preferenceSection}><Text style={styles.preferenceTitle}>Style Preference</Text>{renderOptionButtons('stylePreference', stylePreferenceOptions)}</View>
          <View style={styles.preferenceSection}><Text style={styles.preferenceTitle}>Maintenance Level</Text>{renderOptionButtons('maintenanceLevel', maintenanceLevelOptions)}</View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.getRecommendationButton} onPress={handleGetRecommendation} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.getRecommendationButtonText}>Get Recommendation</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.recommendationContainer}>
          <View style={styles.recommendationHeader}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.recommendationTitle}>Your Perfect Haircut</Text>
          </View>
          <View style={styles.selectedPreferences}>
            {Object.entries(preferences).map(([key, value]) => (
              value ? <View key={key} style={styles.preferenceBadge}><Text style={styles.preferenceBadgeText}>{`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`}</Text></View> : null
            ))}
          </View>
          <Text style={styles.recommendationText}>{recommendation}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}><Text style={styles.resetButtonText}>Try Different Preferences</Text></TouchableOpacity>
            <TouchableOpacity style={styles.bookButton} onPress={() => router.push('/(app)/(customer)/barber-selection')}><Text style={styles.bookButtonText}>Book Appointment</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  preferencesContainer: {
    padding: 16,
  },
  preferenceSection: {
    marginBottom: 15,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  optionsContainer: {
    paddingVertical: 5,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  optionText: {
    color: '#333',
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  getRecommendationButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  getRecommendationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recommendationContainer: {
    padding: 20,
    alignItems: 'center',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  selectedPreferences: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 15,
  },
  preferenceBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    margin: 5,
  },
  preferenceBadgeText: {
    fontSize: 12,
    color: '#424242',
  },
  recommendationText: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 10, // Added padding for better readability
    backgroundColor: '#f9f9f9', // Added background for emphasis
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: '#757575',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1, // Added flex for equal width
    marginRight: 5, // Added margin
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1, // Added flex for equal width
    marginLeft: 5, // Added margin
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default HairStyleRecommendationScreen;
