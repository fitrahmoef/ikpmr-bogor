// One icon set: lucide paths on a 24 grid, 1.5 stroke, color from the text role.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const I = ({ children, ...p }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {children}
  </svg>
);

export const IconAcademic = (p: P) => <I {...p}><path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></I>;
export const IconUsers = (p: P) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></I>;
export const IconMusic = (p: P) => <I {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></I>;
export const IconTech = (p: P) => <I {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m7 8 3 2-3 2M13 12h4"/></I>;
export const IconMail = (p: P) => <I {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></I>;
export const IconInsta = (p: P) => <I {...p}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></I>;
export const IconChat = (p: P) => <I {...p}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></I>;
export const IconPin = (p: P) => <I {...p}><path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></I>;
export const IconArrow = (p: P) => <I {...p}><path d="M5 12h14M12 5l7 7-7 7"/></I>;
export const IconCheck = (p: P) => <I {...p}><path d="M20 6 9 17l-5-5"/></I>;
export const IconMenu = (p: P) => <I {...p}><path d="M4 7h16M4 12h16M4 17h16"/></I>;
export const IconClose = (p: P) => <I {...p}><path d="M18 6 6 18M6 6l12 12"/></I>;
export const IconRotate = (p: P) => <I {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></I>;
export const IconSun = (p: P) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></I>;
export const IconMoon = (p: P) => <I {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"/></I>;
export const IconHome = (p: P) => <I {...p}><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></I>;
export const IconCalendar = (p: P) => <I {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></I>;
export const IconMegaphone = (p: P) => <I {...p}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></I>;
export const IconMap = (p: P) => <I {...p}><path d="M14.1 4.6a2 2 0 0 0-1.6 0L8.9 6.4a2 2 0 0 1-1.7 0L3.4 4.5A1 1 0 0 0 2 5.4v12.8a1 1 0 0 0 .6.9l4.6 2.3a2 2 0 0 0 1.7 0l3.6-1.8a2 2 0 0 1 1.7 0l3.8 1.9a1 1 0 0 0 1.4-.9V7.8a1 1 0 0 0-.6-.9z"/><path d="M15 5v16M9 3v16"/></I>;
export const IconUser = (p: P) => <I {...p}><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></I>;
export const IconInbox = (p: P) => <I {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></I>;
export const IconWallet = (p: P) => <I {...p}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></I>;
export const IconImage = (p: P) => <I {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></I>;
export const IconLogout = (p: P) => <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></I>;
export const IconPlus = (p: P) => <I {...p}><path d="M12 5v14M5 12h14"/></I>;
export const IconLayout = (p: P) => <I {...p}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></I>;
export const IconSend = (p: P) => <I {...p}><path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/></I>;
export const IconExternal = (p: P) => <I {...p}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></I>;
export const IconPen = (p: P) => <I {...p}><path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.85.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.85z"/></I>;
export const IconBag = (p: P) => <I {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></I>;
export const IconTicket = (p: P) => <I {...p}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/></I>;
export const IconReceipt = (p: P) => <I {...p}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/></I>;
export const IconPaperclip = (p: P) => <I {...p}><path d="m16 6-8.41 8.59a2 2 0 0 0 2.83 2.83l8.49-8.48a4 4 0 0 0-5.66-5.66l-8.49 8.49a6 6 0 0 0 8.49 8.49l8.48-8.49"/></I>;
export const IconFile = (p: P) => <I {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></I>;
export const IconDownload = (p: P) => <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></I>;
