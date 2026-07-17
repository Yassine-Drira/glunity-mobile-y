import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
  Keyboard,
  Alert,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { AuthStackParamList } from '../../../../navigation/types';
import { AuthInput } from '../../../../shared/components/AuthInput';
import { AuthButton } from '../../../../shared/components/AuthButton';
import { WaveBackground } from '../../../../shared/components/WaveBackground';
import { Radius } from '../../../../shared/utils/theme';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { useAuth } from '../../state/auth.context';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

interface WizardForm {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
  phone: string;
  birthDate: string;
  location: string;
  gender: 'male' | 'female' | 'other' | '';
  dietaryPreference: 'strict_gluten_free' | 'gluten_reduced' | 'seeking_diagnosis' | '';
  profileType: 'celiac' | 'proche' | 'pro_commerce' | 'pro_health' | null;
  clientType: 'simple' | 'pro_health' | null;
  simpleUserType: 'celiac' | 'proche' | null;
  // Step 3 Client:
  diagnosisDate: string;
  severity: 'mild' | 'moderate' | 'severe' | '';
  symptoms: string[];
  clinicalDiagnosis: boolean;
  familyHistory: boolean;
  // Step 3 Pro Commerce:
  storeName: string;
  storeDescription: string;
  storeAddress: string;
  storePhone: string;
  // Step 4:
  consent: boolean;
}

const INITIAL_FORM: WizardForm = {
  fullName: '',
  email: '',
  password: '',
  confirm: '',
  phone: '',
  birthDate: '',
  location: '',
  gender: '',
  dietaryPreference: '',
  profileType: null,
  clientType: null,
  simpleUserType: null,
  diagnosisDate: '',
  severity: '',
  symptoms: [],
  clinicalDiagnosis: false,
  familyHistory: false,
  storeName: '',
  storeDescription: '',
  storeAddress: '',
  storePhone: '',
  consent: false,
};

const SYMPTOMS_OPTIONS = [
  { value: 'bloating', label: 'Bloating' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'abdominal_pain', label: 'Abdominal Pain' },
  { value: 'nausea', label: 'Nausea' },
  { value: 'headache', label: 'Headache' },
  { value: 'diarrhea', label: 'Diarrhea' },
];

