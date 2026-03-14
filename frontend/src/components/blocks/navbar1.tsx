"use client";

import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Navbar1Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  donateUrl?: string;
  auth?: {
    login: {
      text: string;
      url: string;
    };
  };
}

const Navbar1 = ({
  logo = {
    url: "/",
    src: "/assets/images/logo.png",
    alt: "CommonGround",
    title: "CommonGround",
  },
  donateUrl = "/donate",
  auth = {
    login: { text: "Sign in", url: "/login" },
  },
}: Navbar1Props) => {
  const { t, i18n } = useTranslation();

  const toggleLocale = () => {
    const next = i18n.language.startsWith("fr") ? "en" : "fr";
    i18n.changeLanguage(next);
  };

  const isFr = i18n.language.startsWith("fr");
  const langLabel = isFr ? t("language.switchToEnglish") : t("language.switchToFrench");
  const langButtonText = isFr ? "EN" : "FR";

  const navLinks = (
    <>
      <a
        href={donateUrl}
        className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        {t("common.donate")}
      </a>
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={langLabel}
        className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white border border-white/20"
      >
        {langButtonText}
      </button>
    </>
  );

  return (
    <section className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-900/90 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="container mx-auto max-w-6xl px-4 py-4">
        {/* Desktop nav */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            <a href={logo.url} className="flex items-center gap-2 text-white hover:text-white/90 transition-colors">
              <img src={logo.src} className="h-8 w-auto" alt={logo.alt} />
              <span className="text-lg font-semibold">{logo.title}</span>
            </a>
            <div className="flex items-center gap-1">{navLinks}</div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white/50">
              <a href={auth.login.url}>{auth.login.text}</a>
            </Button>
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <a href={logo.url} className="flex items-center gap-2 text-white">
              <img src={logo.src} className="h-8 w-auto" alt={logo.alt} />
              <span className="text-lg font-semibold">{logo.title}</span>
            </a>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <a href={logo.url} className="flex items-center gap-2">
                      <img src={logo.src} className="h-8 w-auto" alt={logo.alt} />
                      <span className="text-lg font-semibold">{logo.title}</span>
                    </a>
                  </SheetTitle>
                </SheetHeader>
                <div className="my-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <a
                      href={donateUrl}
                      className="inline-flex h-10 items-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                    >
                      {t("common.donate")}
                    </a>
                    <button
                      type="button"
                      onClick={toggleLocale}
                      aria-label={langLabel}
                      className="inline-flex h-10 items-center rounded-md px-4 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                    >
                      {langButtonText}
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button asChild variant="outline">
                      <a href={auth.login.url}>{auth.login.text}</a>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Navbar1 };
