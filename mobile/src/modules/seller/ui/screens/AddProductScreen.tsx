import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Font, Spacing, Radius } from '@/shared/utils/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import productsApi from '../../api/products.api';

type Props = NativeStackScreenProps<AppStackParamList, 'AddProduct'>;

const { width } = Dimensions.get('window');

const CATEGORIES = ['Bakery', 'Pastry & Cakes', 'Breads & Buns', 'Flour & Mixes', 'Snacks', 'Desserts'];

export default function AddProductScreen({ navigation, route }: Props) {
  const productToEdit = route.params?.product;
  const isEditing = !!productToEdit;

  // Form states
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [isGlutenFree, setIsGlutenFree] = useState(true);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [price, setPrice] = useState('');

  const [nameError, setNameError] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setProductName(productToEdit.name || '');
      setCategory(productToEdit.category || '');
      setPrice(productToEdit.price?.toString() || '');
      setIsGlutenFree(productToEdit.isGlutenFree !== false);
      const img = productToEdit.images?.[0] || productToEdit.image || null;
      if (img && img.startsWith('blob:')) {
        switch (productToEdit.category) {
          case 'Bakery':
            setProductImage('https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400');
            break;
          case 'Pastry & Cakes':
            setProductImage('https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400');
            break;
          case 'Breads & Buns':
            setProductImage('https://images.unsplash.com/photo-1586444248902-2f64eddc13df?q=80&w=400');
            break;
          case 'Flour & Mixes':
            setProductImage('https://images.unsplash.com/photo-1574085733277-851d9d856a3a?q=80&w=400');
            break;
          case 'Snacks':
            setProductImage('https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=400');
            break;
          case 'Desserts':
            setProductImage('https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=400');
            break;
          default:
            setProductImage('https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400');
        }
      } else {
        setProductImage(img);
      }
      setIngredients(productToEdit.ingredients ? productToEdit.ingredients.join(', ') : '');
    }
  }, [productToEdit]);

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("You've refused to allow this app to access your photos!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6, // Optimize quality slightly for storage inside MongoDB
      base64: true, // Convert picked file to raw base64 string
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        // Construct persistent base64 data URL
        const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
        setProductImage(dataUrl);
      } else {
        setProductImage(asset.uri);
      }
    }
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      setNameError(true);
      return;
    }
    if (!category) {
      alert('Please select a category');
      return;
    }
    if (!price || isNaN(Number(price))) {
      alert('Please enter a valid price');
      return;
    }

    setNameError(false);
    setIsSubmitting(true);

    try {
      const ingredientsArray = ingredients
        ? ingredients.split(',').map((i) => i.trim()).filter(Boolean)
        : [];
      
      const imagesArray = productImage ? [productImage] : [];

      const dto = {
        name: productName.trim(),
        category,
        price: Number(price),
        isGlutenFree,
        certifiedGF: isGlutenFree,
        ingredients: ingredientsArray,
        images: imagesArray,
      };

      if (isEditing && productToEdit?._id) {
        await productsApi.update(productToEdit._id, dto);
      } else {
        await productsApi.create(dto);
      }

      setSuccessModalVisible(true);

      setTimeout(() => {
        setSuccessModalVisible(false);
        navigation.navigate('SellerProfile');
      }, 1800);
    } catch (err: any) {
      console.error('Error saving product:', err);
      alert(err?.response?.data?.message || 'Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    const performDelete = async () => {
      try {
        if (productToEdit?._id) {
          await productsApi.remove(productToEdit._id);
          alert('Product deleted successfully');
          navigation.navigate('SellerProfile');
        }
      } catch (err: any) {
        console.error('Error deleting product:', err);
        alert(err?.response?.data?.message || 'Failed to delete product.');
      }
    };

    // Use Alert.alert cross-platform with fallback for web
    if (typeof window !== 'undefined' || typeof Alert === 'undefined') {
      if (confirm('Are you sure you want to delete this product from your menu?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Product',
        'Are you sure you want to delete this product from your menu?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/* Success Success Overlay */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.successCircle}>
              <Feather name="check" size={32} color={Colors.white} />
            </View>
            <Text style={s.modalTitle}>Success!</Text>
            <Text style={s.modalSub}>"{productName}" has been successfully {isEditing ? 'updated' : 'added to your bakery menu'}.</Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Unified Yassmine Top User Header ────────────────────────────── */}
        <View style={s.topHeader}>
          <View style={s.userRow}>
            <View style={s.avatarContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150' }}
                style={s.avatarImage}
              />
              <View style={s.verifiedBadge}>
                <Feather name="check" size={8} color={Colors.white} />
              </View>
            </View>
            <Text style={s.greeting}>Yassmine</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <Feather name="search" size={18} color="#393C40" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <Feather name="bell" size={18} color="#393C40" />
              <View style={s.notifIndicator} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. Back Navigation Header ─────────────────────────────────────── */}
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} id="add-product-back">
            <Feather name="arrow-left" size={20} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={s.navTitle}>{isEditing ? 'Edit product' : 'Add a product'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Product Image Upload ───────────────────────────────────────────── */}
        <Text style={s.label}>Product Image</Text>
        <TouchableOpacity
          style={[s.imageUploadContainer, productImage ? s.imageUploadedBorder : null]}
          activeOpacity={0.8}
          onPress={handleImagePick}
          id="btn-upload-image"
        >
          {productImage ? (
            <View style={s.imagePreviewWrapper}>
              <Image source={{ uri: productImage }} style={s.imagePreview} />
              <View style={s.changePhotoBadge}>
                <Feather name="camera" size={12} color={Colors.white} />
                <Text style={s.changePhotoText}>Change</Text>
              </View>
            </View>
          ) : (
            <View style={s.uploadInner}>
              <View style={s.uploadIconBox}>
                <Feather name="image" size={24} color="rgba(46, 46, 46, 0.4)" />
              </View>
              <Text style={s.uploadText}>Tap to upload photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Product Name Input ────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Product Name</Text>
          <TextInput
            style={[s.input, nameError ? s.inputError : null]}
            placeholder="e.g. Almond Croissant"
            placeholderTextColor="rgba(46, 46, 46, 0.3)"
            value={productName}
            onChangeText={(txt) => {
              setProductName(txt);
              if (txt.trim()) setNameError(false);
            }}
            id="input-product-name"
          />
          {nameError && <Text style={s.errorText}>Please enter a product name</Text>}
        </View>

        {/* ── Category Dropdown ──────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Category</Text>
          <TouchableOpacity
            style={s.selectTrigger}
            activeOpacity={0.85}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            id="btn-category-select"
          >
            <Text style={[s.selectText, !category ? s.placeholderText : null]}>
              {category || 'Select category'}
            </Text>
            <Feather
              name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="rgba(46, 46, 46, 0.4)"
            />
          </TouchableOpacity>

          {showCategoryDropdown && (
            <View style={s.dropdownList}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.dropdownItem, category === cat ? s.dropdownItemSelected : null]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={[s.dropdownItemText, category === cat ? s.dropdownItemTextSelected : null]}>
                    {cat}
                  </Text>
                  {category === cat && <Feather name="check" size={14} color={Colors.green} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Certified Gluten-Free Card ─────────────────────────────────────── */}
        <View style={s.toggleCard}>
          <View style={s.toggleIconBox}>
            <MaterialCommunityIcons name="shield-check" size={20} color={Colors.white} />
          </View>
          <View style={s.toggleTexts}>
            <Text style={s.toggleTitle}>Certified gluten-free</Text>
            <Text style={s.toggleSub}>Has official certification</Text>
          </View>
          <Switch
            value={isGlutenFree}
            onValueChange={setIsGlutenFree}
            trackColor={{ false: '#E0E0E0', true: '#C8102E' }}
            thumbColor={Colors.white}
            ios_backgroundColor="#E0E0E0"
            id="switch-gluten-free"
          />
        </View>

        {/* ── Description Input ──────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Describe the product..."
            placeholderTextColor="rgba(46, 46, 46, 0.3)"
            multiline={true}
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            id="input-description"
          />
        </View>

        {/* ── Ingredients (Optional) Input ───────────────────────────────────── */}
        <View style={s.inputGroup}>
          <View style={s.rowLabel}>
            <Text style={s.label}>Ingredients</Text>
            <Text style={s.optionalSub}>(Optional)</Text>
          </View>
          <TextInput
            style={s.input}
            placeholder="e.g. Almond flour, eggs, sugar..."
            placeholderTextColor="rgba(46, 46, 46, 0.3)"
            value={ingredients}
            onChangeText={setIngredients}
            id="input-ingredients"
          />
        </View>

        {/* ── Price Input ────────────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Price (TND)</Text>
          <TextInput
            style={[s.input, s.priceInput]}
            placeholder="e.g. 15.00"
            placeholderTextColor="rgba(46, 46, 46, 0.3)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            id="input-price"
          />
        </View>

        {/* ── Submit Product Action Button ───────────────────────────────────── */}
        <TouchableOpacity
          style={[s.submitBtn, isSubmitting ? { opacity: 0.7 } : null]}
          disabled={isSubmitting}
          activeOpacity={0.88}
          onPress={handleSubmit}
          id="btn-submit-product"
        >
          <Text style={s.submitBtnText}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit Product'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={s.deleteBtn}
            activeOpacity={0.8}
            onPress={handleDelete}
            id="btn-delete-product"
          >
            <Feather name="trash-2" size={16} color={Colors.error} />
            <Text style={s.deleteBtnText}>Delete Product from Menu</Text>
          </TouchableOpacity>
        )}

        {/* Prevent tab overlap */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Home')} id="nav-home">
          <Feather name="home" size={22} color={Colors.dark} />
          <Text style={s.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navBtn} activeOpacity={0.7} id="nav-events">
          <Feather name="calendar" size={22} color={Colors.dark} />
          <Text style={s.navLabel}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.fab} activeOpacity={0.8} id="nav-fab">
          <View style={s.scannerGrid}>
            <View style={s.scannerBracket} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.navBtn} activeOpacity={0.7} id="nav-reels">
          <MaterialCommunityIcons name="movie-play-outline" size={24} color={Colors.dark} />
          <Text style={s.navLabel}>Reels</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navBtn} activeOpacity={0.7} onPress={() => navigation.navigate('SellerProfile')} id="nav-profile">
          <Feather name="user" size={22} color={Colors.dark} />
          <Text style={s.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 16 },

  // Unified Top Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  greeting: {
    fontSize: 18,
    fontWeight: Font.medium,
    color: '#343831',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },

  // Back Navigation Row
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: Font.medium,
    color: Colors.dark,
    marginRight: 18,
  },

  // Image Upload Container
  imageUploadContainer: {
    width: '100%',
    height: 160,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: 'rgba(46, 46, 46, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  imageUploadedBorder: {
    borderStyle: 'solid',
    borderColor: 'rgba(139, 195, 74, 0.4)',
    backgroundColor: Colors.white,
  },
  uploadInner: {
    alignItems: 'center',
  },
  uploadIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 11.9,
    fontWeight: Font.medium,
    color: 'rgba(46, 46, 46, 0.4)',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  changePhotoText: {
    fontSize: 9.5,
    fontWeight: Font.bold,
    color: Colors.white,
  },

  // Inputs & Labels
  label: {
    fontSize: 11.9,
    fontWeight: Font.bold,
    color: Colors.dark,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionalSub: {
    fontSize: 10.2,
    fontWeight: Font.regular,
    color: 'rgba(46, 46, 46, 0.5)',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 55.56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(46, 46, 46, 0.2)',
    paddingHorizontal: 17,
    fontSize: 16,
    color: Colors.dark,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(229, 57, 53, 0.02)',
  },
  errorText: {
    fontSize: 10.5,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    height: 103.56,
    paddingTop: 15,
    textAlignVertical: 'top',
  },

  // Dropdown Select Category
  selectTrigger: {
    width: '100%',
    height: 55.56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(46, 46, 46, 0.2)',
    paddingHorizontal: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: Colors.dark,
  },
  placeholderText: {
    color: 'rgba(46, 46, 46, 0.3)',
  },
  dropdownList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(46, 46, 46, 0.1)',
    marginTop: 6,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(139, 195, 74, 0.06)',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.dark,
  },
  dropdownItemTextSelected: {
    fontWeight: Font.semibold,
    color: Colors.green,
  },

  // Toggle Switch Box
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(46, 46, 46, 0.06)',
    marginBottom: 24,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleTexts: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 11.9,
    fontWeight: Font.bold,
    color: Colors.dark,
  },
  toggleSub: {
    fontSize: 10.2,
    color: 'rgba(46, 46, 46, 0.4)',
    marginTop: 1,
  },

  // Submit Button
  submitBtn: {
    width: 334,
    height: 60,
    backgroundColor: Colors.green,
    borderRadius: 16,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15.3,
    fontWeight: Font.bold,
    color: Colors.white,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  deleteBtnText: {
    fontSize: 13.6,
    fontWeight: Font.semibold,
    color: Colors.error,
  },

  // Success Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.82,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: Font.bold,
    color: Colors.dark,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 12,
    color: 'rgba(46, 46, 46, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  navBtn: { alignItems: 'center', gap: 2, minWidth: 48 },
  navLabel: { fontSize: 8.5, fontWeight: Font.medium, color: Colors.dark, marginTop: 2 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    borderWidth: 4,
    borderColor: Colors.bg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  scannerGrid: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scannerBracket: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 2,
  },
});
