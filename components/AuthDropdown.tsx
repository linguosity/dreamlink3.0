"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

type AuthDropdownProps = {
  userEmail: string;
};

export default function AuthDropdown({ userEmail }: AuthDropdownProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between bg-white shadow p-4">
      {/* Left: Logo */}
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-xl font-bold text-gray-800">
          Dreamlink
        </Link>
      </div>

      {/* Center: Search Input */}
      <div className="flex-1 mx-4">
        <div className="relative">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none"
            title="Click here to search dream entries. If none exist, this will help you get started."
          >
            Search...
          </button>
          {searchOpen && (
            <div className="absolute mt-2 w-full bg-white border border-gray-300 rounded shadow">
              <input
                type="text"
                placeholder="Search dream entries..."
                className="w-full px-3 py-2 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: Avatar Dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {userEmail.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="hidden md:block text-gray-800">{userEmail}</span>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow">
            <ul>
              <li>
                <button
                  onClick={() => router.push("/profile")}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  My Profile
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/settings")}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Settings
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/about")}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  About / Privacy
                </button>
              </li>
              <li className="px-4 py-2">
                <LogoutButton />
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}