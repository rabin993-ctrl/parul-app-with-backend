import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { ForwardSheet } from '../../components/ForwardSheet';
import {
  RescueCaseHero,
  RescueActionRow,
  RescueCaseMetaStrip,
  RescueTagsRow,
} from '../../components/rescue/RescueCaseUI';
import { RescueUpdatesSection } from '../../components/rescue/RescueUpdatesSection';
import { RescueHelpOfferSheet } from '../../components/rescue/RescueHelpOfferSheet';
import { RescueHelpOfferDetailSheet } from '../../components/rescue/RescueHelpOfferDetailSheet';
import {
  RescueHelpOffersBanner,
  RescueHelpOffersListSheet,
} from '../../components/rescue/RescueHelpOffersListSheet';
import { RESCUE_STATUS_META, type RescueCase } from '../../data/profileData';
import { getRescueCaseById } from '../../data/rescueData';
import { fetchRescueCaseById } from '../../utils/rescueCases';
import { useRescueFeedOptional } from '../../context/RescueFeedContext';
import { useRescueOpenCaseBack } from '../../context/RescueOpenCaseFlowContext';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { openRescuePostUpdate } from '../../navigation/rescueCaseRouting';
import { useAuth } from '../../context/AuthContext';
import { useAdoption } from '../../context/AdoptionContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useRescueCaseShare } from '../../hooks/useRescueCaseShare';
import { ChatThreadScreen } from '../ChatThreadScreen';
import type { ChatThread } from '../../context/AdoptionContext';
import {
  countPendingHelpOffers,
  fetchCaseHelpOffers,
  fetchMyOffer,
  isRescueCaseIdUuid,
  markOffersViewed,
  reviewHelpOffer,
  submitHelpOffer,
  withdrawHelpOffer,
  type HelpOfferType,
  type RescueHelpOffer,
} from '../../utils/rescueHelpOffers';
import { openRescueHelpChat, type RescueHelpChatContext } from '../../utils/rescueHelpChat';

type Nav = NativeStackNavigationProp<Record<string, object | undefined>, string>;

type RouteParams = {
  caseId?: string;
  openHelpOffers?: boolean;
};

const HIDDEN_CASE_TAGS = new Set([
  ...Object.values(RESCUE_STATUS_META).flatMap(m => [m.label, m.shortLabel]),
  'In Vet Care',
  'Vet Care',
  'Injured',
  'Lost',
  'Found',
]);

function buildTags(item: RescueCase) {
  const species = item.species === 'cat' ? 'Cat' : item.species === 'dog' ? 'Dog' : item.species;
  const raw = item.tags?.length ? item.tags : [species];
  return raw.filter(tag => !HIDDEN_CASE_TAGS.has(tag));
}

