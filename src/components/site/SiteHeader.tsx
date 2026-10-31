import { Link, useRouter } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Ticket,
  Trash2,
  User,
  X,
} from "lucide-react";
import logo from "@/assets/My Seat Story Cinema Logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USERS, signInAs, signOut } from "@/lib/demo-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlassPanel } from "@/components/premium/GlassPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune"];

const SEARCH_HISTORY_KEY = "cineverse-search-history";
const MAX_SEARCH_HISTORY = 5;

const NAV_LINK =
  "relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-white/5 hover:text-foreground " +
  "after:absolute after:inset-x-4 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-[color:var(--color-primary)] after:transition-transform after:duration-300 hover:after:scale-x-100";
const NAV_LINK_ACTIVE = "bg-white/10 text-foreground after:scale-x-100";

const MOBILE_LINK =
  "rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-all duration-200 hover:translate-x-1 hover:bg-white/10 hover:text-white";
const MOBILE_LINK_ACTIVE = "bg-white/10 text-white";

const MENU_ITEM = "text-white/80 hover:bg-white/10 hover:text-white";

type MovieSuggestion = {
  id: string;
  title: string;
  poster_url: string | null;
  rating: number | null;
  genres: string[] | null;
  duration_minutes: number | null;
  status: string | null;
};

function getInitialCity() {
  if (typeof window === "undefined") return CITIES[0];
  const urlCity = new URLSearchParams(window.location.search).get("city");
  if (urlCity && CITIES.includes(urlCity)) return urlCity;
  const saved = localStorage.getItem("city");
  return saved && CITIES.includes(saved) ? saved : CITIES[0];
}

