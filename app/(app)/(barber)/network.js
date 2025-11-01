import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile, auth, getBarbersByZipcode } from '@/services/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import theme from '@/styles/theme';
import { ScreenContainer, ScreenHeader } from '@/components/LayoutComponents';
import { Button, Card, EmptyState } from '@/components/UIComponents';
import { startOrGetChatThread } from '@/services/chatService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BarberNetworkScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [barbers, setBarbers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [zipcode, setZipcode] = useState('');
  const [searchZipcode, setSearchZipcode] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/(auth)/login');
        setLoading(false);
        return;
      }
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      if (userProfile && userProfile.zipcode) {
        setZipcode(userProfile.zipcode);
        setSearchZipcode(userProfile.zipcode);
        await fetchBarbersByZip(userProfile.zipcode, user.uid);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to load initial data. Please try again.');
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { fetchInitialData(); }, [fetchInitialData]));

  const fetchBarbersByZip = async (zip, currentUserId) => {
    try {
      if (!refreshing) setLoading(true);
      setError('');
      const barbersData = await getBarbersByZipcode(zip);
      const filteredBarbers = barbersData.filter(barber => barber.id !== currentUserId);
      setBarbers(filteredBarbers);
    } catch (err) {
      console.error('Error fetching barbers:', err);
      setError(`Failed to load barbers for zipcode ${zip}.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearching(false);
    }
  };

  const handleRefresh = () => {
    if (!searchZipcode) return;
    setRefreshing(true);
    const user = auth.currentUser;
    if (user) {
      fetchBarbersByZip(searchZipcode, user.uid);
    }
  };

  const handleSearch = () => {
    if (!zipcode.trim() || zipcode.length !== 5 || !/^[0-9]{5}$/.test(zipcode)) {
      Alert.alert('Invalid Zipcode', 'Please enter a valid 5-digit zipcode.');
      return;
    }
    setSearching(true);
    setSearchZipcode(zipcode);
    const user = auth.currentUser;
    if (user) {
      fetchBarbersByZip(zipcode, user.uid);
    }
  };

  const handleMessageBarber = async (barber) => {
    console.log('Message button pressed for barber:', barber.name);
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId || !barber.id) {
        Alert.alert('Missing Info', 'Unable to identify both users for chat.');
        return;
      }

      const threadId = await startOrGetChatThread(currentUserId, barber.id);
      let cleanThreadId = '';

      if (typeof threadId === 'string') {
        cleanThreadId = threadId;
        console.log("✅ this is a string:", threadId, "Type:", typeof threadId);
      } else if (threadId && typeof threadId.threadId === 'string') {
        cleanThreadId = threadId.threadId;
        console.log("✅ threadId.threadId:", threadId.threadId, "Type:", typeof threadId.threadId);
      }

      console.log('✅ Final threadId for chat navigation:', cleanThreadId);

      if (!cleanThreadId) {
        Alert.alert("Chat Error", "No valid chat ID returned. Please try again.");
        return;
      }

      router.push({
        pathname: '/(app)/(barber)/chat',
        params: { threadId: cleanThreadId },
      });
    } catch (err) {
      console.error('Failed to initiate chat:', err);
      Alert.alert('Error', 'Could not start chat. Please try again later.');
    }
  };

  const renderBarberItem = ({ item }) => (
    <Card style={styles.barberCard}>
      <View style={styles.barberInfo}>
        <Text style={styles.barberName}>{item.name || 'Barber Name Unavailable'}</Text>
        <Text style={styles.barberShop}>{item.shopName || 'Independent Barber'}</Text>
        <View style={styles.barberDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.zipcode}</Text>
          </View>
          {item.specialties?.length > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="cut-outline" size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
              <Text style={styles.detailText} numberOfLines={1}>{item.specialties.join(', ')}</Text>
            </View>
          )}
          {item.yearsExperience !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
              <Text style={styles.detailText}>{item.yearsExperience} years experience</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.barberActions}>
        <TouchableOpacity onPress={() => handleMessageBarber(item)} style={styles.messageButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(app)/(barber)/view-barber-profile', params: { barberId: item.id } })}
          style={styles.viewProfileButton}
        >
          <Text style={styles.viewProfileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centeredStatus}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Finding barbers in your area...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
        <Text style={styles.headerTitle}>🌐 Barber Network</Text>
        <Text style={styles.headerSubtitle}>Connect with barbers in your area</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={zipcode}
            onChangeText={setZipcode}
            placeholder="Enter 5-digit zipcode"
            placeholderTextColor={theme.colors.textPlaceholder}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <Button
          title={searching ? '' : "Search"}
          onPress={handleSearch}
          disabled={searching}
          style={styles.searchButton}
          icon={searching ? <ActivityIndicator size="small" color={theme.colors.white} /> : null}
        />
      </View>

      {error && !loading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={barbers}
        renderItem={renderBarberItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  centeredStatus: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  searchContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', alignItems: 'center' },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, paddingHorizontal: 12, marginRight: 12, height: 44, borderWidth: 1, borderColor: '#e9ecef' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: '#333' },
  searchButton: { paddingHorizontal: 20, height: 44, backgroundColor: '#007BFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#f8d7da', marginHorizontal: 16, marginTop: 8, borderRadius: 8, borderColor: '#f5c6cb', borderWidth: 1 },
  errorText: { color: '#721c24', fontSize: 14, marginLeft: 8, textAlign: 'center' },
  listContainer: { padding: 16, paddingBottom: 100 },
  barberCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  barberInfo: { marginBottom: 16 },
  barberName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  barberShop: { fontSize: 14, color: '#666', marginBottom: 12 },
  barberDetails: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailIcon: { marginRight: 8 },
  detailText: { fontSize: 14, color: '#666', flexShrink: 1 },
  barberActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  messageButton: { flex: 1, marginRight: 6, backgroundColor: '#007BFF', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  messageButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  viewProfileButton: { flex: 1, marginLeft: 6, borderWidth: 1, borderColor: '#007BFF', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  viewProfileButtonText: { color: '#007BFF', fontWeight: 'bold' },
});

export default BarberNetworkScreen;
