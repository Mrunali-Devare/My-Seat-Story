import { Link, useRouter } from "@tanstack/react-router";
import {
  Film,
  LogOut,
  Search,
  Ticket,
  User as UserIcon,
  LayoutDashboard,
  Menu,
  X,
  Clock3,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { GlassPanel } from "@/components/premium/GlassPanel";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Pune",
];

const SEARCH_HISTORY_KEY = "My Seat Story-search-history";
const MAX_SEARCH_HISTORY = 5;

export function SiteHeader() {
  const { user, roles } = useAuth();
  const router = useRouter();

  const isManager = roles.includes("manager") || roles.includes("admin");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [searchOpen, setSearchOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState("");

const [selectedCity, setSelectedCity] = useState(() => {
  if (typeof window === "undefined") return "Mumbai";
  const urlCity = new URLSearchParams(window.location.search).get("city");
  return urlCity || localStorage.getItem("city") || "Mumbai";
});
  
const [suggestions, setSuggestions] = useState<any[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [searchLoading, setSearchLoading] = useState(false);

useEffect(() => {
  const query = searchQuery.trim();

  if (!query) {
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchLoading(false);
    return;
  }

  let cancelled = false;

  const timer = window.setTimeout(async () => {
    setSearchLoading(true);

    const { data, error } = await supabase
      .from("movies")
      .select("id,title,poster_url,rating,genres,duration_minutes,status")
      .ilike("title", `%${query}%`)
      .order("rating", { ascending: false })
      .limit(6);

    if (cancelled) return;

    setSuggestions(error ? [] : data ?? []);
    setShowSuggestions(true);
    setSearchLoading(false);
  }, 250);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}, [searchQuery]);

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [city, setCity] = useState("Mumbai");

  // Keep the city selector in sync with browser back/forward navigation.
  useEffect(() => {
    const syncCityFromUrl = () => {
      const urlCity = new URLSearchParams(window.location.search).get("city");
      if (urlCity && CITIES.includes(urlCity)) {
        setSelectedCity(urlCity);
        setCity(urlCity);
        localStorage.setItem("city", urlCity);
      }
    };
    window.addEventListener("popstate", syncCityFromUrl);
    return () => window.removeEventListener("popstate", syncCityFromUrl);
  }, []);

  // Load saved search history and city
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);

      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);

        if (Array.isArray(parsed)) {
          setSearchHistory(parsed);
        }
      }

      const savedCity = localStorage.getItem("city");

      if (savedCity && CITIES.includes(savedCity)) {
        setCity(savedCity);
      }
    } catch {
      // Ignore malformed localStorage data
    }
  }, []);

  const saveSearchToHistory = (query: string) => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) return;

    setSearchHistory((currentHistory) => {
      const updatedHistory = [
        normalizedQuery,
        ...currentHistory.filter(
          (item) => item.toLowerCase() !== normalizedQuery.toLowerCase(),
        ),
      ].slice(0, MAX_SEARCH_HISTORY);

      localStorage.setItem(
        SEARCH_HISTORY_KEY,
        JSON.stringify(updatedHistory),
      );

      return updatedHistory;
    });
  };

  const navigateToSearch = (query: string) => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) return;

    saveSearchToHistory(normalizedQuery);

    setSearchQuery(normalizedQuery);
    setSearchOpen(false);
    setMobileMenuOpen(false);

    void router.navigate({
      to: "/",
      search: (previous) => ({ ...previous, search: normalizedQuery }),
    });
  };

  const submitSearch = () => {
    navigateToSearch(searchQuery);
  };

  const clearSearchHistory = () => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    setSelectedCity(newCity);
    localStorage.setItem("city", newCity);
    window.dispatchEvent(new CustomEvent("cityChanged", { detail: newCity }));
    void router.navigate({
      to: "/",
      search: (previous) => ({ ...previous, city: newCity }),
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const initial = (
    user?.user_metadata?.full_name ||
    user?.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[color:var(--color-background)]/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="rounded-xl bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-glow)] p-2 shadow-glow">
            <Film className="size-6 text-white" />
          </div>

          <span className="font-display text-xl font-bold tracking-tight hidden sm:block">
            <span className="text-gradient-primary">My Seat </span>Story
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-white/5 rounded-lg"
            activeProps={{
              className: "text-foreground bg-white/10",
            }}
            activeOptions={{ exact: true }}
          >
            Movies
          </Link>

          {user && (
            <Link
              to="/bookings"
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-white/5 rounded-lg"
              activeProps={{
                className: "text-foreground bg-white/10",
              }}
            >
              My Bookings
            </Link>
          )}
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-3">
          
{/* City selector */}
<div className="hidden items-center gap-2 sm:flex">
  <Select value={selectedCity} onValueChange={handleCityChange}>
    <SelectTrigger aria-label="Choose city" className="h-9 w-[145px] rounded-full border border-white/10 bg-white/5 px-3 text-sm text-white focus:ring-purple-500">
      <SelectValue placeholder="Choose city" />
    </SelectTrigger>
    <SelectContent className="z-[100] border border-white/10 bg-[color:var(--color-background)] text-white shadow-xl">
      {CITIES.map((c) => (
        <SelectItem key={c} value={c} className="cursor-pointer text-white focus:bg-white/10 focus:text-white">
          {c}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>


          {/* Search button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex hover:bg-white/10 text-white/70 hover:text-white"
            aria-label="Search"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search className="size-5" />
          </Button>

          {/* User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 px-2 hover:bg-white/10"
                >
                  <Avatar className="size-9 border border-white/20">
                    <AvatarFallback className="bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)] font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 bg-[color:var(--color-card)] border-white/10"
              >
                <DropdownMenuLabel className="text-white">
                  {user.email}
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={() => router.navigate({ to: "/profile" })}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <UserIcon className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.navigate({ to: "/bookings" })}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Ticket className="mr-2 size-4" />
                  My Bookings
                </DropdownMenuItem>

                {isManager && (
                  <DropdownMenuItem
                    onClick={() => router.navigate({ to: "/manager" })}
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <LayoutDashboard className="mr-2 size-4" />
                    Manager
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={signOut}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <PremiumButton asChild variant="crimson" size="sm">
              <Link to="/auth">Sign in</Link>
            </PremiumButton>
          )}

          {/* Mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-white/10 text-white/70 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Desktop Search */}
      {searchOpen && (
        <div className="hidden sm:block border-t border-white/10 bg-[color:var(--color-background)]/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
              className="relative"
            >
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <Search className="size-5 shrink-0 text-white/50" />

                
<input
  autoFocus
  value={searchQuery}
  onFocus={() => {
    if (searchQuery.trim()) setShowSuggestions(true);
  }}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search movies, genres..."
  className="min-w-0 flex-1 bg-transparent text-white placeholder:text-white/40 outline-none"
  aria-label="Search movies"
/>


                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Clear
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeSearch}
                  className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
                  aria-label="Close search"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Recent searches */}
              {!searchQuery && searchHistory.length > 0 && (
                <div className="mt-2 rounded-xl border border-white/10 bg-[color:var(--color-card)] p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      Recent searches
                    </span>

                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
                    >
                      <Trash2 className="size-3" />
                      Clear history
                    </button>
                  </div>

                  <div className="space-y-1">
                    {searchHistory.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => navigateToSearch(item)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        <Clock3 className="size-4 shrink-0 text-white/40" />
                        <span className="truncate">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <GlassPanel className="mx-4 mb-4 md:hidden">
          <nav className="flex flex-col gap-2 p-4">
            {/* Mobile search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
              className="relative"
            >
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <Search className="size-4 text-white/50" />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                  aria-label="Search movies"
                />
              </div>

              {/* Mobile search history */}
              {!searchQuery && searchHistory.length > 0 && (
                <div className="mt-2 rounded-lg border border-white/10 bg-[color:var(--color-card)] p-2">
                  <div className="mb-1 flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Recent
                    </span>

                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="text-xs text-white/40 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>

                  {searchHistory.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => navigateToSearch(item)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <Clock3 className="size-3.5 text-white/40" />
                      <span className="truncate">{item}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <Link
              to="/"
              className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              activeProps={{
                className: "text-white bg-white/10",
              }}
              activeOptions={{ exact: true }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Movies
            </Link>

            {user && (
              <Link
                to="/bookings"
                className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                activeProps={{
                  className: "text-white bg-white/10",
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Bookings
              </Link>
            )}

            {!user && (
              <Link
                to="/auth"
                className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            )}
          </nav>
        </GlassPanel>
      )}
    </header>
  );
}