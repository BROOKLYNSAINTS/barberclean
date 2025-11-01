import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBarberServices, getBarberReviews } from '@/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import DebugUser from '@/components/DebugUser';



export default function BarberServicesScreen() {
/*return (
    <View style={{ padding: 20 }}>
      <DebugUser screenName="Barber Services" />
      <Text>📋 Welcome to the Barber Services screen!</Text>
    </View>
  );  
  
  
  const { currentUser } = useAuth(); // ✅ safe only at top level of a React component*/
  const router = useRouter();
  const { barber: barberParam } = useLocalSearchParams();
  const parsedBarber = barberParam ? JSON.parse(barberParam) : null;

  const [barber, setBarber] = useState(parsedBarber);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('services');

  useEffect(() => {
    if (!parsedBarber || !parsedBarber.id) {
      setError('Barber ID is missing from route parameters.');
      setLoading(false);
      return;
    }
    console.log("🔍 Fetching services for barber ID:", parsedBarber.id, parsedBarber.name);
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const servicesData = await getBarberServices(parsedBarber.id);
        setServices(servicesData);
        console.log("📦 Services Data for Barber ID", parsedBarber.id, ":", servicesData);

        const reviewsData = await getBarberReviews(parsedBarber.id);
        setReviews(reviewsData);
        console.log("🗒️ Reviews Data for Barber ID", parsedBarber.id, ":", reviewsData);

        setBarber({
          ...parsedBarber,
          reviewCount: reviewsData.length,
        });
      } catch (err) {
        console.error('Error fetching barber data:', err);
        setError('Failed to load barber information');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  const handleSelectService = (services) => {
   // if (!currentUser) return;
    router.push({
      pathname: '/(app)/(customer)/appointment-booking',
      params: {
        barber: JSON.stringify(barber),
        service: JSON.stringify(services),
      },
    });
  };

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity style={styles.serviceCard} onPress={() => handleSelectService(item)}>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{item.name}</Text>
        {item.photo && <Image source={{ uri: item.photo }} style={styles.servicePhoto} />}
        <Text style={styles.serviceDescription}>{item.description}</Text>
      </View>
      <View style={styles.servicePriceContainer}>
        <Text style={styles.servicePrice}>${item.price.toFixed(2)}</Text>
        <Ionicons name="chevron-forward" size={24} color="#2196F3" />
      </View>
    </TouchableOpacity>
  );

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewAuthor}>{item.customerName || 'Anonymous'}</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating ? 'star' : 'star-outline'}
              size={16}
              color="#FFD700"
            />
          ))}
        </View>
        <Text style={styles.reviewDate}>
          {item.createdAt
            ? new Date(item.createdAt.seconds ? item.createdAt.toDate() : item.createdAt).toLocaleDateString()
            : 'N/A'}
        </Text>
      </View>
      <Text style={styles.reviewText}>{item.text}</Text>
    </View>
  );

  if (!barber) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.errorText}>{error || 'Barber data not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.barberHeader}>
        <View style={styles.barberImageContainer}>
          {barber.photoURL ? (
            <Image source={{ uri: barber.photoURL }} style={styles.barberImage} />
          ) : (
            <View style={styles.barberImagePlaceholder}>
              <Text style={styles.barberImagePlaceholderText}>
                {barber.name ? barber.name.charAt(0).toUpperCase() : 'B'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.barberInfo}>
          <Text style={styles.barberName}>{barber.name}</Text>
          <Text style={styles.barberAddress}>{barber.address}</Text>
          <Text style={styles.barberPhone}>{barber.phone}</Text>
          {barber.rating !== undefined && barber.rating !== null && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>{barber.rating.toFixed(1)}</Text>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.reviewCount}>({barber.reviewCount || 0} reviews)</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'services' && styles.activeTabButton]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'services' && styles.activeTabButtonText]}>Services</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'reviews' && styles.activeTabButton]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'reviews' && styles.activeTabButtonText]}>Reviews</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading barber information...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : activeTab === 'services' ? (
        services.length > 0 ? (
          <FlatList
            data={services}
            renderItem={renderServiceItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.centered}>
            <Ionicons name="cut-outline" size={64} color="#ccc" />
            <Text style={styles.noDataText}>No services available</Text>
          </View>
        )
      ) : reviews.length > 0 ? (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
          <Text style={styles.noDataText}>No reviews yet</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  barberHeader: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  barberImageContainer: { marginRight: 12 },
  barberImage: { width: 80, height: 80, borderRadius: 40 },
  barberImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barberImagePlaceholderText: { fontSize: 24, color: '#fff' },
  barberInfo: { flex: 1, justifyContent: 'center' },
  barberName: { fontSize: 18, fontWeight: 'bold' },
  barberAddress: { fontSize: 14, color: '#777' },
  barberPhone: { fontSize: 14, color: '#777' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 14, marginRight: 4 },
  reviewCount: { fontSize: 14, color: '#777', marginLeft: 4 },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  tabButton: { marginHorizontal: 16 },
  tabButtonText: { fontSize: 16, color: '#888' },
  activeTabButton: { borderBottomWidth: 2, borderBottomColor: '#2196F3' },
  activeTabButtonText: { color: '#2196F3', fontWeight: 'bold' },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  serviceDescription: { fontSize: 14, color: '#666' },
  servicePhoto: { width: '100%', height: 120, marginVertical: 8, borderRadius: 8 },
  servicePriceContainer: { flexDirection: 'row', alignItems: 'center' },
  servicePrice: { fontSize: 16, color: '#2196F3', marginRight: 8 },
  reviewCard: { padding: 16, marginHorizontal: 16, marginVertical: 8, backgroundColor: '#f2f2f2', borderRadius: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewAuthor: { fontWeight: 'bold' },
  reviewDate: { fontSize: 12, color: '#999' },
  reviewText: { fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  errorText: { color: '#f44336', fontSize: 16, marginBottom: 8 },
  retryButton: { padding: 10, backgroundColor: '#2196F3', borderRadius: 5 },
  retryButtonText: { color: '#fff' },
  loadingText: { marginTop: 12, fontSize: 16 },
  noDataText: { fontSize: 16, color: '#888', marginTop: 12 },
  listContainer: { paddingBottom: 16 },
});

