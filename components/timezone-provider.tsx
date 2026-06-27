"use client";

import { createContext, useContext } from "react";

const TimezoneContext = createContext<string>("UTC");

/**
 * Exposes the signed-in user's profile timezone to client components so all
 * wall-clock rendering matches their calendar instead of the browser or the
 * UTC server (e.g. Vercel) region.
 */
export function TimezoneProvider({
  timezone,
  children,
}: {
  timezone: string;
  children: React.ReactNode;
}) {
  return (
    <TimezoneContext.Provider value={timezone}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): string {
  return useContext(TimezoneContext);
}
