const whiteList = [
  "https://linkio.world",
  "https://api.linkio.world",
  "https://beta.linkio.world",
  "http://localhost:3000",
];

export const corsOptions = {
  origin: whiteList,
  credentials: true,
  methods: ["GET"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
