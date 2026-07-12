import { Link, LinkProps, usePathname } from 'expo-router';
import { BarChart3, Bot, ClipboardList, Dumbbell, Home, LucideIcon, Zap } from 'lucide-react-native';
import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { zenith } from '@/constants/zenithTheme';

export function ZenithHeader({ right, subtitle, title }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {subtitle && <Text style={styles.eyebrow}>{subtitle}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function ZenithLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoMark, compact && styles.logoMarkCompact]}>
        <Zap color={zenith.colors.primaryForeground} fill={zenith.colors.primaryForeground} size={compact ? 14 : 18} />
      </View>
      <Text style={[styles.logoText, compact && styles.logoTextCompact]}>ZENITH</Text>
    </View>
  );
}

export function ZenithCard({ children, style }: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ZenithPill({ children, color, active }: PropsWithChildren<{ active?: boolean; color?: string }>) {
  const accent = color ?? (active ? zenith.colors.primary : zenith.colors.muted);
  return (
    <Text style={[styles.pill, { backgroundColor: `${accent}22`, color: accent }]}>{children}</Text>
  );
}

export function ZenithButton({ disabled, icon, onPress, title, variant = 'primary' }: {
  disabled?: boolean;
  icon?: ReactNode;
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonSecondaryText]}>{title}</Text>
    </Pressable>
  );
}

export function ZenithIconButton({ children, href, onPress, style }: PropsWithChildren<{ href?: LinkProps['href']; onPress?: () => void; style?: ViewStyle }>) {
  const content = <View style={[styles.iconButton, style]}>{children}</View>;
  if (href) {
    return <Link href={href} asChild><Pressable>{content}</Pressable></Link>;
  }
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export function ZenithNotice({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'danger' | 'warning' }>) {
  return <Text style={[styles.notice, noticeStyles[tone]]}>{children}</Text>;
}

export function ZenithStatCard({ icon, label, value, unit }: { icon?: ReactNode; label: string; value: string; unit?: string }) {
  return (
    <ZenithCard style={styles.statCard}>
      <View style={styles.statHeader}>
        <View>{icon}</View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
    </ZenithCard>
  );
}

const navItems: { href: LinkProps['href']; label: string; match: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Inicio', match: '/dashboard', icon: Home },
  { href: '/routines', label: 'Rutinas', match: '/routines', icon: ClipboardList },
  { href: '/exercises', label: 'Ejercicios', match: '/exercises', icon: Dumbbell },
  { href: '/stats', label: 'Stats', match: '/stats', icon: BarChart3 },
  { href: '/coach' as never, label: 'Coach', match: '/coach', icon: Bot },
];

export function ZenithBottomNav() {
  const pathname = usePathname();
  return (
    <View style={styles.bottomNav}>
      {navItems.map((item) => {
        const active = pathname === item.match;
        const Icon = item.icon;
        return (
          <Link key={item.match} href={item.href} asChild>
            <Pressable style={styles.navItem}>
              <Icon color={active ? zenith.colors.primary : zenith.colors.muted} size={20} />
              <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
              {active && <View style={styles.navDot} />}
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

export const zenithText = StyleSheet.create({
  body: {
    color: zenith.colors.foreground,
    fontFamily: zenith.font.body,
  },
  muted: {
    color: zenith.colors.muted,
    fontFamily: zenith.font.body,
  },
  mono: {
    fontFamily: zenith.font.mono,
  },
  display: {
    fontFamily: zenith.font.display,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  } as TextStyle,
});

const noticeStyles = StyleSheet.create({
  neutral: { backgroundColor: zenith.colors.secondary, color: zenith.colors.foreground },
  success: { backgroundColor: 'rgba(78,239,196,0.12)', color: zenith.colors.cyan },
  danger: { backgroundColor: zenith.colors.dangerSoft, color: '#ffb4b4' },
  warning: { backgroundColor: 'rgba(241,181,53,0.12)', color: zenith.colors.amber },
});

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: zenith.colors.muted,
    fontFamily: zenith.font.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: zenith.colors.foreground,
    fontFamily: zenith.font.display,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.4,
    lineHeight: 36,
    textTransform: 'uppercase',
  },
  logoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: zenith.colors.primary,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  logoMarkCompact: {
    borderRadius: 10,
    height: 30,
    width: 30,
  },
  logoText: {
    color: zenith.colors.foreground,
    fontFamily: zenith.font.display,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },
  logoTextCompact: {
    fontSize: 22,
  },
  card: {
    backgroundColor: zenith.colors.card,
    borderColor: zenith.colors.border,
    borderRadius: zenith.radius.xl,
    borderWidth: 1,
    padding: 16,
  },
  pill: {
    borderRadius: zenith.radius.pill,
    fontFamily: zenith.font.mono,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  button: {
    alignItems: 'center',
    backgroundColor: zenith.colors.primary,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 15,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderColor: zenith.colors.border,
    borderWidth: 1,
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(232,64,64,0.3)',
    borderWidth: 1,
  },
  buttonText: {
    color: zenith.colors.primaryForeground,
    fontFamily: zenith.font.bodyBold,
    fontSize: 15,
    fontWeight: '900',
  },
  buttonSecondaryText: {
    color: zenith.colors.foreground,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: zenith.colors.secondary,
    borderRadius: zenith.radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  notice: {
    borderRadius: zenith.radius.md,
    fontFamily: zenith.font.bodyMedium,
    lineHeight: 20,
    overflow: 'hidden',
    padding: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    padding: 13,
  },
  statHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  statLabel: {
    color: zenith.colors.muted,
    fontFamily: zenith.font.mono,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  statValue: {
    color: zenith.colors.foreground,
    fontFamily: zenith.font.display,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  statUnit: {
    color: zenith.colors.muted,
    fontFamily: zenith.font.body,
    fontSize: 11,
  },
  bottomNav: {
    alignItems: 'stretch',
    backgroundColor: '#0d0d14',
    borderTopColor: zenith.colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    height: 78,
    left: 0,
    paddingBottom: 10,
    position: 'absolute',
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  navText: {
    color: zenith.colors.muted,
    fontFamily: zenith.font.mono,
    fontSize: 10,
  },
  navTextActive: {
    color: zenith.colors.primary,
  },
  navDot: {
    backgroundColor: zenith.colors.primary,
    borderRadius: 999,
    height: 4,
    position: 'absolute',
    top: 7,
    width: 4,
  },
});
