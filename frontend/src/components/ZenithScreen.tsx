import { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { zenith } from '@/constants/zenithTheme';

type ZenithScreenProps = PropsWithChildren<{
  bottomNav?: ReactNode;
  scroll?: boolean;
}>;

export function ZenithScreen({ bottomNav, children, scroll = true }: ZenithScreenProps) {
  const hasBottomNav = Boolean(bottomNav);
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, hasBottomNav ? styles.contentWithNav : null]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.staticContent, hasBottomNav ? styles.contentWithNav : null]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoider}>
        {content}
        {bottomNav}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: zenith.colors.background,
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: zenith.spacing.page,
    paddingBottom: 40,
  },
  contentWithNav: {
    paddingBottom: zenith.spacing.bottomNav + 24,
  },
  staticContent: {
    flex: 1,
  },
});
