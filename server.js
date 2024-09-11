const Hapi = require("@hapi/hapi");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./models/User");
const Text = require("./models/Text");

const init = async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/gelangdb");

  const server = Hapi.server({
    port: 3001,
    host: "localhost",
  });

  await server.register(require("@hapi/cookie"));

  server.auth.strategy("session", "cookie", {
    cookie: {
      name: "sid",
      password:
        "a_secure_random_secret_string_that_is_at_least_32_characters_long",
      isSecure: false,
      path: "/",
      isHttpOnly: true,
      isSameSite: "Lax",
    },
    redirectTo: false,
    validate: async (request, session) => {
      try {
        const user = await User.findById(session.id);
        if (!user) {
          return { valid: false };
        }
        return { valid: true, credentials: user };
      } catch (error) {
        console.error("Error in validate function:", error);
        return { valid: false };
      }
    },
  });

  server.auth.default("session");

  server.route({
    method: "GET",
    path: "/",
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      return `<h1>Hello, Server is Running!</h1>`;
    },
  });

  server.route({
    method: "GET",
    path: "/text",
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      const { textID } = request.query;
      const existingText = await Text.findById(textID);
      if (existingText) {
        return h.response(JSON.stringify(existingText)).code(200);
      }

      return h.response({ message: "No text with that id" }).code(400);
    },
  });

  server.route({
    method: "POST",
    path: "/register",
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      const { name, email, password } = request.payload;
      console.log("New User Data: ", { name, email, password });

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return h.response({ message: "Email already in use" }).code(400);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
      });

      await newUser.save();
      return h.response({ message: "User registered successfully" }).code(201);
    },
  });

  server.route({
    method: "POST",
    path: "/login",
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      const { email, password } = request.payload;

      const user = await User.findOne({ email });
      if (!user) {
        return h.response({ message: "Invalid email or password" }).code(400);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return h.response({ message: "Invalid email or password" }).code(400);
      }

      request.cookieAuth.set({ id: user._id });

      return h.response({ message: "Login successful" }).code(200);
    },
  });

  server.route({
    method: "POST",
    path: "/logout",
    handler: (request, h) => {
      request.cookieAuth.clear();
      return h.response({ message: "Logout successful" }).code(200);
    },
  });

  //   server.route({
  //     method: "GET",
  //     path: "/profile",
  //     handler: (request, h) => {
  //       return h.response({ user: request.auth.credentials }).code(200);
  //     },
  //   });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
