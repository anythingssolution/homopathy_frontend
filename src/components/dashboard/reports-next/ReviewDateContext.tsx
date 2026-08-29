import React, { createContext, useContext, useMemo, useState } from 'react';
import { rangeForFilter, type CustomRange } from './lib';

type ReviewDateContextValue = {
  dateFilter: string;
  setDateFilter: (value: string) => void;
  customDateRange: CustomRange;
  setCustomDateRange: React.Dispatch<React.SetStateAction<CustomRange>>;
  range: CustomRange;
};

const ReviewDateContext = createContext<ReviewDateContextValue | null>(null);

export const ReviewDateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dateFilter, setDateFilter] = useState('1_month');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const range = useMemo(
    () => rangeForFilter(dateFilter, customDateRange),
    [dateFilter, customDateRange],
  );

  return (
    <ReviewDateContext.Provider
      value={{ dateFilter, setDateFilter, customDateRange, setCustomDateRange, range }}
    >
      {children}
    </ReviewDateContext.Provider>
  );
};

export const useReviewDate = () => {
  const ctx = useContext(ReviewDateContext);
  if (!ctx) throw new Error('useReviewDate must be used inside ReviewDateProvider');
  return ctx;
};
