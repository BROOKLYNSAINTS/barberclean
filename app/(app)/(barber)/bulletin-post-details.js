import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

const CreateBulletinPostScreen = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');

  const categories = ['General', 'Question', 'Event', 'Tip', 'Job'];

  const handlePost = () => {
    if (!title.trim() || !content.trim()) return;
    console.log('Posted:', { title, content, category });
    router.back();
  };

  const handleCancel = () => router.back();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, justifyContent: 'space-between', minHeight: 500 }}>
            <View>
              {/* Action buttons at the top */}
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleCancel} style={styles.actionButton}>
                  <Text style={styles.actionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePost} style={styles.postButton}>
                  <Text style={styles.postText}>Post</Text>
                </TouchableOpacity>
              </View>

              {/* Title and content input */}
              <TextInput
                style={styles.input}
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[styles.input, { height: 120 }]}
                placeholder="What's on your mind?"
                value={content}
                onChangeText={setContent}
                multiline
              />
            </View>

            {/* Category selection always at the bottom */}
            <View style={styles.categorySection}>
              <Text style={styles.categoryLabel}>Select Category</Text>
              <View style={styles.categoryRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[styles.categoryButton, category === cat && styles.selectedCategory]}
                  >
                    <Text style={[styles.categoryText, category === cat && { color: '#fff' }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    padding: 10,
  },
  actionText: {
    color: '#007BFF',
    fontSize: 16,
  },
  postButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  postText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  categorySection: {
    marginTop: 40,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eee',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedCategory: {
    backgroundColor: '#007BFF',
  },
  categoryText: {
    color: '#000',
  },
});

export default CreateBulletinPostScreen;
