type IconName =
  | 'shield'
  | 'camera'
  | 'pin'
  | 'users'
  | 'alert'
  | 'check'
  | 'flag'
  | 'clock'
  | 'arrow'
  | 'external'
  | 'menu'
  | 'close'
  | 'upload'
  | 'locate'
  | 'lock'
  | 'plus'
  | 'chat'
  | 'wrench'
  | 'chevron'
  | 'spark'
  | 'copy';

const paths: Record<IconName, string> = {
  shield: 'M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z',
  camera:
    'M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z M12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 1113 0C18.5 15 12 21 12 21z M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  users:
    'M16 19v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V19 M9 9.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M17 3.2a3.5 3.5 0 010 6.6 M22 19v-1.5a4 4 0 00-3-3.87',
  alert: 'M12 3l9.5 17H2.5L12 3z M12 9v5 M12 17.2v.1',
  check: 'M4 12.5l5 5L20 6.5',
  flag: 'M5 21V4 M5 4h11l-1.5 4L16 12H5',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7.5V12l3.2 2',
  arrow: 'M4 12h15 M13 6l6 6-6 6',
  external: 'M14 4h6v6 M20 4l-9 9 M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  close: 'M6 6l12 12 M18 6L6 18',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3',
  locate: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 16a4 4 0 100-8 4 4 0 000 8z M12 2v2 M12 20v2 M2 12h2 M20 12h2',
  lock: 'M6 10.5h12a1 1 0 011 1V20a1 1 0 01-1 1H6a1 1 0 01-1-1v-8.5a1 1 0 011-1z M8.5 10.5V7a3.5 3.5 0 017 0v3.5',
  plus: 'M12 5v14 M5 12h14',
  chat: 'M20 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h12a2 2 0 012 2v10z',
  wrench:
    'M14.7 6.3a4.5 4.5 0 00-6 5.9L3 18l3 3 5.8-5.8a4.5 4.5 0 005.9-6l-2.6 2.6-2.9-2.9 2.5-2.6z',
  chevron: 'M9 5l7 7-7 7',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  copy: 'M9 9h9a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V10a1 1 0 011-1z M15 9V5a1 1 0 00-1-1H5a1 1 0 00-1 1v9a1 1 0 001 1h3',
};

export default function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
