const whiteList = [
  "https://linkio.world",
  "https://admin.linkio.world",
  "https://app.linkio.world",
  "https://beta.linkio.world",
  "https://dev.linkio.world",
  "https://ramp.linkio.world",
  "http://localhost:3000",
];

export const corsOptions = {
  origin: whiteList,
  credentials: true,
  methods: ["GET"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
