"use client";

import { signOutAction } from "@/app/actions";

export default function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button 
        type="submit" 
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Logout
      </button>
    </form>
  );
}