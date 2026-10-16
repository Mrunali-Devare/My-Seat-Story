import { createServerFn } from "@tanstack/react-start";
import { getServerConfig } from "../config.server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export const getNowPlayingMovies = createServerFn({
  method: "GET",
}).handler(async () => {
  const { tmdbAccessToken } = getServerConfig();

  if (!tmdbAccessToken) {
    throw new Error("TMDB_ACCESS_TOKEN is not configured");
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/movie/now_playing?language=en-US&region=IN&page=1`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${tmdbAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
});

export const getMovieDetails = createServerFn({
  method: "GET",
})
  .inputValidator((input: { tmdbId: number }) => input)
  .handler(async ({ data }) => {
    const { tmdbAccessToken } = getServerConfig();

    if (!tmdbAccessToken) {
      throw new Error("TMDB_ACCESS_TOKEN is not configured");
    }

    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${data.tmdbId}?language=en-US&append_to_response=release_dates`,
      {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${tmdbAccessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `TMDB movie details request failed: ${response.status} - ${errorText}`,
      );
    }

    return response.json();
  });