export function RescueCaseDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const handleBack = useRescueOpenCaseBack(navigation);
  const route = useRoute();
  const routeParams = route.params as RouteParams | undefined;
  const caseId = routeParams?.caseId ?? '';
  const openHelpOffersOnMount = routeParams?.openHelpOffers === true;
  const rescueFeed = useRescueFeedOptional();
  const { user } = useAuth();
  const { registerDmThread, reloadThreads } = useAdoption();
  const { me } = useCurrentUserProfile();
  const feedItem = rescueFeed?.cases.find(c => c.id === caseId) ?? getRescueCaseById(caseId);
  const [fetchedItem, setFetchedItem] = useState<RescueCase | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseNotFound, setCaseNotFound] = useState(false);
  const item = feedItem ?? fetchedItem;
  const tabBarPad = useTabBarScrollPadding();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubmitting, setHelpSubmitting] = useState(false);
  const [myOffer, setMyOffer] = useState<RescueHelpOffer | null>(null);
  const [caseOffers, setCaseOffers] = useState<RescueHelpOffer[]>([]);
  const [offersListOpen, setOffersListOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<RescueHelpOffer | null>(null);
  const [dmThread, setDmThread] = useState<ChatThread | null>(null);

  const showToast = useCallback((t: ToastData) => setToast(t), []);
  const {
    shareOpen,
    openShare,
    closeShare,
    completeShare,
    createdCircles,
    joinedCircles,
    joinedCommunities,
  } = useRescueCaseShare(showToast);

  const reloadCaseOffers = useCallback(async () => {
    if (!caseId || !user || !item || item.userId !== user.id) {
      setCaseOffers([]);
      return;
    }
    const offers = await fetchCaseHelpOffers(caseId);
    setCaseOffers(offers);
  }, [caseId, user, item]);

  useEffect(() => {
    setFetchedItem(null);
    setCaseNotFound(false);
  }, [caseId]);

  useEffect(() => {
    if (feedItem || !caseId) {
      setCaseLoading(false);
      return;
    }
    if (!isRescueCaseIdUuid(caseId)) {
      setCaseNotFound(true);
      return;
    }
    let cancelled = false;
    setCaseLoading(true);
    void fetchRescueCaseById(caseId).then(fetched => {
      if (cancelled) return;
      setCaseLoading(false);
      if (fetched) {
        setFetchedItem(fetched);
      } else {
        setCaseNotFound(true);
      }
    });
    return () => { cancelled = true; };
  }, [caseId, feedItem]);

  useEffect(() => {
    if (!caseId || !user) {
      setMyOffer(null);
      return;
    }
    void fetchMyOffer(caseId, user.id).then(setMyOffer);
  }, [caseId, user]);

  const isOwner = !!user && !!item && item.userId === user.id;

  useEffect(() => {
    void reloadCaseOffers();
  }, [reloadCaseOffers, helpOpen, offersListOpen, selectedOffer]);

  useEffect(() => {
    if (openHelpOffersOnMount && isOwner) {
      setOffersListOpen(true);
    }
  }, [openHelpOffersOnMount, isOwner]);

  useFocusEffect(
    useCallback(() => {
      if (isOwner) {
        void reloadCaseOffers();
      }
    }, [isOwner, reloadCaseOffers]),
  );

  const handleMarkOffersViewed = useCallback(async (offerIds: string[]) => {
    if (!user) return;
    const result = await markOffersViewed(offerIds, user.id);
    if (!result.ok) return;
    setCaseOffers(prev => prev.map(o => (
      offerIds.includes(o.id) && o.status === 'offered' ? { ...o, status: 'viewed' } : o
    )));
  }, [user]);

  const handleSelectOffer = useCallback((offer: RescueHelpOffer) => {
    setOffersListOpen(false);
    setSelectedOffer(offer);
  }, []);

  const openChatForOffer = useCallback(async (
    offer: RescueHelpOffer,
    role: RescueHelpChatContext['role'],
    peer: { userId: string; name?: string; handle?: string },
  ): Promise<boolean> => {
    if (!item) return false;
    const result = await openRescueHelpChat({
      peerUserId: peer.userId,
      peerName: peer.name,
      peerHandle: peer.handle,
      peerTint: colors.primary,
      context: {
        caseId,
        caseName: item.name,
        helpType: offer.type,
        role,
      },
      helperUserId: offer.helperUserId,
    });
    if ('error' in result) {
      setToast({ msg: result.error, icon: 'alert', tone: 'danger' });
      return false;
    }
    registerDmThread(result.thread);
    await reloadThreads();
    setDmThread(result.thread);
    return true;
  }, [item, caseId, colors.primary, registerDmThread, reloadThreads]);

  const handleOpenChatForOffer = useCallback(async (offer: RescueHelpOffer): Promise<boolean> => {
    return openChatForOffer(offer, 'poster', {
      userId: offer.helperUserId,
      name: offer.helperName,
      handle: offer.helperHandle,
    });
  }, [openChatForOffer]);

  const handleOpenChatAsHelper = useCallback(async (): Promise<void> => {
    if (!myOffer || !item) return;
    const ok = await openChatForOffer(myOffer, 'helper', {
      userId: item.userId,
    });
    if (ok) setHelpOpen(false);
  }, [myOffer, item, openChatForOffer]);

  const handleAcceptOffer = useCallback(async (offer: RescueHelpOffer): Promise<boolean> => {
    if (!user || !item) return false;
    const result = await reviewHelpOffer(offer.id, 'accepted', user.id, {
      helperUserId: offer.helperUserId,
      caseId,
      caseName: item.name,
      posterName: me?.name,
      helpType: offer.type,
    });
    if (!result.ok) {
      setToast({ msg: 'Could not accept offer. Try again.', icon: 'alert', tone: 'danger' });
      return false;
    }
    await reloadCaseOffers();
    const chatOpened = await openChatForOffer(offer, 'poster', {
      userId: offer.helperUserId,
      name: offer.helperName,
      handle: offer.helperHandle,
    });
    setSelectedOffer(null);
    setToast({
      msg: chatOpened
        ? 'Offer accepted: chat opened'
        : 'Offer accepted. Could not open chat: tap the offer again.',
      icon: 'heart',
      tone: chatOpened ? 'success' : 'danger',
    });
    return true;
  }, [user, item, caseId, me?.name, reloadCaseOffers, openChatForOffer]);

  const handleDeclineOffer = useCallback(async (offer: RescueHelpOffer) => {
    if (!user) return;
    const result = await reviewHelpOffer(offer.id, 'declined', user.id);
    if (!result.ok) {
      setToast({ msg: 'Could not decline offer. Try again.', icon: 'alert', tone: 'danger' });
      return;
    }
    setToast({ msg: 'Offer declined', icon: 'heart', tone: 'neutral' });
    await reloadCaseOffers();
  }, [user, reloadCaseOffers]);

  if (!item) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Case Details" onBack={handleBack} />
        <View style={styles.loadingWrap}>
          {caseLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
              {caseNotFound ? 'Rescue case not found.' : 'Loading case…'}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const following = rescueFeed?.isFollowing(caseId) ?? false;
  const updates = item.updates ?? [];
  const aboutTags = buildTags(item);
  const helpAccepted = myOffer?.status === 'accepted';
  const helpOffered = myOffer?.status === 'offered'
    || myOffer?.status === 'viewed'
    || helpAccepted;
  const pendingOfferCount = countPendingHelpOffers(caseOffers);

  const handleFollow = () => {
    if (!user) return;
    rescueFeed?.toggleFollow(caseId);
    setToast({
      msg: following ? 'Unfollowed case' : 'Following this case',
      icon: 'paw',
      tone: 'primary',
    });
  };

  const handleHelpPress = () => {
    if (!user) {
      setToast({ msg: 'Sign in to offer help', icon: 'heart', tone: 'primary' });
      return;
    }
    if (!isRescueCaseIdUuid(caseId)) {
      setToast({ msg: 'This case cannot receive offers', icon: 'alert', tone: 'danger' });
      return;
    }
    setHelpOpen(true);
  };

  const handleHelpSubmit = async (type: HelpOfferType, message: string) => {
    if (!user) return;
    if (!isRescueCaseIdUuid(caseId)) {
      setToast({ msg: 'This case cannot receive offers', icon: 'alert', tone: 'danger' });
      return;
    }
    setHelpSubmitting(true);
    try {
      const result = await submitHelpOffer(
        caseId,
        user.id,
        type,
        message,
        me?.name,
      );
      if (!result.ok) {
        if (__DEV__) console.warn('[handleHelpSubmit]', result.error);
        setToast({
          msg: result.error ? `Could not send offer: ${result.error}` : 'Could not send offer. Try again.',
          icon: 'alert',
          tone: 'danger',
        });
        return;
      }
      const offer = await fetchMyOffer(caseId, user.id);
      setMyOffer(offer);
      setToast({ msg: 'Offer sent: the poster has been notified', icon: 'heart', tone: 'success' });
    } finally {
      setHelpSubmitting(false);
    }
  };

  const handleHelpWithdraw = async () => {
    if (!user) return;
    setHelpSubmitting(true);
    try {
      const result = await withdrawHelpOffer(caseId, user.id);
      if (!result.ok) {
        setToast({ msg: 'Could not withdraw offer. Try again.', icon: 'alert', tone: 'danger' });
        return;
      }
      setMyOffer(null);
      setHelpOpen(false);
      setToast({ msg: 'Offer withdrawn', icon: 'heart', tone: 'neutral' });
      if (isOwner) void reloadCaseOffers();
    } finally {
      setHelpSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader
        title={isOwner ? item.name : 'Case Details'}
        rightIcon="forward"
        onBack={handleBack}
        onRightPress={() => openShare(item)}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
      >
        <RescueCaseHero item={item} />

        {isOwner ? (
          <RescueHelpOffersBanner
            count={pendingOfferCount}
            onPress={() => setOffersListOpen(true)}
          />
        ) : (
          <RescueActionRow
            following={following}
            helpOffered={helpOffered}
            helpAccepted={helpAccepted}
            onFollow={handleFollow}
            onHelp={handleHelpPress}
            onShare={() => openShare(item)}
          />
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About the Case</Text>
          <Text style={[styles.body, { color: colors.text }]}>{item.story}</Text>
          {aboutTags.length > 0 && <RescueTagsRow tags={aboutTags} />}
        </View>

        <RescueCaseMetaStrip item={item} />

        <RescueUpdatesSection
          updates={updates}
          caseName={item.name}
          tint={item.tint}
          isOwner={isOwner}
          onPostUpdate={isOwner ? () => openRescuePostUpdate(navigation, caseId) : undefined}
        />
      </ScrollView>

      <ForwardSheet
        visible={shareOpen}
        createdCircles={createdCircles}
        joinedCircles={joinedCircles}
        joinedCommunities={joinedCommunities}
        onClose={closeShare}
        onSelect={completeShare}
      />

      <RescueHelpOfferSheet
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
        existingOffer={myOffer}
        onSubmit={handleHelpSubmit}
        onWithdraw={handleHelpWithdraw}
        submitting={helpSubmitting}
        onOpenChat={handleOpenChatAsHelper}
      />

      <RescueHelpOffersListSheet
        visible={offersListOpen}
        onClose={() => setOffersListOpen(false)}
        offers={caseOffers}
        onSelectOffer={handleSelectOffer}
        onMarkViewed={handleMarkOffersViewed}
      />

      <RescueHelpOfferDetailSheet
        visible={!!selectedOffer}
        onClose={() => setSelectedOffer(null)}
        offer={selectedOffer}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
        onOpenChat={handleOpenChatForOffer}
        onError={msg => setToast({ msg, icon: 'alert', tone: 'danger' })}
      />

      {dmThread ? (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setDmThread(null)}>
          <ChatThreadScreen
            thread={dmThread}
            onClose={() => setDmThread(null)}
            rescueCaseOriginId={caseId}
          />
        </Modal>
      ) : null}

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  notFoundText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, gap: 16, paddingTop: 4 },
  section: { gap: 10 },
  sectionTitle: { ...typography.title, fontSize: 16 },
  body: { fontSize: 15, lineHeight: 23 },
});
