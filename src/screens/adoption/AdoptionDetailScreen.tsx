import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { PhotoViewerModal } from '../../components/ui/PhotoViewerModal';
import { SectionHead } from '../../components/ui/SectionHead';
import { Stars } from '../../components/ui/Stars';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useAdoption } from '../../context/AdoptionContext';
import {
  isActiveAdoptionRequest,
  useAdoptionFeed,
} from '../../context/AdoptionFeedContext';
import { useAuth } from '../../context/AuthContext';
import { getAdoptionListing, statusBadgeTone } from '../../data/adoptionData';
import { canPosterRelistAdoption, getAdoptionRecordForListing } from '../../data/adoptionRecords';
import { successfulPlacementLabel } from '../../utils/chatThreadMeta';
import { performPosterRelist } from '../../utils/adoptionRelist';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';
import { useAdoptionListingDetailBack } from '../../navigation/adoptionListingDetailBack';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Route = RouteProp<AdoptionStackParamList, 'Detail'>;
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'Detail'>;

export function AdoptionDetailScreen({ onCloseOverride }: { onCloseOverride?: () => void } = {}) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { listingId, returnTo } = useRoute<Route>().params;
  const { user } = useAuth();
  const {
    listings,
    relistListing,
    clearRequestOnRelist,
    submitRequest,
    cancelRequest,
    getRequestForListing,
  } = useAdoptionFeed();
  const { records, relistAdoptionPlacement, dismissAdoptionThread } = useAdoption();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const listing = useMemo(() => getAdoptionListing(listingId, listings), [listingId, listings]);
  const adopted = listing?.status === 'Adopted';
  const myRequest = listing ? getRequestForListing(listing.id) : undefined;
  const hasActiveRequest = !!myRequest && isActiveAdoptionRequest(myRequest);
  const posterMini = useUserProfile(listing?.userId ?? null);
  const poster = posterMini ?? (listing ? { id: listing.userId, name: 'Pet owner', handle: listing.userId.slice(0, 8), tint: '#888888' } : null);
  const isOwner = !!user?.id && listing?.userId === user.id;
  const adoptionRecord = useMemo(
    () => getAdoptionRecordForListing(records, listingId, user?.id),
    [records, listingId, user?.id],
  );
  const canRelist = !!(
    adopted && isOwner && user?.id && adoptionRecord && canPosterRelistAdoption(adoptionRecord, user.id)
  );

  const handleRelist = () => {
    if (!adoptionRecord) return;
    const ok = performPosterRelist(
      adoptionRecord,
      relistAdoptionPlacement,
      relistListing,
      clearRequestOnRelist,
      dismissAdoptionThread,
      adoptionRecord.chatThreadId,
    );
    if (!ok) return;
    setToast({
      msg: `${listing?.name ?? 'Pet'} is live for adoption again`,
      icon: 'adoption',
      tone: 'success',
    });
  };

  const handleRequest = () => {
    if (!listing || isOwner || adopted) return;
    submitRequest({
      listingId: listing.id,
      listingName: listing.name,
      posterId: listing.userId,
      message: `I'd like to adopt ${listing.name}.`,
    });
    setToast({ msg: `Request sent for ${listing.name}`, icon: 'adoption', tone: 'success' });
  };

  const handleCancelRequest = () => {
    if (!myRequest || !listing) return;
    cancelRequest(myRequest.id);
    setToast({ msg: `Request for ${listing.name} cancelled`, icon: 'close', tone: 'success' });
  };

  const handleBackFromReturn = useAdoptionListingDetailBack(returnTo);

  const handleBack = () => {
    if (onCloseOverride) onCloseOverride();
    else handleBackFromReturn();
  };

  const mediaUrls = listing?.mediaUrls ?? [];
  const openPhotoViewer = (index: number) => {
    setGalleryIndex(index);
    setViewerOpen(true);
  };

  if (!listing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Pet profile" onBack={handleBack} />
        <View style={styles.missing}>
          <Text style={{ color: colors.textSecondary }}>This listing is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader
        title={listing.name}
        onBack={handleBack}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPad }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <View style={styles.galleryWrap}>
          <PhotoSlot
            height={260}
            uri={mediaUrls[galleryIndex]}
            imageKey={listing.id}
            imageIndex={galleryIndex}
            borderRadius={0}
            label=""
            onPress={mediaUrls.length > 0 ? () => openPhotoViewer(galleryIndex) : undefined}
          />
          {adopted && (
            <View style={[styles.adoptedBanner, { backgroundColor: colors.success + 'EE' }]}>
              <Icon name="adoption" size={16} color="#fff" />
              <Text style={styles.adoptedBannerText}>
                {successfulPlacementLabel(isOwner)}
              </Text>
              {listing.adoptedDate && (
                <Text style={styles.adoptedDate}>{listing.adoptedDate}</Text>
              )}
            </View>
          )}
          {(listing.mediaUrls?.length ?? 0) > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {mediaUrls.map((uri, i) => (
                <Pressable key={i} onPress={() => openPhotoViewer(i)}>
                  <PhotoSlot
                    height={52}
                    uri={uri}
                    imageKey={listing.id}
                    imageIndex={i}
                    borderRadius={radius.sm}
                    label=""
                    style={{ width: 52 }}
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]}>{listing.name}</Text>
                {isOwner && (
                  <IconButton
                    name="edit"
                    size={32}
                    tone="soft"
                    color={colors.textSecondary}
                    onPress={() => navigation.navigate('EditPost', { listingId: listing.id })}
                  />
                )}
              </View>
              <Text style={[styles.breed, { color: colors.textSecondary }]}>
                {listing.breed} · {listing.age} · {listing.gender}
              </Text>
            </View>
            <Badge tone={statusBadgeTone(listing.status)}>
              {adopted ? 'Adopted' : listing.status}
            </Badge>
          </View>

          <View style={[styles.traitsRow, { borderColor: colors.border }]}>
            {[
              { icon: listing.icon, label: listing.species },
              { icon: 'mapPin', label: listing.location },
              { icon: 'vaccine', label: listing.vacc },
            ].map((t, i) => (
              <View
                key={i}
                style={[styles.trait, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}
              >
                <Icon name={t.icon} size={18} color={colors.primary} fill={t.icon === listing.icon ? colors.primary : 'none'} />
                <Text style={[styles.traitText, { color: colors.text }]}>{t.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.personality, { color: colors.text }]}>
            “{listing.personality}”
          </Text>

          {poster && <View style={[styles.posterRow, { backgroundColor: colors.surface2 }]}>
            <Avatar user={poster} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.posterLabel, { color: colors.textTertiary }]}>Listed by</Text>
              <Text style={[styles.posterName, { color: colors.text }]}>{poster.name}</Text>
              {listing.rating && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Stars value={listing.rating} size={12} />
                  <Text style={[styles.reviews, { color: colors.textTertiary }]}>
                    ({listing.reviews} reviews)
                  </Text>
                </View>
              )}
            </View>
            <Icon name="comment" size={20} color={colors.textSecondary} />
          </View>}

          <SectionHead title="Story" />
          <Text style={[styles.story, { color: colors.textSecondary }]}>{listing.story}</Text>

          <SectionHead title="Health & care" />
          <View style={styles.healthGrid}>
            <HealthPill icon="vaccine" label="Vaccines" value={listing.vacc} colors={colors} />
            <HealthPill icon="medical" label="Sterilization" value={listing.neutered ? 'Yes' : 'No'} colors={colors} />
            <HealthPill icon="microchip" label="Chip" value={listing.microchipped ? 'Yes' : 'No'} colors={colors} />
          </View>
          <Text style={[styles.healthNotes, { color: colors.textSecondary }]}>{listing.healthNotes}</Text>

          {listing.requirements.length > 0 && (
            <>
              <SectionHead title="Adoption requirements" />
              <View style={{ gap: 8 }}>
                {listing.requirements.map((req, i) => (
                  <View key={i} style={styles.reqRow}>
                    <Icon name="check" size={16} color={colors.success} />
                    <Text style={[styles.reqText, { color: colors.text }]}>{req}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {adopted && listing.adoptedNote && (
            <View style={[styles.successCard, { backgroundColor: colors.successBg, borderColor: colors.success + '33' }]}>
              <Icon name="adoption" size={20} color={colors.success} />
              <Text style={[styles.successText, { color: colors.text }]}>{listing.adoptedNote}</Text>
            </View>
          )}

          {canRelist && (
            <View style={[styles.relistCard, { backgroundColor: colors.warningBg, borderColor: colors.warning + '33' }]}>
              <Text style={[styles.relistTitle, { color: colors.text }]}>
                Adoption didn&apos;t continue
              </Text>
              <Text style={[styles.relistBody, { color: colors.textSecondary }]}>
                Both sides confirmed, but the adopter hasn&apos;t followed through.
                Put {listing.name} back on Browse for a new home.
              </Text>
              <Button variant="outline" icon="adoption" onPress={handleRelist}>
                Re-list for adoption
              </Button>
            </View>
          )}

          {!isOwner && !adopted && (
            <View style={styles.footer}>
              {hasActiveRequest ? (
                <Button variant="danger" style={{ flex: 1 }} onPress={handleCancelRequest}>
                  Cancel request
                </Button>
              ) : (
                <Button variant="primary" icon="adoption" style={{ flex: 1 }} onPress={handleRequest}>
                  Request to adopt
                </Button>
              )}
            </View>
          )}

          {!isOwner && adopted && (
            <View style={styles.footer}>
              <Button variant="soft" style={{ flex: 1 }} onPress={() => setToast({ msg: 'Story shared', icon: 'forward', tone: 'success' })}>
                Share story
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      <PhotoViewerModal
        visible={viewerOpen}
        images={mediaUrls}
        initialIndex={galleryIndex}
        caption={listing.name}
        onClose={() => setViewerOpen(false)}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function HealthPill({ icon, label, value, colors }: {
  icon: string; label: string; value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.healthPill, { backgroundColor: colors.surface2 }]}>
      <Icon name={icon} size={14} color={colors.primary} />
      <Text style={[styles.healthLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.healthValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  galleryWrap: { position: 'relative' },
  adoptedBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.lg,
  },
  adoptedBannerText: { color: '#fff', fontSize: 14, fontWeight: '800', flex: 1 },
  adoptedDate: { color: '#fff', fontSize: 12, opacity: 0.9 },
  thumbs: { gap: 8, padding: 12 },
  body: { padding: 16, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 24, fontWeight: '800' },
  breed: { fontSize: 14, marginTop: 2 },
  traitsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, marginVertical: 14 },
  trait: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  traitText: { fontSize: 12.5, fontWeight: '600', textTransform: 'capitalize' },
  personality: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, marginBottom: 8 },
  posterLabel: { fontSize: 11.5 },
  posterName: { fontSize: 15, fontWeight: '700' },
  reviews: { fontSize: 11.5 },
  story: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  healthGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  healthPill: { flex: 1, padding: 10, borderRadius: radius.md, gap: 3 },
  healthLabel: { fontSize: 10, fontWeight: '600' },
  healthValue: { fontSize: 12.5, fontWeight: '700' },
  healthNotes: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  reqRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  reqText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  successCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  successText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  relistCard: {
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 12,
  },
  relistTitle: { fontSize: 15, fontWeight: '700' },
  relistBody: { fontSize: 13.5, lineHeight: 20 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 20, paddingBottom: 8, alignItems: 'center' },
});
