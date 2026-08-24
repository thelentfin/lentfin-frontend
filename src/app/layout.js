import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "LentFin - Financial Services Platform",
  description: "Modern loan management and DSA financial platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-900 antialiased selection:bg-slate-200">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#f2f6f9",
              border: "1px solid rgba(230, 237, 244)",
              color: "#2e2f30",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "10px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
              padding: "14px 18px",
              minWidth: "340px",
            },
          }}
        />
      </body>
    </html>
  );
}

