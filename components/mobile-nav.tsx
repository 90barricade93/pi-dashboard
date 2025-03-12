"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { Menu, X } from "lucide-react"
import { ThemeToggleSwitch } from "@/components/theme-toggle"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetDescription className="sr-only">Mobile navigation menu for Pi Dashboard</SheetDescription>
        <div className="flex items-center justify-between border-b pb-4">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">π</div>
            </div>
            <span className="font-bold text-xl">Pi Dashboard</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium">Dark Mode</span>
            <ThemeToggleSwitch />
          </div>

          <div className="space-y-1">
            <Link href="/" className="block px-2 py-1 text-lg hover:underline" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
            <Link href="/news" className="block px-2 py-1 text-lg hover:underline" onClick={() => setOpen(false)}>
              News
            </Link>
            <Link href="/calculator" className="block px-2 py-1 text-lg hover:underline" onClick={() => setOpen(false)}>
              Pi Calculator
            </Link>
          </div>
        </div>

        <div className="mt-auto border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} 90barricade93 Pi Dashboard</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

