"use client"

import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface Navbar1Props {
  logo?: {
    url: string
    src: string
    alt: string
    title: string
  }
  auth?: {
    login: {
      text: string
      url: string
    }
  }
}

const Navbar1 = ({
  logo = {
    url: "/",
    src: "/assets/images/logo.png",
    alt: "CommonGround",
    title: "CommonGround",
  },
  auth = {
    login: { text: "Sign in", url: "/login" },
  },
}: Navbar1Props) => {
  return (
    <section className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-6xl px-4 py-4">
        {/* Desktop nav */}
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <a href={logo.url} className="flex items-center gap-2">
              <img src={logo.src} className="h-8 w-auto" alt={logo.alt} />
              <span className="text-lg font-semibold">{logo.title}</span>
            </a>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={auth.login.url}>{auth.login.text}</a>
            </Button>
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <a href={logo.url} className="flex items-center gap-2">
              <img src={logo.src} className="h-8 w-auto" alt={logo.alt} />
              <span className="text-lg font-semibold">{logo.title}</span>
            </a>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
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
  )
}

export { Navbar1 }
