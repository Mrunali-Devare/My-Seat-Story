import { MovieCard, type MovieCardData } from "./MovieCard";
import { motion } from "framer-motion";

export function MovieRow({ title, movies, eyebrow }: { title: string; eyebrow?: string; movies: MovieCardData[] }) {
  if (!movies.length) return null;
  return (
    <motion.section 
      className="container mx-auto px-4 py-6 sm:py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-4 sm:mb-5 flex items-end justify-between">
        <div>
          {eyebrow && <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">{eyebrow}</p>}
          <h2 className="mt-1 text-xl sm:text-2xl md:text-3xl font-bold">{title}</h2>
        </div>
      </div>
      <div className="scrollbar-hide -mx-4 flex gap-3 sm:gap-4 overflow-x-auto px-4 pb-2">
        {movies.map((m, index) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <MovieCard movie={m} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
