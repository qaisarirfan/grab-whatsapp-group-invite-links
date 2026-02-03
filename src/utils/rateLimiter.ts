import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  maxConcurrent: 25,
  minTime: 100,
  reservoir: 300,
  reservoirRefreshAmount: 300,
  reservoirRefreshInterval: 60_000,
});
