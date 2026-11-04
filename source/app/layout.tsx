import './globals.css';
import type {ReactNode} from 'react';
import {ARTIST, COLLECTION_NAME} from '../lib/config';

export const metadata = {title: `${COLLECTION_NAME} by ${ARTIST}`, description: `Mint ${COLLECTION_NAME}: Persian calligraphy, the poetry of Hafez and generative art.`};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Open-licensed fonts (SIL OFL): Inter for UI, Noto Nastaliq Urdu for the Persian lines. */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
