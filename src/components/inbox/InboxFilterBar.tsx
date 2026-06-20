import React from 'react';
import { Segmented } from '../ui/Segmented';
import type { PawCircleInboxFilter } from '../../navigation/pawCircleInboxRouting';

export type InboxFilterOption = {
  id: PawCircleInboxFilter;
  label: string;
  dot?: boolean;
};

export function InboxFilterBar({
  value,
  onChange,
  options,
}: {
  value: PawCircleInboxFilter;
  onChange: (id: PawCircleInboxFilter) => void;
  options: InboxFilterOption[];
}) {
  return (
    <Segmented
      options={options}
      value={value}
      onChange={id => onChange(id as PawCircleInboxFilter)}
    />
  );
}
