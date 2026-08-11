import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { SearchParamsToast } from "@/components/searchparams-toast";
import { AuthedMenu } from "@/components/authed-menu";
import { SiteFooter } from "@/components/site-footer";
import { supabaseConversationsClient } from "@/lib/people-search/conversations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reteaua de suport",
  description: "O aplicatie care usureaza cautarea de resurse in cadrul comunitatii de barbati din Romania",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: member } = user
    ? await supabase.from("members").select("id, role").eq("id", user.id).maybeSingle()
    : { data: null };
  const conversations = member
    ? await supabaseConversationsClient(supabase).listConversations(member.id)
    : [];

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {member && (
          <AuthedMenu
            isAdmin={member.role === "admin"}
            conversations={conversations}
          />
        )}
        {children}
        {member && <SiteFooter />}
        <Toaster richColors position="top-center" duration={5000} />
        <Suspense>
          <SearchParamsToast />
        </Suspense>
      </body>
    </html>
  );
}
