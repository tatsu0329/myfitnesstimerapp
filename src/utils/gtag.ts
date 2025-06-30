declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Analytics 4 (GA4) の設定
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_location: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// カスタムイベント: 修行開始
export const trackWorkoutStart = (workoutTime: number, restTime: number) => {
  event({
    action: 'workout_start',
    category: 'workout',
    label: `workout_${workoutTime}s_rest_${restTime}s`,
  });
};

// カスタムイベント: 修行完了
export const trackWorkoutComplete = (sets: number, totalTime: number) => {
  event({
    action: 'workout_complete',
    category: 'workout',
    label: `${sets}_sets`,
    value: totalTime,
  });
};

// カスタムイベント: 設定変更
export const trackSettingChange = (settingType: string, value: string | number) => {
  event({
    action: 'setting_change',
    category: 'settings',
    label: `${settingType}_${value}`,
  });
};

// カスタムイベント: 通知設定変更
export const trackNotificationSetting = (type: 'sound' | 'vibration', enabled: boolean) => {
  event({
    action: 'notification_setting',
    category: 'settings',
    label: `${type}_${enabled ? 'on' : 'off'}`,
  });
};

// カスタムイベント: 履歴削除
export const trackHistoryDelete = (type: 'single' | 'all') => {
  event({
    action: 'history_delete',
    category: 'history',
    label: type,
  });
};

// カスタムイベント: ページビュー
export const trackPageView = (pageName: string) => {
  event({
    action: 'page_view',
    category: 'navigation',
    label: pageName,
  });
}; 