export default function RegisterScreen({ navigation, route }: Props) {
  const { register, isLoading, error, clearError } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof WizardForm | 'general', string>>>({});
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'birthDate' | 'diagnosisDate'>('birthDate');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const oauthSignupToken = route.params?.oauthSignupToken;
  const prefill = route.params?.prefill;

  // Listen to keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Hydrate in-progress wizard state
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem('@glunity_wizard_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.form) {
            setForm((prev) => ({ ...prev, ...parsed.form }));
          }
          if (parsed.step) {
            setStep(parsed.step);
          }
        }
      } catch (err) {
        console.warn('Failed to load wizard state:', err);
      }
    };
    loadState();
  }, []);

  // Update prefills from OAuth route parameter changes
  useEffect(() => {
    if (prefill) {
      setForm((prev) => ({
        ...prev,
        email: prefill.email || prev.email,
        fullName: prefill.fullName || prev.fullName,
      }));
    }
  }, [prefill]);

  // Persist state on change
  const saveWizardState = async (nextStep: number, nextForm: WizardForm) => {
    try {
      await AsyncStorage.setItem(
        '@glunity_wizard_state',
        JSON.stringify({ step: nextStep, form: nextForm })
      );
    } catch (err) {
      console.warn('Failed to save wizard state:', err);
    }
  };

  const handleFieldChange = <K extends keyof WizardForm>(key: K, val: WizardForm[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val };
      saveWizardState(step, updated);
      return updated;
    });
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof WizardForm, string>> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = t('Full name must be at least 2 characters');
    }
    
    if (!oauthSignupToken) {
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
        errs.email = t('Valid email is required');
      }
      if (form.password.length < 8) {
        errs.password = t('Password must be at least 8 characters');
      } else if (!/[A-Z]/.test(form.password)) {
        errs.password = t('Must contain an uppercase letter');
      } else if (!/[0-9]/.test(form.password)) {
        errs.password = t('Must contain a number');
      }
      if (form.confirm !== form.password) {
        errs.confirm = t('Passwords do not match');
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof WizardForm, string>> = {};
    if (!form.birthDate) {
      errs.birthDate = t('Birth date is required');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      errs.birthDate = t('Invalid birth date format. Please use YYYY-MM-DD');
    }
    if (!form.location.trim()) {
      errs.location = t('Location is required');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Partial<Record<keyof WizardForm, string>> = {};
    if (!form.profileType) {
      errs.profileType = t('Please select a profile type');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep4 = (): boolean => {
    const errs: Partial<Record<keyof WizardForm, string>> = {};
    if (form.profileType !== 'pro_commerce' && form.diagnosisDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.diagnosisDate)) {
      errs.diagnosisDate = t('Invalid diagnosis date format. Please use YYYY-MM-DD');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep5 = (): boolean => {
    const errs: Partial<Record<keyof WizardForm, string>> = {};
    if (!form.consent) {
      errs.consent = t('Consent is required');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    clearError();
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;

    const nextStep = step + 1;
    setStep(nextStep);
    saveWizardState(nextStep, form);
  };

  const handleBack = () => {
    clearError();
    if (step > 1) {
      const nextStep = step - 1;
      setStep(nextStep);
      saveWizardState(nextStep, form);
    } else {
      navigation.goBack();
    }
  };

  const handleRegister = async () => {
    if (!validateStep5()) return;
    clearError();
    
    try {
      await register({
        fullName: form.fullName.trim(),
        email: oauthSignupToken ? undefined : form.email.trim().toLowerCase(),
        password: oauthSignupToken ? undefined : form.password,
        phone: form.phone.trim() || undefined,
        profileType: form.profileType!,
        birthDate: form.birthDate,
        location: form.location.trim(),
        gender: form.gender || undefined,
        dietaryPreference: form.dietaryPreference || undefined,
        consentVersion: '1.0',
        consentTimestamp: new Date().toISOString(),
        celiacQuestionnaire: form.profileType !== 'pro_commerce' ? {
          diagnosisDate: form.diagnosisDate || null,
          symptoms: form.symptoms,
          severity: form.severity,
          clinicalDiagnosis: form.clinicalDiagnosis,
          familyHistory: form.familyHistory,
        } : undefined,
        storeInfo: form.profileType === 'pro_commerce' ? {
          storeName: form.storeName.trim() || undefined,
          description: form.storeDescription.trim() || undefined,
          address: form.storeAddress.trim() || undefined,
          phone: form.storePhone.trim() || undefined,
        } : undefined,
        oauthSignupToken,
      });

      // Clear wizard persistence on success
      await AsyncStorage.removeItem('@glunity_wizard_state');
    } catch (err: any) {
      if (err?.message === 'EMAIL_NOT_VERIFIED') {
        await AsyncStorage.removeItem('@glunity_wizard_state');
        clearError();
        navigation.navigate('Login', {
          successMessage: t('Account created. Please verify your email before logging in.'),
        });
      }
    }
  };

  const openDatePicker = (field: 'birthDate' | 'diagnosisDate') => {
    if (Platform.OS === 'web') {
      const todayStr = new Date().toISOString().split('T')[0];
      const val = window.prompt(t('Enter date (YYYY-MM-DD):'), form[field] || todayStr);
      if (val) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          handleFieldChange(field, val);
        } else {
          window.alert(t('Invalid format. Please use YYYY-MM-DD.'));
        }
      }
      return;
    }
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      handleFieldChange(datePickerField, formatted);
    }
  };

  const toggleSymptom = (symptom: string) => {
    const updated = form.symptoms.includes(symptom)
      ? form.symptoms.filter((s) => s !== symptom)
      : [...form.symptoms, symptom];
    handleFieldChange('symptoms', updated);
  };

  // Styles Memo
  const styles = useMemo(() => {
    return StyleSheet.create({
      safe: { flex: 1, backgroundColor: T.bg },
      flex: { flex: 1, marginBottom: 140 },
      scroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 12,
      },
      title: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
        color: T.text,
        textAlign: 'center',
        marginBottom: 4,
      },
      progressText: {
        fontSize: 13,
        color: T.textSub,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '600',
        fontFamily: 'Poppins_600SemiBold',
      },
      progressBarOuter: {
        height: 6,
        backgroundColor: T.border,
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden',
      },
      progressBarInner: {
        height: '100%',
        backgroundColor: T.green,
        borderRadius: 3,
      },
      // Error Banner
      errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.errorLight,
        borderWidth: 1,
        borderColor: T.red,
        borderRadius: Radius.md,
        padding: 12,
        marginBottom: 16,
      },
      errorBannerText: { color: T.red, fontSize: 13, fontWeight: '500', fontFamily: 'Poppins_500Medium' },
      
      // Step 2 & 3 custom elements
      sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: T.text,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 12,
        marginTop: 8,
      },
      optionCard: {
        backgroundColor: T.surface,
        borderWidth: 1.5,
        borderColor: T.border,
        borderRadius: Radius.md,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      optionCardSelected: {
        borderColor: T.green,
        backgroundColor: T.greenLight,
      },
      optionCardText: {
        fontSize: 15,
        fontWeight: '600',
        color: T.text,
        fontFamily: 'Poppins_600SemiBold',
      },
      optionCardSubtext: {
        fontSize: 12,
        color: T.textSub,
        marginTop: 2,
        fontFamily: 'Poppins_400Regular',
      },
      // Sub Branch Buttons
      subGrid: {
        marginLeft: 16,
        marginBottom: 16,
        borderLeftWidth: 2,
        borderLeftColor: T.green,
        paddingLeft: 12,
      },
      subChip: {
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: Radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
      },
      subChipSelected: {
        backgroundColor: T.greenLight,
        borderColor: T.green,
      },
      subChipText: {
        fontSize: 13,
        color: T.text,
        fontWeight: '500',
        fontFamily: 'Poppins_500Medium',
      },
      subChipTextSelected: {
        color: T.green,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
      },
      // Date select button
      dateBtn: {
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
        padding: 14,
        borderRadius: Radius.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      },
      dateBtnText: {
        fontSize: 14,
        color: T.text,
        fontFamily: 'Poppins_400Regular',
      },
      // Symptom Grid
      symptomGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
      },
      symptomChip: {
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
        borderRadius: Radius.md,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
      },
      symptomChipSelected: {
        borderColor: T.green,
        backgroundColor: T.greenLight,
      },
      symptomText: {
        fontSize: 13,
        color: T.text,
        fontFamily: 'Poppins_500Medium',
      },
      symptomTextSelected: {
        color: T.green,
        fontWeight: '600',
      },
      gradientChip: {
        borderRadius: Radius.md,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      },
      outlineChip: {
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
        borderRadius: Radius.md,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      },
      gradientTextSelected: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '700',
        fontFamily: 'Poppins_600SemiBold',
      },
      // Severity Grid
      severityGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
      },
      severityBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: Radius.md,
        marginHorizontal: 4,
      },
      severityBtnSelected: {
        borderColor: T.green,
        backgroundColor: T.greenLight,
      },
      // Consent Checkbox
      consentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
        backgroundColor: T.surface,
        padding: 16,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: T.border,
      },
      consentText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 13,
        color: T.text,
        lineHeight: 18,
        fontFamily: 'Poppins_500Medium',
      },
      // Navigation button row
      navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
      },
      navBtn: {
        flex: 1,
        marginHorizontal: 6,
      },
      switchRow: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
      },
      switchRowStatic: {
        marginTop: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
      },
      switchText: { fontSize: 13, color: T.textSub, fontFamily: 'Poppins_500Medium' },
      switchLink: { fontSize: 13, fontWeight: '700', color: T.green, fontFamily: 'Poppins_700Bold' },
      hint: { fontSize: 11, color: T.textMuted, marginTop: -8, marginBottom: 16, paddingLeft: 4 },
    });
  }, [T]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />
      
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.title}>{t('GET STARTED')}</Text>
          <Text style={styles.progressText}>
            {`${t('Step')} ${step} ${t('of')} 5`}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarInner, { width: `${(step / 5) * 100}%` }]} />
          </View>

          {/* API error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={18} color={T.red} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{t(error)}</Text>
            </View>
          )}

          {/* Wizard Forms */}
          {step === 1 && (
            <View>
              <AuthInput
                label={t('Full Name')}
                placeholder={t('Enter your name')}
                value={form.fullName}
                onChangeText={(v) => handleFieldChange('fullName', v)}
                error={errors.fullName}
                themeColors={T}
              />
              
              {!oauthSignupToken && (
                <>
                  <AuthInput
                    label={t('Email')}
                    placeholder={t('Enter your email')}
                    keyboardType="email-address"
                    value={form.email}
                    onChangeText={(v) => handleFieldChange('email', v)}
                    error={errors.email}
                    themeColors={T}
                  />
                  <AuthInput
                    label={t('Password')}
                    placeholder={t('Create a password')}
                    secureTextEntry={!showPass}
                    value={form.password}
                    onChangeText={(v) => handleFieldChange('password', v)}
                    error={errors.password}
                    rightIcon={<Feather name={showPass ? 'eye-off' : 'eye'} size={20} color={T.textMuted} />}
                    onRightIconPress={() => setShowPass((p) => !p)}
                    themeColors={T}
                  />
                  <Text style={styles.hint}>{t('Min 8 chars · one uppercase · one number')}</Text>
                  
                  <AuthInput
                    label={t('Confirm Password')}
                    placeholder={t('Re-enter your password')}
                    secureTextEntry={!showConfirm}
                    value={form.confirm}
                    onChangeText={(v) => handleFieldChange('confirm', v)}
                    error={errors.confirm}
                    rightIcon={<Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color={T.textMuted} />}
                    onRightIconPress={() => setShowConfirm((p) => !p)}
                    themeColors={T}
                  />
                </>
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              <AuthInput
                label={t('Phone')}
                placeholder={t('Phone')}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(v) => handleFieldChange('phone', v)}
                error={errors.phone}
                themeColors={T}
              />

              <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 6 }}>
                {t('Birth Date')}
              </Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={[styles.dateBtn, { outlineStyle: 'none', fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.text }] as any}
                  value={form.birthDate}
                  onChangeText={(v) => handleFieldChange('birthDate', v)}
                  placeholder="YYYY-MM-DD"
                  {...({ type: 'date' } as any)}
                />
              ) : (
                <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('birthDate')}>
                  <Text style={styles.dateBtnText}>
                    {form.birthDate ? form.birthDate : 'YYYY-MM-DD'}
                  </Text>
                  <Feather name="calendar" size={18} color={T.textMuted} />
                </TouchableOpacity>
              )}
              {!!errors.birthDate && (
                <Text style={{ color: T.red, fontSize: 12, marginTop: -12, marginBottom: 12 }}>
                  {errors.birthDate}
                </Text>
              )}

              <AuthInput
                label={t('Location')}
                placeholder={t('Location')}
                value={form.location}
                onChangeText={(v) => handleFieldChange('location', v)}
                error={errors.location}
                themeColors={T}
              />

              <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 8, marginTop: 4 }}>
                {t('Gender')}
              </Text>
              <View style={styles.severityGrid}>
                {(['male', 'female', 'other'] as const).map((g) => {
                  const selected = form.gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.severityBtn, selected && styles.severityBtnSelected]}
                      onPress={() => handleFieldChange('gender', g)}
                    >
                      <Text
                        style={{
                          color: selected ? T.green : T.text,
                          fontWeight: selected ? '700' : '500',
                          fontFamily: selected ? 'Poppins_700Bold' : 'Poppins_500Medium',
                        }}
                      >
                        {t(g.charAt(0).toUpperCase() + g.slice(1))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 8 }}>
                {t('Dietary Preference')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {(['strict_gluten_free', 'gluten_reduced', 'seeking_diagnosis'] as const).map((pref) => {
                  const selected = form.dietaryPreference === pref;
                  const labelMap = {
                    strict_gluten_free: 'Strict Gluten-Free',
                    gluten_reduced: 'Gluten Reduced',
                    seeking_diagnosis: 'Seeking Diagnosis',
                  };
                  return (
                    <TouchableOpacity
                      key={pref}
                      style={[styles.symptomChip, selected && styles.symptomChipSelected]}
                      onPress={() => handleFieldChange('dietaryPreference', pref)}
                    >
                      <Text style={[styles.symptomText, selected && styles.symptomTextSelected]}>
                        {t(labelMap[pref])}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.sectionTitle}>{t('Choose Account Type')}</Text>
              
              {/* Option A: Client */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  (form.profileType === 'celiac' || form.profileType === 'proche' || form.profileType === 'pro_health') &&
                    styles.optionCardSelected,
                ]}
                activeOpacity={0.9}
                onPress={() => {
                  handleFieldChange('profileType', 'celiac');
                  handleFieldChange('clientType', 'simple');
                  handleFieldChange('simpleUserType', 'celiac');
                }}
              >
                <View>
                  <Text style={styles.optionCardText}>{t('Client')}</Text>
                  <Text style={styles.optionCardSubtext}>
                    {t('Health questionnaire + celiac disease tools')}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={
                    form.profileType && form.profileType !== 'pro_commerce'
                      ? 'radiobox-marked'
                      : 'radiobox-blank'
                  }
                  size={22}
                  color={form.profileType && form.profileType !== 'pro_commerce' ? T.green : T.textMuted}
                />
              </TouchableOpacity>

              {/* Sub-branch if Client Selected */}
              {form.profileType && form.profileType !== 'pro_commerce' && (
                <View style={styles.subGrid}>
                  <TouchableOpacity
                    style={[styles.subChip, form.clientType === 'simple' && styles.subChipSelected]}
                    onPress={() => {
                      handleFieldChange('clientType', 'simple');
                      handleFieldChange('profileType', 'celiac');
                      handleFieldChange('simpleUserType', 'celiac');
                    }}
                  >
                    <Text style={[styles.subChipText, form.clientType === 'simple' && styles.subChipTextSelected]}>
                      {t('Simple User')}
                    </Text>
                  </TouchableOpacity>

                  {form.clientType === 'simple' && (
                    <View style={{ flexDirection: 'row', marginLeft: 12, marginBottom: 8, gap: 10 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          handleFieldChange('simpleUserType', 'celiac');
                          handleFieldChange('profileType', 'celiac');
                        }}
                        style={{ flex: 1 }}
                      >
                        {form.simpleUserType === 'celiac' ? (
                          <LinearGradient
                            colors={isDark ? ['#689F38', '#4CAF50'] : ['#8BC34A', '#4CAF50']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientChip}
                          >
                            <Text style={styles.gradientTextSelected}>{t('Celiac')}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.outlineChip}>
                            <Text style={[styles.symptomText, { color: T.text }]}>{t('Celiac')}</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          handleFieldChange('simpleUserType', 'proche');
                          handleFieldChange('profileType', 'proche');
                        }}
                        style={{ flex: 1 }}
                      >
                        {form.simpleUserType === 'proche' ? (
                          <LinearGradient
                            colors={isDark ? ['#689F38', '#4CAF50'] : ['#8BC34A', '#4CAF50']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientChip}
                          >
                            <Text style={styles.gradientTextSelected}>{t('Proche')}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.outlineChip}>
                            <Text style={[styles.symptomText, { color: T.text }]}>{t('Proche')}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.subChip, form.clientType === 'pro_health' && styles.subChipSelected]}
                    onPress={() => {
                      handleFieldChange('clientType', 'pro_health');
                      handleFieldChange('profileType', 'pro_health');
                      handleFieldChange('simpleUserType', null);
                    }}
                  >
                    <Text
                      style={[
                        styles.subChipText,
                        form.clientType === 'pro_health' && styles.subChipTextSelected,
                      ]}
                    >
                      {t('Health Pro')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Option B: Pro Commerce */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  form.profileType === 'pro_commerce' && styles.optionCardSelected,
                ]}
                activeOpacity={0.9}
                onPress={() => {
                  handleFieldChange('profileType', 'pro_commerce');
                  handleFieldChange('clientType', null);
                  handleFieldChange('simpleUserType', null);
                }}
              >
                <View>
                  <Text style={styles.optionCardText}>{t('Commercial Pro')}</Text>
                  <Text style={styles.optionCardSubtext}>
                    {t('Establishment sheet + declare safe products')}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={form.profileType === 'pro_commerce' ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={form.profileType === 'pro_commerce' ? T.green : T.textMuted}
                />
              </TouchableOpacity>
              
              {!!errors.profileType && (
                <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>
                  {errors.profileType}
                </Text>
              )}
            </View>
          )}

          {step === 4 && (
            <View>
              {form.profileType === 'pro_commerce' ? (
                // Shop Details Form (Optional)
                <View>
                  <Text style={styles.sectionTitle}>{t('Shop Details (Optional)')}</Text>
                  <AuthInput
                    label={t('Shop Name')}
                    placeholder={t('Shop Name')}
                    value={form.storeName}
                    onChangeText={(v) => handleFieldChange('storeName', v)}
                    themeColors={T}
                  />
                  <AuthInput
                    label={t('Shop Description')}
                    placeholder={t('Shop Description')}
                    value={form.storeDescription}
                    onChangeText={(v) => handleFieldChange('storeDescription', v)}
                    themeColors={T}
                  />
                  <AuthInput
                    label={t('Shop Address')}
                    placeholder={t('Shop Address')}
                    value={form.storeAddress}
                    onChangeText={(v) => handleFieldChange('storeAddress', v)}
                    themeColors={T}
                  />
                  <AuthInput
                    label={t('Shop Phone')}
                    placeholder={t('Shop Phone')}
                    keyboardType="phone-pad"
                    value={form.storePhone}
                    onChangeText={(v) => handleFieldChange('storePhone', v)}
                    themeColors={T}
                  />
                </View>
              ) : (
                // Celiac questionnaire
                <View>
                  <Text style={styles.sectionTitle}>{t('Celiac Health Questionnaire')}</Text>

                  <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 6 }}>
                    {t('Diagnosis Date')}
                  </Text>
                  {Platform.OS === 'web' ? (
                    <TextInput
                      style={[styles.dateBtn, { outlineStyle: 'none', fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.text }] as any}
                      value={form.diagnosisDate}
                      onChangeText={(v) => handleFieldChange('diagnosisDate', v)}
                      placeholder="YYYY-MM-DD"
                      {...({ type: 'date' } as any)}
                    />
                  ) : (
                    <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('diagnosisDate')}>
                      <Text style={styles.dateBtnText}>
                        {form.diagnosisDate ? form.diagnosisDate : 'YYYY-MM-DD'}
                      </Text>
                      <Feather name="calendar" size={18} color={T.textMuted} />
                    </TouchableOpacity>
                  )}
                  {!!errors.diagnosisDate && (
                    <Text style={{ color: T.red, fontSize: 12, marginTop: -12, marginBottom: 12 }}>
                      {errors.diagnosisDate}
                    </Text>
                  )}

                  <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 8 }}>
                    {t('Symptoms')}
                  </Text>
                  <View style={styles.symptomGrid}>
                    {SYMPTOMS_OPTIONS.map((opt) => {
                      const selected = form.symptoms.includes(opt.value);
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.symptomChip, selected && styles.symptomChipSelected]}
                          onPress={() => toggleSymptom(opt.value)}
                        >
                          <Text style={[styles.symptomText, selected && styles.symptomTextSelected]}>
                            {t(opt.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 8 }}>
                    {t('Severity')}
                  </Text>
                  <View style={styles.severityGrid}>
                    {(['mild', 'moderate', 'severe'] as const).map((sev) => {
                      const selected = form.severity === sev;
                      return (
                        <TouchableOpacity
                          key={sev}
                          style={[styles.severityBtn, selected && styles.severityBtnSelected]}
                          onPress={() => handleFieldChange('severity', sev)}
                        >
                          <Text
                            style={{
                              color: selected ? T.green : T.text,
                              fontWeight: selected ? '700' : '500',
                              fontFamily: selected ? 'Poppins_700Bold' : 'Poppins_500Medium',
                            }}
                          >
                            {t(sev.charAt(0).toUpperCase() + sev.slice(1))}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 8, marginTop: 4 }}>
                    {t('Medical Diagnosis')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.optionCard, form.clinicalDiagnosis && styles.optionCardSelected, { paddingVertical: 12, marginBottom: 12 }]}
                    activeOpacity={0.8}
                    onPress={() => handleFieldChange('clinicalDiagnosis', !form.clinicalDiagnosis)}
                  >
                    <Text style={[styles.optionCardText, { fontSize: 13, flex: 1, paddingRight: 8 }]}>
                      {t('Has this been officially diagnosed by a gastroenterologist?')}
                    </Text>
                    <Feather
                      name={form.clinicalDiagnosis ? 'check-circle' : 'circle'}
                      size={20}
                      color={form.clinicalDiagnosis ? T.green : T.textMuted}
                    />
                  </TouchableOpacity>

                  <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSub, marginBottom: 8 }}>
                    {t('Family History')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.optionCard, form.familyHistory && styles.optionCardSelected, { paddingVertical: 12, marginBottom: 12 }]}
                    activeOpacity={0.8}
                    onPress={() => handleFieldChange('familyHistory', !form.familyHistory)}
                  >
                    <Text style={[styles.optionCardText, { fontSize: 13, flex: 1, paddingRight: 8 }]}>
                      {t('Do you have a family history of celiac disease?')}
                    </Text>
                    <Feather
                      name={form.familyHistory ? 'check-circle' : 'circle'}
                      size={20}
                      color={form.familyHistory ? T.green : T.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={styles.sectionTitle}>{t('Legal Consent')}</Text>
              
              <Text style={{ fontSize: 13, color: T.textSub, lineHeight: 20, fontFamily: 'Poppins_400Regular' }}>
                We collect your medical symptoms and diagnostic details purely to customize your recipes, products, and map filters. Your health data is encrypted and kept strictly confidential. 
              </Text>

              <TouchableOpacity
                style={styles.consentRow}
                activeOpacity={0.8}
                onPress={() => handleFieldChange('consent', !form.consent)}
              >
                <Feather
                  name={form.consent ? 'check-square' : 'square'}
                  size={20}
                  color={form.consent ? T.green : T.textMuted}
                />
                <Text style={styles.consentText}>
                  {t('I agree to the Terms of Service & Privacy Policy')}
                </Text>
              </TouchableOpacity>
              {!!errors.consent && (
                <Text style={{ color: T.red, fontSize: 12, marginTop: -12, marginBottom: 12 }}>
                  {errors.consent}
                </Text>
              )}
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navRow}>
            <View style={styles.navBtn}>
              <AuthButton
                label={t('Back')}
                variant="outlined"
                onPress={handleBack}
              />
            </View>
            <View style={styles.navBtn}>
              {step < 5 ? (
                <AuthButton
                  label={t('Next')}
                  variant="filled"
                  onPress={handleNext}
                />
              ) : (
                <AuthButton
                  label={t('Submit')}
                  variant="filled"
                  loading={isLoading}
                  onPress={handleRegister}
                />
              )}
            </View>
          </View>

          {/* Static Switch Row inside ScrollView to prevent overlay overlap */}
          {step === 1 && (
            <View style={styles.switchRowStatic}>
              <Text style={styles.switchText}>{t('Already Account? ')}</Text>
              <TouchableOpacity
                onPress={() => {
                  clearError();
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.switchLink}>{t('Login')}</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={
            form[datePickerField]
              ? new Date(form[datePickerField])
              : new Date()
          }
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {!keyboardOpen && (
        <WaveBackground color={isDark ? '#1E3516' : '#8BC34A'} />
      )}
    </SafeAreaView>
  );
}
