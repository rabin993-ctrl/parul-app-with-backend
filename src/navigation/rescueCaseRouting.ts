import { getRootNavigation } from './notificationRouting';

type NavLike = {
  navigate: (name: string, params?: object) => void;
  getParent?: () => NavLike | undefined;
  getState?: () => {
    index: number;
    routes: { name: string }[];
  };
};

export type OpenRescueCaseDetailOptions = {
  openHelpOffers?: boolean;
};

export function openRescuePostUpdate(nav: NavLike, caseId: string) {
  const state = nav.getState?.();
  const currentRoute = state?.routes[state.index]?.name;
  if (currentRoute === 'RescueDetail' || currentRoute === 'Detail') {
    nav.navigate('PostUpdate', { caseId });
    return;
  }

  getRootNavigation(nav).navigate('RescueCaseFlow', {
    caseId,
    screen: 'PostUpdate',
    params: { caseId },
  });
}

export function openRescueCaseDetail(
  nav: NavLike,
  caseId: string,
  options: OpenRescueCaseDetailOptions = {},
) {
  const state = nav.getState?.();
  const currentRoute = state?.routes[state.index]?.name;
  if (currentRoute === 'RescueDetail') {
    nav.navigate('RescueDetail', {
      caseId,
      ...(options.openHelpOffers ? { openHelpOffers: true as const } : {}),
    });
    return;
  }

  getRootNavigation(nav).navigate('RescueCaseFlow', {
    caseId,
    ...(options.openHelpOffers ? { openHelpOffers: true as const } : {}),
  });
}
