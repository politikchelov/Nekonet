"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

import Container from "./container";
import { Separator } from "./ui/separator";

import { nightTokyo } from "@/utils/fonts";
import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useState } from "react";

import SearchBar from "./search-bar";
import { MenuIcon, X } from "lucide-react";
import useScrollPosition from "@/hooks/use-scroll-position";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import LoginPopoverButton from "./login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import NavbarAvatar from "./navbar-avatar";
import { toast } from "sonner";

const menuItems: Array<{ title: string; href?: string }> = [{ title: "Форум", href: "/forum" }];

const NavBar = () => {
  const auth = useAuthStore();
  const { y } = useScrollPosition();
  const isHeaderFixed = true;
  const isHeaderSticky = y > 0;

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    const refreshAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session?.user) {
          if (mounted) auth.clearAuth();
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, auto_skip, created_at")
          .eq("id", session.user.id)
          .single();
        if (profileError) throw profileError;

        if (mounted) {
          auth.setAuth({
            id: profile.id,
            email: session.user.email || "",
            username: profile.username,
            avatar: profile.avatar_url || "",
            collectionId: "",
            collectionName: "profiles",
            autoSkip: !!profile.auto_skip,
            created: profile.created_at,
          });
        }
      } catch (e) {
        console.error("Supabase auth refresh error:", e);
        if (mounted) {
          auth.clearAuth();
          toast.error("Не удалось восстановить сессию. Войдите снова.");
        }
      } finally {
        if (mounted) auth.setIsRefreshing(false);
      }
    };

    refreshAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        auth.clearAuth();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div
      className={cn([
        "h-fit w-full",
        "sticky top-0 z-[100] duration-300",
        isHeaderFixed ? "fixed bg-gradient-to-b from-slate-900/90" : "",
        isHeaderSticky
          ? "bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-20 bg-slate-950"
          : "",
      ])}
    >
      <Container className="flex items-center justify-between py-2.5 gap-20">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <Image
            src="/miraku-logo.svg"
            alt="Логотип Miraku"
            width={40}
            height={40}
            className="rounded-xl shadow-lg transition-transform group-hover:scale-105"
          />
          <h1
            className={cn([
              nightTokyo.className,
              "text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-500 to-cyan-400 tracking-widest",
            ])}
          >
            Miraku
          </h1>
        </Link>

        <div className="hidden lg:flex items-center gap-10 ml-20">
          {menuItems.map((menu, idx) => (
            <Link href={menu.href || "#"} key={idx}>
              {menu.title}
            </Link>
          ))}
        </div>
        <div className="w-1/3 hidden lg:flex items-center gap-5">
          <SearchBar />
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
        </div>
        <div className="lg:hidden flex items-center gap-5">
          <MobileMenuSheet trigger={<MenuIcon suppressHydrationWarning />} />
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
        </div>
      </Container>
    </div>
  );
};

const MobileMenuSheet = ({ trigger }: { trigger: ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>{trigger}</SheetTrigger>
      <SheetContent
        className="flex flex-col w-[80vw] z-[150]"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="w-full h-full relative">
          <SheetClose className="absolute top-0 right-0">
            <X />
          </SheetClose>
          <div className="flex flex-col gap-5 mt-10">
            {menuItems.map((menu, idx) => (
              <Link
                href={menu.href || "#"}
                key={idx}
                onClick={() => setOpen(false)}
              >
                {menu.title}
              </Link>
            ))}
            <Separator />
            <SearchBar onAnimeClick={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;
