import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal,
  Alert, KeyboardAvoidingView, Platform, Keyboard,
  TouchableWithoutFeedback, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getBulletinPosts,
  createBulletinPost,
  auth,
  getUserProfile,
  addCommentToPost,
} from '@/services/firebase';
import { getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // Add this import

function BulletinPost({ item, commentValue, onCommentChange, onCommentSend }) {
  const [comments, setComments] = React.useState([]);
  const [loadingComments, setLoadingComments] = React.useState(true);

  React.useEffect(() => {
    const fetchComments = async () => {
      try {
        const q = query(collection(db, 'bulletins', item.id, 'comments'), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        const commentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setComments(commentData);
      } catch (err) {
        console.error('Error loading comments:', err);
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [item.id]);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.postMeta}>By {item.authorName} • {new Date(item.createdAt).toLocaleDateString()}</Text>
      <ScrollView style={styles.postScroll}>
        <Text style={styles.postContent}>{item.content}</Text>
      </ScrollView>
      
      {loadingComments ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007BFF" />
          <Text style={styles.loadingText}>Loading comments...</Text>
        </View>
      ) : comments.length > 0 ? (
        <View style={styles.commentSection}>
          <Text style={styles.commentSectionTitle}>💬 Comments ({comments.length})</Text>
          {comments.map((comment) => {
            // Handle different comment data structures
            const isMap =
              comment.text &&
              typeof comment.text === 'object' &&
              comment.text.text !== undefined &&
              comment.text.authorName !== undefined &&
              comment.text.createdAt !== undefined;

            const authorName = isMap
              ? comment.text.authorName || 'Unknown'
              : comment.authorName || 'Unknown';

            const text = isMap
              ? comment.text.text
              : typeof comment.text === 'string'
                ? comment.text
                : '';

            const createdAt = isMap
              ? comment.text.createdAt
              : comment.createdAt;

            return (
              <View key={comment.id} style={styles.commentContainer}>
                <Text style={styles.commentAuthor}>{authorName}</Text>
                <Text style={styles.commentText}>{text}</Text>
                <Text style={styles.commentTimestamp}>
                  {createdAt ? new Date(createdAt).toLocaleString() : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noComments}>💭 No comments yet. Be the first to comment!</Text>
      )}
      
      <View style={styles.commentBox}>
        <TextInput
          placeholder="Add a comment..."
          value={commentValue}
          onChangeText={onCommentChange}
          style={styles.commentInput}
          multiline
        />
        <TouchableOpacity onPress={onCommentSend} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BarberBulletinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Add this hook
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const categories = [
    { id: 'general', name: 'General', icon: '💬' },
    { id: 'question', name: 'Question', icon: '❓' },
    { id: 'event', name: 'Event', icon: '📅' },
    { id: 'tip', name: 'Tip', icon: '💡' },
    { id: 'job', name: 'Job', icon: '💼' },
  ];

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      const profileData = await getUserProfile(user.uid);
      const postData = await getBulletinPosts();
      postData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setProfile(profileData);
      setPosts(postData);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch bulletin posts.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => {
    fetchPosts();
  }, [fetchPosts]));

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing Info', 'Please enter both a title and content.');
      return;
    }

    try {
      setPosting(true);
      const user = auth.currentUser;
      await createBulletinPost({
        title,
        content,
        category,
        authorId: user.uid,
        authorName: profile?.name || 'Unknown',
        createdAt: new Date().toISOString(),
      });
      setTitle('');
      setContent('');
      setCategory('general');
      setModalVisible(false);
      fetchPosts();
      Alert.alert('Success', 'Post created successfully!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  const handleComment = async (postId) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      const user = auth.currentUser;
      const userProfile = await getUserProfile(user.uid);
      await addCommentToPost(postId, {
        text,
        authorId: user.uid,
        authorName: userProfile?.name || 'Unknown',
        createdAt: new Date().toISOString(),
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to post comment.');
    }
  };

  const renderPost = ({ item }) => (
    <BulletinPost
      item={item}
      commentValue={commentInputs[item.id] || ''}
      onCommentChange={(text) => setCommentInputs((prev) => ({ ...prev, [item.id]: text }))}
      onCommentSend={() => handleComment(item.id)}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading bulletin posts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
          <Text style={styles.headerTitle}>📢 Barber Bulletin</Text>
          <Text style={styles.headerSubtitle}>Connect with fellow barbers</Text>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>Be the first to start a conversation!</Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            {/* Touchable area only on the overlay background so inputs can receive touches */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
              style={styles.modalContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  <View style={[styles.modal, { marginBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}> 
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>✍️ Create New Post</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    placeholder="What's the title of your post?"
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                  />
                  <TextInput
                    placeholder="Share your thoughts, tips, or questions..."
                    style={[styles.input, styles.contentInput]}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                  />

                  <Text style={styles.categoryLabel}>Choose a category:</Text>
                  <View style={styles.categoryRow}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.category,
                          category === cat.id && styles.categorySelected,
                        ]}
                        onPress={() => setCategory(cat.id)}
                      >
                        <Text style={styles.categoryIcon}>{cat.icon}</Text>
                        <Text
                          style={[
                            styles.categoryText,
                            category === cat.id && styles.categoryTextSelected,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.postButton, posting && styles.postButtonDisabled]}
                    onPress={handlePost}
                    disabled={posting}
                  >
                    <Text style={styles.postButtonText}>
                      {posting ? 'Posting...' : 'Post to Bulletin'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f0f2f5' 
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
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
  list: { 
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postTitle: { 
    fontWeight: 'bold', 
    fontSize: 18, 
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  postMeta: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 12,
  },
  postScroll: {
    maxHeight: 120,
    marginBottom: 16,
  },
  postContent: { 
    fontSize: 14, 
    color: '#333',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: { 
    fontSize: 12, 
    color: '#666',
    marginLeft: 8,
  },
  noComments: { 
    fontSize: 12, 
    color: '#999',
    textAlign: 'center',
    paddingVertical: 8,
  },
  commentSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  commentSection: { 
    marginTop: 8, 
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentContainer: {
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  commentAuthor: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#007BFF',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  commentTimestamp: {
    fontSize: 10,
    color: '#888',
  },
  commentBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#007BFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#007BFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    fontSize: 16,
  },
  contentInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  category: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySelected: {
    backgroundColor: '#007BFF',
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryTextSelected: {
    color: '#fff',
  },
  postButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
