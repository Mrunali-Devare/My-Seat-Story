import { Link, useRouter } from "@tanstack/react-router";
import {
  Film,
  Check,
  ChevronDown,
  Search,
  Ticket,
  LayoutDashboard,
  Menu,
  X,
  Clock3,
  Trash2,
  LogOut,
} from "lucide-react";
import logo from "@/assets/My Seat Story Cinema Logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AUTO_DEMO, DEMO_PERSONAS, switchPersona, usePersona } from "@/lib/demo-auth";
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
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
];

const NAV_LINK =
  "relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-white/5 hover:text-foreground " +
  "after:absolute after:inset-x-4 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-[color:var(--color-primary)] after:transition-transform after:duration-300 hover:after:scale-x-100";
const NAV_LINK_ACTIVE = "bg-white/10 text-foreground after:scale-x-100";

const SEARCH_HISTORY_KEY = "cineverse-search-history";
const MAX_SEARCH_HISTORY = 5;

export function SiteHeader() {
  const { user, roles, isDemo } = useAuth();
  const router = useRouter();
  const isManager = roles.includes("manager") || roles.includes("admin");
  const activePersona = usePersona();
  const handleSwitchPersona = switchPersona;
  const showPersonas = isDemo;
  const displayName = showPersonas
    ? activePersona.name
    : isDemo
      ? "Demo Manager"
      : (user?.user_metadata?.full_name as string | undefined) || user?.email?.split("@")[0] || "Account";
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-white/15 bg-[color:var(--color-background)]/95 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          : "border-white/10 bg-[color:var(--color-background)]/70"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2 shrink-0">
          <img src={logo} alt="My Seat Story" className="h-11 w-auto transition-transform duration-300 group-hover:scale-105" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className={NAV_LINK}
            activeProps={{ className: NAV_LINK_ACTIVE }}
            activeOptions={{ exact: true }}
          >
            Movies
          </Link>

          {user && (
            <Link
              to="/bookings"
              className={NAV_LINK}
              activeProps={{ className: NAV_LINK_ACTIVE }}
            >
              My Bookings
            </Link>
          )}

          <Link
            to="/manager"
            className={NAV_LINK}
            activeProps={{ className: NAV_LINK_ACTIVE }}
          >
            Manager
          </Link>
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

          {/* Account menu (demo accounts also get the persona switcher) */}
          {!user && AUTO_DEMO ? null : !user ? (
            <Button asChild variant="ghost" className="text-white hover:bg-white/10">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 hover:bg-white/10" aria-label="Account menu">
                <Avatar className="size-9 border border-white/20">
                  <AvatarFallback className="bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)] font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm text-white lg:inline">{displayName}</span>
                <ChevronDown className="hidden size-4 text-white/50 lg:inline" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 bg-[color:var(--color-card)] border-white/10">
              {showPersonas && (
                <>
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-white/50">
                Demo mode · switch user
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {DEMO_PERSONAS.map((persona) => (
                <DropdownMenuItem
                  key={persona.id}
                  onClick={() => handleSwitchPersona(persona.id)}
                  className="flex items-start gap-2 text-white/80 hover:text-white hover:bg-white/10"
                >
                  <div className="flex-1">
                    <p className="font-medium">{persona.name}</p>
                    <p className="text-xs text-white/50">{persona.tagline}</p>
                  </div>
                  {persona.id === activePersona.id && <Check className="mt-1 size-4 text-[color:var(--color-primary)]" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}
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
              {!AUTO_DEMO && <DropdownMenuSeparator className="bg-white/10" />}
              {!AUTO_DEMO && <DropdownMenuItem onClick={handleSignOut} className="text-white/80 hover:text-white hover:bg-white/10">
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
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
      <AnimatePresence initial={false}>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="hidden sm:block border-t border-white/10 bg-[color:var(--color-background)]/95 backdrop-blur-xl"
        >
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
              className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1 rounded-lg transition-all duration-200"
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
                className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1 rounded-lg transition-all duration-200"
                activeProps={{
                  className: "text-white bg-white/10",
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Bookings
              </Link>
            )}

            <Link
              to="/manager"
              className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 hover:translate-x-1 rounded-lg transition-all duration-200"
              activeProps={{ className: "text-white bg-white/10" }}
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