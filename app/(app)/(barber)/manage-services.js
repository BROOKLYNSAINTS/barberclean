import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  ScrollView, // Add this import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBarberServices, addBarberService, auth } from '@/services/firebase';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [serviceImage, setServiceImage] = useState(null); // Add image state
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      console.log('🔍 Current user:', user?.uid);
      console.log('🔍 Fetching services for barber...');
      
      const data = await getBarberServices(user.uid);
      
      console.log('🔍 Services data received:', data);
      console.log('🔍 Number of services:', data?.length);
      
      setServices(data);
    } catch (err) {
      console.error('❌ Failed to fetch services:', err);
      console.error('❌ Error details:', err.message);
      Alert.alert('Error', 'Could not load services.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (service = null) => {
    setEditingService(service);
    setServiceName(service?.name || '');
    setDuration(service?.duration?.toString() || '');
    setPrice(service?.price?.toString() || '');
    setServiceImage(service?.image || null); // Set existing image if editing
    setFormError('');
    setModalVisible(true);
  };

  // Image picker function
  const pickImage = async () => {
    try {
      // Check current permission status
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1, // Change quality to 1 for higher resolution
      });
  
      if (!result.canceled) {
        setServiceImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Remove image function
  const removeImage = () => {
    setServiceImage(null);
  };

  const handleSave = async () => {
    if (!serviceName || !duration || !price) {
      setFormError('Please fill all required fields');
      return;
    }

    const parsedDuration = parseInt(duration);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      setFormError('Duration must be a valid number');
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Price must be a valid number');
      return;
    }

    try {
      setSaving(true);
      const user = auth.currentUser;
      const serviceData = {
        name: serviceName,
        duration: parsedDuration,
        price: parsedPrice,
        image: serviceImage, // Include image in service data
      };
      await addBarberService(user.uid, serviceData);
      setModalVisible(false);
      fetchServices();
    } catch (err) {
      console.error('Failed to save service', err);
      Alert.alert('Error', 'Could not save service.');
    } finally {
      setSaving(false);
    }
  };

  const renderService = ({ item }) => (
    <View style={styles.card}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.serviceImage} />
      )}
      <View style={styles.serviceContent}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.serviceDetails}>{item.duration} min — ${item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity onPress={() => openModal(item)} style={styles.editButton}>
        <Ionicons name="create-outline" size={18} color="#007BFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
        <Text style={styles.headerTitle}>✂️ Manage Services</Text>
        <Text style={styles.headerSubtitle}>Add and edit your services</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cut-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Services Yet</Text>
          <Text style={styles.emptyText}>
            Start by adding your first service!{'\n'}
            Set your prices, duration, and service types.
          </Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={() => openModal()}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstButtonText}>Add Your First Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={services}
            keyExtractor={(item) => item.id}
            renderItem={renderService}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </Text>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <ScrollView 
              showsVerticalScrollIndicator={true} 
              style={styles.modalContent}
              contentContainerStyle={styles.scrollContent}
            >
              <TextInput
                placeholder="Service Name *"
                value={serviceName}
                onChangeText={setServiceName}
                style={styles.input}
              />
              
              <TextInput
                placeholder="Duration (min) *"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                style={styles.input}
              />
              
              <TextInput
                placeholder="Price ($) *"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              {/* DEBUG: Add this text to see if section is rendering */}
              <Text style={{ color: 'red', fontSize: 12, marginBottom: 10 }}>
                DEBUG: Image section should appear below
              </Text>

              {/* Image Section */}
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>📸 Service Image (Optional)</Text>
                
                {serviceImage ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: serviceImage }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                      <Ionicons name="close-circle" size={24} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={24} color="#666" />
                    <Text style={styles.imagePickerText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* DEBUG: Add this text at the end */}
              <Text style={{ color: 'red', fontSize: 12, marginTop: 20, marginBottom: 40 }}>
                DEBUG: End of scroll content
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.save, saving && styles.saveDisabled]}>
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Save Service'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f0f2f5' 
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 20, // Keep bottom padding
    paddingTop: 20, // Will be adjusted by the component
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  serviceContent: {
    padding: 16,
  },
  title: { 
    fontWeight: 'bold', 
    fontSize: 18,
    color: '#333',
    marginBottom: 4,
  },
  serviceDetails: {
    fontSize: 14,
    color: '#666',
  },
  editButton: { 
    position: 'absolute', 
    top: 12, 
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#007BFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addFirstButton: {
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    width: '90%',
    maxHeight: '85%', // Increase max height
    borderRadius: 12,
  },
  modalTitle: { 
    fontWeight: 'bold', 
    fontSize: 20, 
    marginBottom: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalContent: {
    maxHeight: 400, // Set a specific height for scrollable content
  },
  scrollContent: {
    paddingBottom: 20, // Add padding to the bottom of the scrollable content
  },
  imageSection: {
    marginVertical: 20,
    backgroundColor: '#f9f9f9', // Add background to make it visible
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#007BFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    minHeight: 100,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#007BFF',
    marginTop: 8,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancel: { 
    padding: 12,
    paddingHorizontal: 20,
  },
  save: { 
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007BFF', 
    borderRadius: 8,
  },
  saveDisabled: {
    backgroundColor: '#ccc',
  },
  saveText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelText: { 
    color: '#666',
    fontSize: 16,
  },
  error: { 
    color: '#f44336', 
    marginBottom: 12,
    fontSize: 14,
  },
});

export default Screen;
