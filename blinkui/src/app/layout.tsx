import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#384536",
};

export const metadata: Metadata = {
  title: "BlinkFarms & BlinkAI — NASA FieldShift & VeloceRoot",
  description: "Next-generation biophysical decision support tool fusing NASA Earth observations, Flash Drought early detection, Field Memory, and adaptive crop rotation intelligence.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BlinkAI",
  },
  icons: {
    icon: "/blink-ai-logo.png",
    apple: "/blink-ai-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="scroll-smooth w-full overflow-x-hidden bg-[#F8F5EE]">
      <head>
        <meta name="theme-color" content="#384536" />
        <link rel="apple-touch-icon" href="/blink-ai-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen w-full max-w-full overflow-x-hidden font-sans bg-[#F8F5EE] text-[#243023]">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
