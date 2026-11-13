import React from "react";

/**
 * ColorfulUserAvatar
 * High-definition, colorful vector user avatar for LentFin user profiles.
 * Renders an illustrated person avatar with signature purple/indigo brand gradient and attire.
 */
export default function ColorfulUserAvatar({ className = "w-full h-full" }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="lentfinAvatarBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="lentfinSuit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
        <linearGradient id="lentfinHair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* Outer Circular Gradient Background */}
      <circle cx="20" cy="20" r="20" fill="url(#lentfinAvatarBg)" />

      {/* Subtle upper background glow */}
      <circle cx="20" cy="14" r="12" fill="#FFFFFF" fillOpacity="0.2" />

      {/* Body / Executive Suit */}
      <path
        d="M6 40 C6 31 12 25 20 25 C28 25 34 31 34 40 Z"
        fill="url(#lentfinSuit)"
      />

      {/* Crisp White Shirt Collar */}
      <path d="M15 25 L20 31 L25 25 H15 Z" fill="#FFFFFF" />

      {/* Vibrant Rose / Magenta Tie */}
      <path d="M18.8 29.5 L21.2 29.5 L22 37.5 L20 40 L18 37.5 Z" fill="#F43F5E" />
      <polygon points="18.8,29.5 21.2,29.5 20.6,31.5 19.4,31.5" fill="#E11D48" />

      {/* Neck */}
      <rect x="16.5" y="19" width="7" height="7" rx="2" fill="#FDBA74" />

      {/* Face */}
      <circle cx="20" cy="15" r="6.8" fill="#FED7AA" />

      {/* Ears */}
      <circle cx="13.2" cy="15" r="1.3" fill="#FDBA74" />
      <circle cx="26.8" cy="15" r="1.3" fill="#FDBA74" />

      {/* Hair */}
      <path
        d="M13.2 15 C13.2 9.8 16.2 7 20 7 C23.8 7 26.8 9.8 26.8 15 C26.8 15.6 26.5 16.4 26.2 16.8 C25.6 13.2 23.2 10.5 20 10.5 C16.5 10.5 14.2 13.2 13.8 16.8 C13.5 16.4 13.2 15.6 13.2 15 Z"
        fill="url(#lentfinHair)"
      />
      <path
        d="M16 7.8 C17.5 7.2 19 7 20.8 7 C24.2 7 26.8 9.5 26.8 14 C26 11.5 23.5 9.5 20 9.5 C18.2 9.5 16.8 10 15.5 10.8 C15.5 9.5 15.7 8.5 16 7.8 Z"
        fill="#475569"
      />
    </svg>
  );
}

