type NavLike = {
  navigate: (name: string, params?: object) => void;
  getParent?: () => NavLike | undefined;
};

export type OpenRescueCaseDetailOptions = {
  openHelpOffers?: boolean;
};

export function openRescueCaseDetail(
  nav: NavLike,
  caseId: string,
  options: OpenRescueCaseDetailOptions = {},
) {
  const detailParams = options.openHelpOffers
    ? { caseId, openHelpOffers: true as const }
    : { caseId };

  nav.navigate('MainTabs', {
    screen: 'Feed',
    params: {
      screen: 'RescueHub',
      params: {
        screen: 'Detail',
        params: detailParams,
      },
    },
  });
}
