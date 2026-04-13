type RelativeTimeLabelOptions = {
  suffix: string;
};

export const getDateTimestamp = (value: string) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getRelativeTimeLabel = (
  value: string,
  { suffix }: RelativeTimeLabelOptions,
) => {
  const timestamp = getDateTimestamp(value);
  if (timestamp === 0) {
    return `방금 전 ${suffix}`;
  }

  const diffMs = Math.max(0, Date.now() - timestamp);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < minuteMs) {
    return `방금 전 ${suffix}`;
  }

  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}분 전 ${suffix}`;
  }

  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)}시간 전 ${suffix}`;
  }

  if (diffMs < weekMs) {
    return `${Math.floor(diffMs / dayMs)}일 전 ${suffix}`;
  }

  return `${Math.floor(diffMs / weekMs)}주 전 ${suffix}`;
};
