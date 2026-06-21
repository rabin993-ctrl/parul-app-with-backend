import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { RootNavigator } from './RootNavigator';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';
import { useInAppNotificationBanner } from '../hooks/useInAppNotificationBanner';
import { NotificationBanner } from '../components/ui/NotificationBanner';
import { MentionActionProvider } from '../context/MentionActionContext';
import { openNotifications, routeNotificationTarget } from './notificationRouting';

const linking = {
  prefixes: Platform.OS === 'web'
    ? [typeof window !== 'undefined' ? window.location.origin : '']
    : [],
  config: {
    screens: {
      MainTabs: {
        path: '',
        screens: {
          Feed: {
            path: '',
            screens: {
              FeedHome: '',
              Search: 'search',
              FeedPostDetail: 'post/:postId',
              AdoptionHub: {
                path: 'adoption',
                screens: {
                  Listing: '',
                  Detail: 'pet/:listingId',
                  EditPost: 'edit/:listingId',
                  CreatePost: 'new',
                  Confirmation: 'confirm/:listingId/:requestId',
                  Search: 'search',
                  ManagePost: 'manage/:listingId',
                  AdoptedDetail: 'adopted/:recordId',
                },
              },
              RescueHub: {
                path: 'rescue',
                screens: {
                  Listing: '',
                  Detail: 'case/:caseId',
                  PostUpdate: 'update/:caseId',
                  Search: 'search',
                  CreateCase: 'new',
                },
              },
            },
          },
          Community: {
            path: 'community',
            screens: {
              Feed: '',
              PostDetail: 'post/:postId',
              CreatePost: 'create-post',
              Search: 'search',
              Rules: 'rules',
              Settings: 'settings',
              Saved: 'saved',
              Group: 'group/:communityId',
              Admin: 'admin/:communityId',
              GroupMembers: 'group-members/:communityId',
              Members: 'members',
              PendingRequests: 'pending',
              Discover: 'discover',
              Create: 'new',
            },
          },
          Circles: {
            path: 'circles',
            screens: {
              Hub: '',
              Explore: 'explore',
              CircleChat: 'chat/:circleId',
              CircleMembers: 'members/:circleId',
              CircleSettings: 'settings/:circleId',
              CircleAdmin: 'admin/:circleId',
              UserProfile: 'user/:userId',
              PublicAdoptedDetail: 'adopted/:recordId',
              FeedPostDetail: 'post/:postId',
              ChatThread: 'ChatThread',
            },
          },
          Vet: {
            path: 'vet',
            screens: {
              Home: '',
              History: 'history',
              UrgentIssue: 'urgent',
              UrgentPet: 'urgent-pet/:issueId',
              UrgentDetails: 'urgent-details/:issueId/:petId',
              Matching: 'matching/:consultId',
              Assigned: 'assigned/:consultId',
              Browse: 'browse',
              VetProfile: 'vet-profile/:vetId',
              Payment: 'payment/:consultId',
              Status: 'status/:consultId',
              Chat: 'vet-chat/:consultId',
              Receipt: 'receipt/:consultId',
            },
          },
          Profile: {
            path: 'profile',
            screens: {
              Home: '',
              Settings: 'settings',
              Posts: 'posts',
              Saved: 'saved',
              Activity: 'activity',
              FeedPostDetail: 'feed-post/:postId',
              Rescues: 'rescues',
              SuccessfulAdoptions: 'successful-adoptions',
              Adopted: 'adopted',
              ReviewsSafety: 'reviews',
              Privacy: 'privacy',
              BlockedUsers: 'blocked',
              PrivacyPolicy: 'privacy-policy',
              TermsOfService: 'terms',
              RescueDetail: 'rescue/:caseId',
              AdoptionDetail: 'adoption/:showcaseId',
              AdoptedDetail: 'adopted-detail/:recordId',
              Companion: 'companion/:companionId',
            },
          },
        },
      },
      Notifications: 'notifications',
    },
  },
};

export function AppNavigator() {
  const { colors, mode } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<ParamListBase>>(null);
  useNotificationDeepLink(navigationRef);
  const { banner, clearBanner } = useInAppNotificationBanner();

  const handleBannerTap = () => {
    const nav = navigationRef.current;
    if (!nav?.isReady()) return;
    clearBanner();
    if (banner?.data && (banner.data.entity_type || banner.data.type || banner.data.entity_id)) {
      void routeNotificationTarget(nav, banner.data);
    } else {
      openNotifications(nav);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={{
          dark: mode === 'dark',
          colors: {
            primary: colors.primary,
            background: colors.bg,
            card: colors.bg,
            text: colors.text,
            border: colors.border,
            notification: colors.danger,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}
      >
        <MentionActionProvider>
          <RootNavigator />
        </MentionActionProvider>
      </NavigationContainer>

      <NotificationBanner
        banner={banner}
        onDismiss={clearBanner}
        onTap={handleBannerTap}
      />
    </View>
  );
}
