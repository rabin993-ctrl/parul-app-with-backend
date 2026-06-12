import React from 'react';
import { InputAccessoryView, Platform, View } from 'react-native';

/** Attach to TextInputs via inputAccessoryViewID to hide the default iOS form bar. */
export const BLANK_INPUT_ACCESSORY_ID = 'parul-blank-input-accessory';

export function BlankInputAccessory() {
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={BLANK_INPUT_ACCESSORY_ID}>
      <View style={{ width: 1, height: 1, opacity: 0 }} />
    </InputAccessoryView>
  );
}

export function commentTextInputProps(isDark: boolean) {
  if (Platform.OS !== 'ios') return {};

  return {
    inputAccessoryViewID: BLANK_INPUT_ACCESSORY_ID,
    keyboardAppearance: isDark ? 'dark' as const : 'light' as const,
  };
}
