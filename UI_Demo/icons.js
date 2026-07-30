// Bo icon SVG noi tuong tu lucide, khong can tai thu vien ben ngoai.
const PATHS = {
  "book-open": '<path d="M12 7v14"></path><path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H12v19H6.5A3.5 3.5 0 0 0 3 17.5z"></path><path d="M21 5.5A3.5 3.5 0 0 0 17.5 2H12v19h5.5a3.5 3.5 0 0 1 3.5-3.5z"></path>',
  "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
  "chevron-left": '<path d="m15 18-6-6 6-6"></path>',
  "chevron-right": '<path d="m9 18 6-6-6-6"></path>',
  "circle-play": '<circle cx="12" cy="12" r="10"></circle><path d="m10 8 6 4-6 4z"></path>',
  "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path>',
  "file-down": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M12 18v-6"></path><path d="m9 15 3 3 3-3"></path>',
  "highlighter": '<path d="m9 11-6 6v3h9l3-3"></path><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4z"></path>',
  "history": '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 3v6h6"></path><path d="M12 7v5l4 2"></path>',
  "key-round": '<path d="M2 18a6 6 0 1 1 10.8-3.6L22 5.2V9h-3v3h-3v3h-3.6A6 6 0 0 1 2 18z"></path><circle cx="7" cy="18" r="1"></circle>',
  "library-big": '<rect x="3" y="4" width="5" height="16" rx="1"></rect><rect x="10" y="4" width="5" height="16" rx="1"></rect><path d="m17 6 4 14"></path>',
  "minus": '<path d="M5 12h14"></path>',
  "more-horizontal": '<circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>',
  "mountain-snow": '<path d="m8 3 4 8 3-5 6 15H3z"></path><path d="m7 14 3-3 2 2 2-2 3 3"></path>',
  "mouse-pointer-2": '<path d="m4 4 7.1 17 2.5-7.4L21 11z"></path>',
  "pencil": '<path d="M17 3a2.9 2.9 0 0 1 4 4L8 20l-5 1 1-5z"></path><path d="m15 5 4 4"></path>',
  "plus": '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
  "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 3v6h6"></path>',
  "send": '<path d="m22 2-7 20-4-9-9-4z"></path><path d="M22 2 11 13"></path>',
  "sparkles": '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path><path d="M5 3v4"></path><path d="M3 5h4"></path><path d="M19 17v4"></path><path d="M17 19h4"></path>',
  "sun-moon": '<path d="M12 8a4 4 0 1 0 4 4"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.9 4.9 1.4 1.4"></path><path d="m17.7 17.7 1.4 1.4"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M21 3a6 6 0 0 1-6 6 6 6 0 0 0 6-6z"></path>',
  "trash-2": '<path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
  "user-round": '<circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path>'
};

export function icon(name, size = 24) {
  const body = PATHS[name] || "";
  return `<svg class="vl-icon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
