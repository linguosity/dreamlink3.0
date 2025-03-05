"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import UserAvatar from "./UserAvatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b bg-background p-4">
      {/* Left: Logo */}
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-xl font-bold">
          Dreamlink
        </Link>
      </div>

      {/* Center: Search */}
      <div className="flex-1 mx-4 max-w-md">
        <DropdownMenu open={searchOpen} onOpenChange={setSearchOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Search dreams"
            >
              <Search className="h-4 w-4" />
              <span>Search dreams...</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full p-2" align="center">
            <input
              type="text"
              placeholder="Search dream entries..."
              className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Profile Avatar with Dropdown */}
      <div>
        <UserAvatar />
      </div>
    </nav>
  );
}