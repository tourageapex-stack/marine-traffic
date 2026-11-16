export type BarColor = 'green' | 'yellow' | 'red';

export interface BarStatus {
  color: BarColor;
  rating: string;
  label: string;
  detail: string;
  date: string;
  sourceUrl: string;
}

export const fetchBarStatus = async (): Promise<BarStatus> => {
  const response = await fetch('/api/bar-status', { cache: 'no-store' });
  if (!response.ok) throw new Error('Bar status unavailable');
  const data = (await response.json()) as BarStatus;
  if (!data?.color || !data.rating || !data.label) throw new Error('Bar status unavailable');
  return data;
};
