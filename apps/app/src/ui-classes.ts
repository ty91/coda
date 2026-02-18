export const panelSurfaceClass =
  'rounded-coda-lg border border-coda-line-soft bg-linear-to-br from-coda-surface to-coda-surface-strong shadow-coda-soft backdrop-blur-[8px]';

export const headerRowClass = 'flex items-start justify-between gap-3';

export const eyebrowClass = 'text-coda-text-muted text-[0.72rem] font-semibold tracking-[0.13em] uppercase';

export const subtleTextClass = 'text-coda-text-secondary text-[0.92rem] leading-[1.5]';

export const messageTextClass = subtleTextClass;

export const ghostButtonClass =
  'cursor-pointer rounded-full border border-coda-line-strong bg-coda-surface-strong px-3 py-[0.45rem] text-[0.86rem] font-medium transition-[border-color,transform,box-shadow] duration-150 hover:enabled:-translate-y-px hover:enabled:border-coda-text-primary hover:enabled:shadow-coda-soft disabled:cursor-wait disabled:opacity-60';

export const treeRowClass =
  'flex min-h-[2.15rem] w-full items-center gap-2 border-0 bg-transparent text-left [padding-left:calc(0.75rem+(var(--depth,1)*0.82rem))] px-[0.65rem] py-[0.35rem]';

export const markdownContentClass =
  'mt-4 text-coda-text-primary [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:rounded-[5px] [&_code]:border [&_code]:border-[#e1e1dc] [&_code]:bg-[#f0f0ee] [&_code]:px-[0.28rem] [&_code]:py-[0.08rem] [&_code]:font-mono [&_code]:text-[0.88em] [&_li]:leading-[1.6] [&_ol]:pl-5 [&_p]:leading-[1.6] [&_pre]:overflow-x-auto [&_pre]:rounded-coda-sm [&_pre]:border [&_pre]:border-[#e2e2de] [&_pre]:bg-coda-bg-elevated [&_pre]:p-3 [&_ul]:pl-5';
