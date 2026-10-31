import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Play, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { PremiumButton } from "./PremiumButton";
import { Poster, Backdrop } from "@/components/ui/poster";
import { motion, AnimatePresence } from "framer-motion";

interface HeroMovie {
  id: string;
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  genres: string[];
  duration_minutes: number;
  description: string | null;
}

interface HeroBannerProps {
  movies: HeroMovie[];
}

export function HeroBanner({ movies }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, movies.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
    setIsAutoPlaying(false);
  };

  const currentMovie = movies[currentIndex];

  if (!currentMovie) return null;

  return (
    <div className="relative h-[68dvh] min-h-[460px] max-h-[760px] overflow-hidden">
      {/* Background image with overlay */}
      <AnimatePresence>
        <motion.div
          key={currentIndex}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-hero" />
          <Backdrop
            src={currentMovie.backdrop_url ?? currentMovie.poster_url}
            className="absolute inset-0 size-full object-cover"
          />
          
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-background)] via-[color:var(--color-background)]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--color-background)]/90 via-[color:var(--color-background)]/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative flex h-full items-end pb-20 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div key={currentIndex} className="max-w-2xl space-y-5 duration-700 animate-in fade-in slide-in-from-bottom-4 sm:space-y-6">
            {/* Movie title */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white leading-[0.95] tracking-tighter">
              {currentMovie.title}
            </h1>

            {/* Movie metadata */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm md:text-base text-white/80">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--color-primary)] font-semibold">
                  ★ {currentMovie.rating?.toFixed(1) || "N/A"}
                </span>
              </div>
              <span>•</span>
              <span className="hidden sm:inline">{currentMovie.genres.slice(0, 3).join(", ")}</span>
              <span className="sm:hidden">{currentMovie.genres.slice(0, 2).join(", ")}</span>
              <span>•</span>
              <span>{currentMovie.duration_minutes} min</span>
            </div>

            {/* Description */}
            <p className="max-w-xl text-sm sm:text-base text-white/70 line-clamp-2 sm:line-clamp-3">
              {currentMovie.description || "No description available"}
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link to="/movies/$id" params={{ id: currentMovie.id }}>
                <PremiumButton variant="crimson" size="lg">
                  <Play className="size-5" />
                  <span className="hidden sm:inline">Book Now</span>
                  <span className="sm:hidden">Book</span>
                </PremiumButton>
              </Link>
              <Link to="/movies/$id" params={{ id: currentMovie.id }}>
                <PremiumButton variant="glass" size="lg">
                  <Info className="size-5" />
                  <span className="hidden sm:inline">More Info</span>
                  <span className="sm:hidden">Info</span>
                </PremiumButton>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <motion.button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full p-2 sm:p-3 text-white transition-colors border border-white/10 focus-visible:outline-2"
        aria-label="Previous movie"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ChevronLeft className="size-5 sm:size-6" />
      </motion.button>
      <motion.button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full p-2 sm:p-3 text-white transition-colors border border-white/10 focus-visible:outline-2"
        aria-label="Next movie"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ChevronRight className="size-5 sm:size-6" />
      </motion.button>

      {/* Slide indicators */}
      <div className="absolute inset-x-0 bottom-6 sm:bottom-8">
        <div className="container mx-auto flex gap-2 px-4 sm:px-6 md:px-8">
          {movies.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setCurrentIndex(index);
                setIsAutoPlaying(false);
              }}
              className={`h-1 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-[color:var(--color-primary)]"
                  : "w-3 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
