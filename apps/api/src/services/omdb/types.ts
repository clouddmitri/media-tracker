export interface OmdbRating {
  Source: string;
  Value: string;
}

export interface OmdbSuccessResponse {
  Response: "True";
  imdbID: string;
  Title: string;
  Year: string;
  Rated: string;
  Runtime: string;
  Genre: string;
  Plot: string;
  imdbRating: string;
  imdbVotes: string;
  Metascore: string;
  Ratings: OmdbRating[];
  Type: string;
}

export interface OmdbErrorResponse {
  Response: "False";
  Error: string;
}

export type OmdbResponse = OmdbSuccessResponse | OmdbErrorResponse;
