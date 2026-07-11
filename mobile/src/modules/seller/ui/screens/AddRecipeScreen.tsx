import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import recipesApi from '@/modules/recipes/api/recipes.api';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<AppStackParamList, 'AddRecipe'>;

const RECIPE_CATEGORIES = [
  'Tunisian',
  'Easy',
  'Quick',
  'Breads & Pastry',
  'Desserts',
  'Savory',
  'Breakfast',
  'Soups & Salads',
];

export default function AddRecipeScreen({ navigation, route }: Props) {
  const { theme: T } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const bottomInset = Math.max(insets.bottom, 8) + 110;
  const recipeToEdit = route.params?.recipe;
  const isEditing = !!recipeToEdit;

  const s = React.useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 16 },

    // Image Upload
    imageUploadContainer: {
      width: '100%',
      height: 180,
      borderRadius: 24,
      backgroundColor: T.surfaceAlt,
      borderWidth: 1.5,
      borderColor: T.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    imageUploadedBorder: {
      borderStyle: 'solid',
      borderColor: T.green,
      backgroundColor: T.surface,
    },
    uploadInner: { alignItems: 'center', gap: 10 },
    uploadIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: `${T.green}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadText: {
      fontSize: 12.5,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.textMuted,
    },
    uploadSubText: {
      fontSize: 10.5,
      fontFamily: 'Poppins_400Regular',
      color: T.textMuted,
      marginTop: -6,
    },
    imagePreviewWrapper: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    changePhotoBadge: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.62)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 5,
    },
    changePhotoText: {
      fontSize: 9.5,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: '#FFFFFF',
    },

    // Form fields
    label: {
      fontSize: 11.9,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
    },
    inputGroup: { marginBottom: 20 },
    rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    optionalSub: {
      fontSize: 10.2,
      fontWeight: '400',
      fontFamily: 'Poppins_400Regular',
      color: T.textMuted,
    },
    input: {
      width: '100%',
      height: 55.56,
      borderRadius: 16,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 17,
      fontSize: 15,
      color: T.text,
    },
    inputError: { borderColor: T.red, backgroundColor: T.redLight },
    errorText: { fontSize: 10.5, color: T.red, marginTop: 4, marginLeft: 4 },
    textArea: {
      height: 110,
      paddingTop: 15,
      textAlignVertical: 'top',
    },
    tallTextArea: {
      height: 140,
      paddingTop: 15,
      textAlignVertical: 'top',
    },

    // Category Dropdown
    selectTrigger: {
      width: '100%',
      height: 55.56,
      borderRadius: 16,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 17,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectText: { fontSize: 15, color: T.text },
    placeholderText: { color: T.textMuted },
    dropdownList: {
      backgroundColor: T.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: T.border,
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
    dropdownItemSelected: { backgroundColor: T.greenLight },
    dropdownItemText: { fontSize: 15, color: T.text },
    dropdownItemTextSelected: {
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.green,
    },

    // Nutrition Info Card
    nutritionCard: {
      backgroundColor: T.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: T.border,
      padding: 16,
      marginBottom: 20,
      shadowColor: 'rgba(0,0,0,0.03)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    nutritionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    nutritionCardIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: `${T.green}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nutritionCardTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },
    nutritionCardSub: {
      fontSize: 10.2,
      fontFamily: 'Poppins_400Regular',
      color: T.textMuted,
      marginTop: 1,
    },
    nutritionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    nutritionField: {
      width: (screenWidth - 88) / 2,
    },
    nutritionLabel: {
      fontSize: 10.2,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.textMuted,
      marginBottom: 5,
    },
    nutritionInput: {
      width: '100%',
      height: 44,
      borderRadius: 12,
      backgroundColor: T.surfaceAlt,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 12,
      fontSize: 14,
      color: T.text,
    },

    // Steps builder
    stepsContainer: { gap: 10, marginBottom: 10 },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    stepNumBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 13,
      flexShrink: 0,
    },
    stepNum: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: '#FFFFFF',
    },
    stepInput: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 14,
      paddingTop: 13,
      fontSize: 14,
      color: T.text,
      textAlignVertical: 'top',
    },
    stepDeleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 13,
      borderWidth: 1,
      borderColor: T.border,
    },
    addStepBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: `${T.green}12`,
      borderRadius: 12,
      marginTop: 4,
      borderWidth: 1,
      borderColor: `${T.green}30`,
    },
    addStepText: {
      fontSize: 12,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.green,
    },

    // Submit
    submitBtn: {
      width: 334,
      height: 60,
      backgroundColor: T.green,
      borderRadius: 16,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    submitBtnText: {
      fontSize: 15.3,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: '#FFFFFF',
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
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.red,
    },

    // Section divider
    sectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: T.border,
    },
    dividerLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },

    // Success Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: screenWidth * 0.82,
      backgroundColor: T.surface,
      borderRadius: 24,
      padding: 28,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
      elevation: 10,
    },
    successCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    modalTitle: {
      fontSize: 19,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
    },
    modalSub: {
      fontSize: 12.5,
      color: T.textSub,
      textAlign: 'center',
      lineHeight: 19,
      fontFamily: 'Poppins_400Regular',
    },
  }), [T, screenWidth]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);

  // Nutrition fields
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');

  const [titleError, setTitleError] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (recipeToEdit) {
      setTitle(recipeToEdit.title || '');
      setCategory(recipeToEdit.category || '');
      setDescription(recipeToEdit.description || '');
      setIngredients(Array.isArray(recipeToEdit.ingredients) ? recipeToEdit.ingredients.join(', ') : '');
      setSteps(Array.isArray(recipeToEdit.steps) && recipeToEdit.steps.length > 0 ? recipeToEdit.steps : ['']);
      const photo = recipeToEdit.photos?.[0] || null;
      if (photo && !photo.startsWith('blob:')) {
        setRecipeImage(photo);
      }
      const n = recipeToEdit.nutritionInfo || {};
      setCalories(n.calories != null ? String(n.calories) : '');
      setCarbs(n.carbs != null ? String(n.carbs) : '');
      setProtein(n.protein != null ? String(n.protein) : '');
      setFat(n.fat != null ? String(n.fat) : '');
      setFiber(n.fiber != null ? String(n.fiber) : '');
    }
  }, [recipeToEdit]);

  // Dirty check guard on back navigation
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const isStepsDirty = () => {
        const originalSteps = recipeToEdit?.steps || [];
        if (steps.length !== originalSteps.length) return true;
        return steps.some((s, idx) => s.trim() !== (originalSteps[idx] || '').trim());
      };

      const isNutritionDirty = () => {
        const n = recipeToEdit?.nutritionInfo || {};
        return calories !== (n.calories != null ? String(n.calories) : '') ||
               carbs !== (n.carbs != null ? String(n.carbs) : '') ||
               protein !== (n.protein != null ? String(n.protein) : '') ||
               fat !== (n.fat != null ? String(n.fat) : '') ||
               fiber !== (n.fiber != null ? String(n.fiber) : '');
      };

      const isDirty = isEditing
        ? title.trim() !== (recipeToEdit.title || '').trim() ||
          category !== (recipeToEdit.category || '') ||
          description.trim() !== (recipeToEdit.description || '').trim() ||
          ingredients.trim() !== (Array.isArray(recipeToEdit.ingredients) ? recipeToEdit.ingredients.join(', ').trim() : '') ||
          isStepsDirty() ||
          isNutritionDirty()
        : title.trim() || category || description.trim() || steps.some(s => s.trim()) || calories || carbs || protein || fat || fiber;

      if (!isDirty || isSubmitting || successModalVisible) return;

      e.preventDefault();

      if (Platform.OS === 'web') {
        const leave = window.confirm(t('You have unsaved changes. Are you sure you want to discard them and leave?'));
        if (leave) {
          navigation.dispatch(e.data.action);
        }
      } else {
        Alert.alert(
          t('Discard draft?'),
          t('You have unsaved changes. Are you sure you want to discard them and leave?'),
          [
            { text: t('Keep Editing'), style: 'cancel', onPress: () => {} },
            { text: t('Discard'), style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          ]
        );
      }
    });
    return unsubscribe;
  }, [navigation, title, category, description, ingredients, steps, calories, carbs, protein, fat, fiber, isSubmitting, successModalVisible, isEditing, recipeToEdit]);

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("You've refused to allow this app to access your photos!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.65,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setRecipeImage(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setRecipeImage(asset.uri);
      }
    }
  };

  const handleAddStep = () => setSteps(prev => [...prev, '']);

  const handleStepChange = (text: string, idx: number) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? text : s)));
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) return;
    setSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    if (!category) {
      alert(t('Please select a category'));
      return;
    }
    const validSteps = steps.map(s => s.trim()).filter(Boolean);
    if (validSteps.length === 0) {
      alert(t('Please add at least one preparation step'));
      return;
    }

    setTitleError(false);
    setIsSubmitting(true);

    try {
      const ingredientsArray = ingredients
        ? ingredients.split(',').map(i => i.trim()).filter(Boolean)
        : [];
      const photosArray = recipeImage ? [recipeImage] : [];

      const dto: any = {
        title: title.trim(),
        category: category.toLowerCase() as any,
        description: description.trim(),
        ingredients: ingredientsArray,
        steps: validSteps,
        photos: photosArray,
        nutritionInfo: {
          ...(calories ? { calories: Number(calories) } : {}),
          ...(carbs ? { carbs: Number(carbs) } : {}),
          ...(protein ? { protein: Number(protein) } : {}),
          ...(fat ? { fat: Number(fat) } : {}),
          ...(fiber ? { fiber: Number(fiber) } : {}),
        },
      };

      if (isEditing && recipeToEdit?._id) {
        await recipesApi.update(recipeToEdit._id, dto);
      } else {
        await recipesApi.create(dto);
      }

      setSuccessModalVisible(true);
      setTimeout(() => {
        setSuccessModalVisible(false);
        navigation.goBack();
      }, 1800);
    } catch (err: any) {
      console.error('Error saving recipe:', err);
      alert(err?.response?.data?.message || t('Failed to save recipe. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    const performDelete = async () => {
      try {
        if (recipeToEdit?._id) {
          await recipesApi.remove(recipeToEdit._id);
          alert(t('Recipe deleted successfully'));
          navigation.goBack();
        }
      } catch (err: any) {
        console.error('Error deleting recipe:', err);
        alert(err?.response?.data?.message || t('Failed to delete recipe.'));
      }
    };

    if (typeof window !== 'undefined' || typeof Alert === 'undefined') {
      if (confirm(t('Are you sure you want to delete this recipe?'))) {
        performDelete();
      }
    } else {
      Alert.alert(
        t('Delete Recipe'),
        t('Are you sure you want to delete this recipe?'),
        [
          { text: t('Cancel'), style: 'cancel' },
          { text: t('Delete'), style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  return (
    <AppScaffold
      title={t(isEditing ? 'Edit Recipe' : 'Add a Recipe')}
      activeTab="profile"
      onBack={() => navigation.goBack()}
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Events')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => navigation.navigate('SellerProProfile')}
      contentStyle={{ backgroundColor: T.bg }}
    >
      {/* ── Success Modal ──────────────────────────────────────────────────── */}
      <Modal visible={successModalVisible} transparent={true} animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.successCircle}>
              <Feather name="check" size={34} color="#FFFFFF" />
            </View>
            <Text style={s.modalTitle}>{t('Recipe Saved!')}</Text>
            <Text style={s.modalSub}>
              "{title}" {t(isEditing ? 'has been updated.' : 'has been added to your recipes.')}
            </Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.content, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Recipe Cover Photo ─────────────────────────────────────────────── */}
        <Text style={s.label}>{t('Recipe Cover Photo')}</Text>
        <TouchableOpacity
          style={[s.imageUploadContainer, recipeImage ? s.imageUploadedBorder : null]}
          activeOpacity={0.85}
          onPress={handleImagePick}
          id="btn-upload-recipe-image"
        >
          {recipeImage ? (
            <View style={s.imagePreviewWrapper}>
              <Image source={{ uri: recipeImage }} style={s.imagePreview} />
              <View style={s.changePhotoBadge}>
                <Feather name="camera" size={12} color="#FFFFFF" />
                <Text style={s.changePhotoText}>{t('Change')}</Text>
              </View>
            </View>
          ) : (
            <View style={s.uploadInner}>
              <View style={s.uploadIconCircle}>
                <MaterialCommunityIcons name="food-fork-drink" size={24} color={T.green} />
              </View>
              <Text style={s.uploadText}>{t('Tap to upload a cover photo')}</Text>
              <Text style={s.uploadSubText}>{t('16:9 · JPG or PNG recommended')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Section: Recipe Info ───────────────────────────────────────────── */}
        <View style={s.sectionDivider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerLabel}>{t('Recipe Info')}</Text>
          <View style={s.dividerLine} />
        </View>

        {/* ── Recipe Title ──────────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <Text style={s.label}>{t('Recipe Title')}</Text>
          <TextInput
            style={[s.input, titleError ? s.inputError : null]}
            placeholder={t('e.g. Almond Flour Banana Bread')}
            placeholderTextColor={T.textMuted}
            value={title}
            onChangeText={(txt) => {
              setTitle(txt);
              if (txt.trim()) setTitleError(false);
            }}
            id="input-recipe-title"
          />
          {titleError && <Text style={s.errorText}>{t('Please enter a recipe title')}</Text>}
        </View>

        {/* ── Category Dropdown ─────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <Text style={s.label}>{t('Category')}</Text>
          <TouchableOpacity
            style={s.selectTrigger}
            activeOpacity={0.85}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            id="btn-recipe-category-select"
          >
            <Text style={[s.selectText, !category ? s.placeholderText : null]}>
              {category ? t(category) : t('Select category')}
            </Text>
            <Feather
              name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={T.textMuted}
            />
          </TouchableOpacity>
          {showCategoryDropdown && (
            <View style={s.dropdownList}>
              {RECIPE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.dropdownItem, category === cat ? s.dropdownItemSelected : null]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={[s.dropdownItemText, category === cat ? s.dropdownItemTextSelected : null]}>
                    {t(cat)}
                  </Text>
                  {category === cat && <Feather name="check" size={14} color={T.green} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Description ───────────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <Text style={s.label}>{t('Description')}</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder={t('Brief description of the recipe...')}
            placeholderTextColor={T.textMuted}
            multiline={true}
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            id="input-recipe-description"
          />
        </View>

        {/* ── Ingredients ───────────────────────────────────────────────────── */}
        <View style={s.inputGroup}>
          <View style={s.rowLabel}>
            <Text style={s.label}>{t('Ingredients')}</Text>
          </View>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder={t('e.g. 2 cups almond flour, 3 eggs, 1 ripe banana...')}
            placeholderTextColor={T.textMuted}
            multiline={true}
            numberOfLines={4}
            value={ingredients}
            onChangeText={setIngredients}
            id="input-recipe-ingredients"
          />
        </View>

        {/* ── Section: Preparation Steps ────────────────────────────────────── */}
        <View style={s.sectionDivider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerLabel}>{t('Steps')}</Text>
          <View style={s.dividerLine} />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>{t('Preparation Steps')}</Text>
          <View style={s.stepsContainer}>
            {steps.map((step, idx) => (
              <View key={idx} style={s.stepRow}>
                <View style={s.stepNumBadge}>
                  <Text style={s.stepNum}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={s.stepInput}
                  placeholder={t(`Step ${idx + 1}...`)}
                  placeholderTextColor={T.textMuted}
                  value={step}
                  onChangeText={(txt) => handleStepChange(txt, idx)}
                  multiline
                  id={`input-step-${idx}`}
                />
                {steps.length > 1 && (
                  <TouchableOpacity
                    style={s.stepDeleteBtn}
                    onPress={() => handleRemoveStep(idx)}
                    id={`btn-remove-step-${idx}`}
                  >
                    <Feather name="x" size={13} color={T.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={s.addStepBtn}
            activeOpacity={0.8}
            onPress={handleAddStep}
            id="btn-add-step"
          >
            <Feather name="plus" size={15} color={T.green} />
            <Text style={s.addStepText}>{t('Add Step')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Section: Nutrition Info ───────────────────────────────────────── */}
        <View style={s.sectionDivider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerLabel}>{t('Nutrition')}</Text>
          <View style={s.dividerLine} />
        </View>

        <View style={[s.inputGroup, { marginBottom: 24 }]}>
          <View style={s.nutritionCard}>
            <View style={s.nutritionCardHeader}>
              <View style={s.nutritionCardIcon}>
                <MaterialCommunityIcons name="leaf" size={17} color={T.green} />
              </View>
              <View>
                <Text style={s.nutritionCardTitle}>{t('Nutrition Facts')}</Text>
                <Text style={s.nutritionCardSub}>{t('Per serving — optional')}</Text>
              </View>
            </View>
            <View style={s.nutritionGrid}>
              {[
                { label: 'Calories (kcal)', value: calories, setter: setCalories, id: 'input-calories' },
                { label: 'Carbs (g)', value: carbs, setter: setCarbs, id: 'input-carbs' },
                { label: 'Protein (g)', value: protein, setter: setProtein, id: 'input-protein' },
                { label: 'Fat (g)', value: fat, setter: setFat, id: 'input-fat' },
                { label: 'Fiber (g)', value: fiber, setter: setFiber, id: 'input-fiber' },
              ].map(({ label, value, setter, id }) => (
                <View key={id} style={s.nutritionField}>
                  <Text style={s.nutritionLabel}>{t(label)}</Text>
                  <TextInput
                    style={s.nutritionInput}
                    placeholder="–"
                    placeholderTextColor={T.textMuted}
                    value={value}
                    onChangeText={setter}
                    keyboardType="decimal-pad"
                    id={id}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Submit Button ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.submitBtn, isSubmitting ? { opacity: 0.7 } : null]}
          disabled={isSubmitting}
          activeOpacity={0.88}
          onPress={handleSubmit}
          id="btn-submit-recipe"
        >
          <Text style={s.submitBtnText}>
            {isSubmitting ? t('Saving...') : t(isEditing ? 'Save Changes' : 'Publish Recipe')}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={s.deleteBtn}
            activeOpacity={0.8}
            onPress={handleDelete}
            id="btn-delete-recipe"
          >
            <Feather name="trash-2" size={16} color={T.red} />
            <Text style={s.deleteBtnText}>{t('Delete Recipe')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </AppScaffold>
  );
}
