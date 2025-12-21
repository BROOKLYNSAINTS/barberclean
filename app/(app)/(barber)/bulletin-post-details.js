// app/(app)/(barber)/create-bulletin-post.js
import React, { useState, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, getUserProfile, createBulletinPost } from '@/services/firebase';

const CreateBulletinPostScreen = () => {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');

  const contentRef = useRef(null);

  const categories = ['General', 'Question', 'Event', 'Tip', 'Job'];

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing Info', 'Please enter both a title and content.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user?.uid) {
        Alert.alert('Not logged in', 'You must be logged in to post.');
        return;
      }

      const profile = await getUserProfile(user.uid);

      await createBulletinPost({
        title: title.trim(),
        content: content.trim(),
        category: category.toLowerCase(),
        authorId: user.uid,
        authorName: profile?.name || 'Unknown',
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Your bulletin post has been published.');
      router.back();
    } catch (err) {
      console.error('Error creating bulletin post:', err);
      Alert.alert('Error', err?.message || 'Failed to publish your post. Please try again.');
    }
  };

  const handleCancel = () => router.back();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleCancel} style={styles.actionButton}>
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePost} style={styles.postButton}>
              <Text style={styles.postText}>Post</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => contentRef.current?.focus()}
          />

          <TextInput
            ref={contentRef}
            style={[styles.input, styles.contentInput]}
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.categorySection}>
            <Text style={styles.categoryLabel}>Select Category</Text>
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.categoryButton, category === cat && styles.selectedCategory]}
                >
                  <Text style={[styles.categoryText, category === cat && styles.selectedCategoryText]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handlePost} style={[styles.postButton, styles.bottomPostButton]}>
              <Text style={styles.postText}>Post</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, flexGrow: 1, backgroundColor: '#fff' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionButton: { padding: 10 },
  actionText: { color: '#007BFF', fontSize: 16 },

  postButton: { backgroundColor: '#007BFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  bottomPostButton: { alignSelf: 'flex-end', marginTop: 8 },
  postText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, backgroundColor: '#f9f9f9' },
  contentInput: { height: 180 },

  categorySection: { marginTop: 8 },
  categoryLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  categoryButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#eee', marginRight: 10, marginBottom: 10 },
  selectedCategory: { backgroundColor: '#007BFF' },
  categoryText: { color: '#000' },
  selectedCategoryText: { color: '#fff' },
});

export default CreateBulletinPostScreen;
