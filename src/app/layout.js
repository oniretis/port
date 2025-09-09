import "./globals.css";

import ClientLayout from "@/client-layout";

import { ViewTransitions } from "next-view-transitions";

export const metadata = {
  title: "Sams Studio",
  description:
    "Sams Studio is a Software development agency. We specialise in UI/UX design, branding, web, and mobile development.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ViewTransitions>
          <ClientLayout>{children}</ClientLayout>
        </ViewTransitions>
      </body>
    </html>
  );
}
