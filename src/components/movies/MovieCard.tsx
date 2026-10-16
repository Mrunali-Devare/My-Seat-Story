import { Link } from "@tanstack/react-router";
import { Star, Clock, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { motion } from "framer-motion";

export type MovieCardData = {
  id: string;
  title: string;
  poster_url: string | null;
  rating: number | null;
  genres: string[];
  duration_minutes: number;
  certificate: string | null;
  languages: string[];
};

export function MovieCard({ movie }: { movie: MovieCardData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -8 }}
    >
      <Link
        to="/movies/$id"
        params={{ id: movie.id }}
        className="group block w-[180px] shrink-0 sm:w-[200px] md:w-[240px]"
      >
        <PremiumCard variant="spotlight" className="overflow-hidden p-0">
          <div className="relative aspect-[2/3] overflow-hidden">
            {movie.poster_url ? (
              <motion.img
                src={movie.poster_url}
                alt={movie.title}
                loading="lazy"
                className="size-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.5 }}
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-card text-muted-foreground">
                No poster
              </div>
            )}
            
            {/* Glass overlay on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Rating badge */}
            <motion.div
              className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Star className="size-3.5 fill-[color:var(--color-gold)] text-[color:var(--color-gold)]" />
              <span className="text-xs font-semibold text-white">{(movie.rating ?? 0).toFixed(1)}</span>
            </motion.div>
            
            {/* Certificate badge */}
            {movie.certificate && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <Badge className="absolute top-3 right-3 bg-black/60 text-white backdrop-blur-md border-white/10">
                  {movie.certificate}
                </Badge>
              </motion.div>
            )}
            
            {/* Play button on hover */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileHover={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="bg-[color:var(--color-primary)] rounded-full p-4 shadow-glow"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Play className="size-6 text-white fill-white" />
              </motion.div>
            </motion.div>
          </div>
          
          {/* Movie info */}
          <div className="p-3 sm:p-4 space-y-2">
            <motion.h3
              className="line-clamp-1 font-display font-semibold text-base sm:text-lg transition-colors group-hover:text-[color:var(--color-primary)]"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              {movie.title}
            </motion.h3>
            <p className="line-clamp-1 text-xs sm:text-sm text-muted-foreground">
              {movie.genres.slice(0, 3).join(" • ")}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{movie.duration_minutes}m</span>
              <span>•</span>
              <span>{movie.languages[0] ?? "EN"}</span>
            </div>
          </div>
        </PremiumCard>
      </Link>
    </motion.div>
  );
}
