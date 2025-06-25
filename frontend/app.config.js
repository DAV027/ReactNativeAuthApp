import 'dotenv/config';

export default {
  expo: {
    name: "YourApp",
    slug: "your-app",
    version: "1.0.0",
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
    },
  },
};