export function SiteHeader() {
  const { user, roles } = useAuth();
  const router = useRouter();

  const isManager = roles.includes("manager") || roles.includes("admin");
  const displayName = user?.name ?? "Account";

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [city, setCity] = useState(getInitialCity);

  // Elevate the header once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load saved search history.
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? "null");
      if (Array.isArray(parsed)) setSearchHistory(parsed);
    } catch {
      // Ignore malformed localStorage data
    }
  }, []);

  // Keep the city selector in sync with browser back/forward navigation.
  useEffect(() => {
    const syncCityFromUrl = () => {
      const urlCity = new URLSearchParams(window.location.search).get("city");
      if (urlCity && CITIES.includes(urlCity)) {
        setCity(urlCity);
        localStorage.setItem("city", urlCity);
      }
    };
    window.addEventListener("popstate", syncCityFromUrl);
    return () => window.removeEventListener("popstate", syncCityFromUrl);
  }, []);

  // Debounced live movie suggestions.
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("id,title,poster_url,rating,genres,duration_minutes,status")
        .ilike("title", `%${query}%`)
        .order("rating", { ascending: false })
        .limit(6);
      if (!cancelled) setSuggestions(error ? [] : ((data as MovieSuggestion[]) ?? []));
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSignOut = () => {
    signOut();
    router.navigate({ to: "/auth" });
  };

  const handleSwitchUser = (id: string) => {
    signInAs(id);
    // Re-run route guards and refetch so pages reflect the new user.
    void router.invalidate();
  };

  const saveSearchToHistory = (query: string) => {
    setSearchHistory((current) => {
      const updated = [
        query,
        ...current.filter((item) => item.toLowerCase() !== query.toLowerCase()),
      ].slice(0, MAX_SEARCH_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearSearchHistory = () => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const navigateToSearch = (query: string) => {
    const normalized = query.trim();
    if (!normalized) return;

    saveSearchToHistory(normalized);
    setSearchQuery(normalized);
    setSearchOpen(false);
    setMobileMenuOpen(false);

    void router.navigate({
      to: "/",
      search: (previous) => ({ ...previous, search: normalized }),
    });
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    localStorage.setItem("city", newCity);
    window.dispatchEvent(new CustomEvent("cityChanged", { detail: newCity }));
    void router.navigate({
      to: "/",
      search: (previous) => ({ ...previous, city: newCity }),
    });
  };

  /** Suggestions (when typing) or recent searches (when empty). */
  const renderSearchResults = (compact: boolean) => {
    const panel = compact
      ? "mt-2 rounded-lg border border-white/10 bg-[color:var(--color-card)] p-2"
      : "mt-2 rounded-xl border border-white/10 bg-[color:var(--color-card)] p-3 shadow-xl";
    const row = compact
      ? "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
      : "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white";

    if (searchQuery.trim()) {
      if (suggestions.length === 0) return null;
      return (
        <div className={panel}>
          {suggestions.map((movie) => (
            <Link
              key={movie.id}
              to="/movies/$id"
              params={{ id: movie.id }}
              onClick={() => {
                saveSearchToHistory(movie.title);
                closeSearch();
                setMobileMenuOpen(false);
              }}
              className={row}
            >
              {movie.poster_url ? (
                <img src={movie.poster_url} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />
              ) : (
                <Search className="size-4 shrink-0 text-white/40" />
              )}
              <span className="min-w-0 flex-1 truncate">{movie.title}</span>
              {movie.rating != null && (
                <span className="shrink-0 text-xs text-white/50">★ {movie.rating}</span>
              )}
            </Link>
          ))}
        </div>
      );
    }

    if (searchHistory.length === 0) return null;
    return (
      <div className={panel}>
        <div className="mb-1 flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Recent searches
          </span>
          <button
            type="button"
            onClick={clearSearchHistory}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
          >
            <Trash2 className="size-3" />
            Clear
          </button>
        </div>
        {searchHistory.map((item) => (
          <button key={item} type="button" onClick={() => navigateToSearch(item)} className={row}>
            <Clock3 className="size-4 shrink-0 text-white/40" />
            <span className="truncate">{item}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transform-gpu border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-white/15 bg-[color:var(--color-background)]/95 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          : "border-white/10 bg-[color:var(--color-background)]/70"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Logo */}
        <Link to="/" className="group flex shrink-0 items-center gap-2">
          <img
            src={logo}
            alt="My Seat Story"
            className="h-11 w-auto transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className={NAV_LINK} activeProps={{ className: NAV_LINK_ACTIVE }} activeOptions={{ exact: true }}>
            Movies
          </Link>
          {user && (
            <Link to="/bookings" className={NAV_LINK} activeProps={{ className: NAV_LINK_ACTIVE }}>
              My Bookings
            </Link>
          )}
          <Link to="/manager" className={NAV_LINK} activeProps={{ className: NAV_LINK_ACTIVE }}>
            Manager
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-3">
          {/* City selector */}
          <div className="hidden sm:block">
            <Select value={city} onValueChange={handleCityChange}>
              <SelectTrigger
                aria-label="Choose city"
                className="h-9 w-[145px] rounded-full border border-white/10 bg-white/5 px-3 text-sm text-white focus:ring-purple-500"
              >
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

          {/* Search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
            aria-label="Search"
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          >
            <Search className="size-5" />
          </Button>

          {/* Account menu */}
          {!user ? (
            <Button asChild variant="ghost" className="text-white hover:bg-white/10">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 hover:bg-white/10" aria-label="Account menu">
                  <Avatar className="size-9 border border-white/20">
                    <AvatarFallback className="bg-[color:var(--color-primary)]/20 font-semibold text-[color:var(--color-primary)]">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm text-white lg:inline">{displayName}</span>
                  <ChevronDown className="hidden size-4 text-white/50 lg:inline" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 border-white/10 bg-[color:var(--color-card)]">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="truncate text-xs text-white/50">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-white/50">
                  Demo · switch user
                </DropdownMenuLabel>
                {DEMO_USERS.map((demoUser) => (
                  <DropdownMenuItem
                    key={demoUser.id}
                    onClick={() => handleSwitchUser(demoUser.id)}
                    className={`flex items-start gap-2 ${MENU_ITEM}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{demoUser.name}</p>
                      <p className="text-xs text-white/50">{demoUser.tagline}</p>
                    </div>
                    {demoUser.id === user.id && <Check className="mt-1 size-4 text-[color:var(--color-primary)]" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem onClick={() => router.navigate({ to: "/profile" })} className={MENU_ITEM}>
                  <User className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.navigate({ to: "/bookings" })} className={MENU_ITEM}>
                  <Ticket className="mr-2 size-4" />
                  My Bookings
                </DropdownMenuItem>
                {isManager && (
                  <DropdownMenuItem onClick={() => router.navigate({ to: "/manager" })} className={MENU_ITEM}>
                    <LayoutDashboard className="mr-2 size-4" />
                    Manager
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleSignOut} className={MENU_ITEM}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </Button>
        </div>
      </div>

      {/* Desktop search */}
      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="hidden border-t border-white/10 bg-[color:var(--color-background)]/95 backdrop-blur-xl sm:block"
          >
            <div className="container mx-auto px-4 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigateToSearch(searchQuery);
                }}
              >
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <Search className="size-5 shrink-0 text-white/50" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies, genres..."
                    className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/40"
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
                {renderSearchResults(false)}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence initial={false}>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden"
          >
            <GlassPanel className="mx-4 mb-4">
              <nav className="flex flex-col gap-2 p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigateToSearch(searchQuery);
                  }}
                >
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <Search className="size-4 text-white/50" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                      aria-label="Search movies"
                    />
                  </div>
                  {renderSearchResults(true)}
                </form>

                {/* City selector (hidden in the top bar on small screens) */}
                <Select value={city} onValueChange={handleCityChange}>
                  <SelectTrigger
                    aria-label="Choose city"
                    className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                  >
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

                <Link
                  to="/"
                  className={MOBILE_LINK}
                  activeProps={{ className: MOBILE_LINK_ACTIVE }}
                  activeOptions={{ exact: true }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Movies
                </Link>
                {user && (
                  <>
                    <Link
                      to="/bookings"
                      className={MOBILE_LINK}
                      activeProps={{ className: MOBILE_LINK_ACTIVE }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Bookings
                    </Link>
                    <Link
                      to="/profile"
                      className={MOBILE_LINK}
                      activeProps={{ className: MOBILE_LINK_ACTIVE }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </>
                )}
                <Link
                  to="/manager"
                  className={MOBILE_LINK}
                  activeProps={{ className: MOBILE_LINK_ACTIVE }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Manager
                </Link>
              </nav>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
