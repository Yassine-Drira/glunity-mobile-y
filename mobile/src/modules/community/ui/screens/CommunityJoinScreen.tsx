import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/shared/utils/theme';
import { AppScaffold } from '@/shared/components/AppScaffold';

export default function CommunityJoinScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const handleJoin = async () => {
    try {
      await AsyncStorage.setItem('@joined_community', 'true');
    } catch (e) {
      // ignore
    }
    navigation.replace('CommunityChat');
  };

  const handleMaybeLater = () => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <AppScaffold title="Community" activeTab="events" onBack={handleMaybeLater}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 116 + insets.bottom }] }>

      <Image
        source={require('../../../../../assets/Logo/image 3.png')}
        style={styles.mascot}
        resizeMode="contain"
      />

      <Text style={styles.title}>
        Welcome, <Text style={styles.titleAccent}>warrior!</Text>
      </Text>

      <Text style={styles.subtitle}>
        You're not alone on this journey. Join a community of people living gluten-free, share your experiences, discover tips, and support each other.
      </Text>

      <Text style={styles.highlight}>Together, we fight gluten</Text>

      <View style={styles.cardList}>
        <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="share-variant" size={26} color={Colors.primaryRed} />
            </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Share tips</Text>
            <Text style={styles.cardDesc}>Help others with your experience</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="help-circle-outline" size={26} color={Colors.primaryRed} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Ask questions</Text>
            <Text style={styles.cardDesc}>Get advice from the community</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="compass-outline" size={26} color={Colors.primaryRed} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Discover</Text>
            <Text style={styles.cardDesc}>Find recipes and safe places</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.joinButton} onPress={handleJoin} activeOpacity={0.9}>
        <Text style={styles.joinText}>Join the community</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleMaybeLater} style={styles.maybeLater}>
        <Text style={styles.maybeLaterText}>Maybe later</Text>
      </TouchableOpacity>
      </ScrollView>
    </AppScaffold>
  );
}

const GREEN = '#8BC34A';

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexGrow: 1,
    paddingBottom: 120,
  },
  header: { width: '100%', height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  back: { position: 'absolute', left: 0, top: 14, padding: 12 },
  backText: { fontSize: 22, color: '#222' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#222' },
  mascot: { width: 180, height: 180, marginTop: 6 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 6, color: '#222', fontFamily: 'Poppins_700Bold' },
  titleAccent: { color: GREEN, fontFamily: 'Poppins_700Bold' },
  subtitle: { fontSize: 13, color: '#7A7A7A', textAlign: 'center', marginTop: 12, lineHeight: 20, maxWidth: 340, fontFamily: 'Poppins_400Regular' },
  highlight: { color: GREEN, marginTop: 14, fontWeight: '700', fontFamily: 'Poppins_600SemiBold' },
  cardList: { width: '100%', marginTop: 18 },
  cardRow: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: Spacing.lg,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'transparent',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: '700', color: '#222', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  cardDesc: { color: '#8A8A8A', marginTop: 6, fontSize: 14, fontFamily: 'Poppins_400Regular' },
  joinButton: {
    backgroundColor: GREEN,
    paddingVertical: 18,
    borderRadius: 48,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 12,
  },
  joinText: { color: '#fff', fontWeight: '800', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  maybeLater: { marginTop: 18, alignSelf: 'center' },
  maybeLaterText: { color: '#9B9B9B', fontFamily: 'Poppins_500Medium' },
});
