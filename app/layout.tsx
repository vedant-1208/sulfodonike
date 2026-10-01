import './globals.css'

export const metadata = {
  title: 'Board — menus for cafes and restaurants',
  description: 'Build your menu, share one link, no login needed for customers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Caveat:wght@600;700&family=Inter:wght@400;500;600;700&family=DM+Sans:wght@400;500;700;800&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
