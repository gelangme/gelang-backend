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
    routes: {
      cors: {
        origin: ["http://localhost:3000"], // Your frontend URL
        credentials: true, // Enable credentials if you're using cookies for authentication
      },
    },
  });

  await server.register(require("@hapi/cookie"));

  server.auth.strategy("session", "cookie", {
    cookie: {
      name: "sid",
      password:
        "a_secure_random_secret_string_that_is_at_least_32_characters_long",
      isSecure: false,
      // path: "/",
      ttl: 60 * 60 * 1000,
      isHttpOnly: false,
      isSameSite: false,
    },
    redirectTo: false,
    validate: async (request, session) => {
      try {
        console.log("VALIDATING...");
        const user = await User.findById(session.id);
        console.log("USER BY SESSION ID: ", user);

        if (!user) {
          return { isValid: false };
        }
        console.log("VALIDATION COMPLETED: ", {
          valid: true,
          credentials: user,
        });
        return { isValid: true, credentials: user };
      } catch (error) {
        console.error("Error in validate function:", error);
        return { isValid: false };
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
    method: "GET",
    path: "/menu",
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      try {
        const items = await Text.find().exec();
        const menuItems = items.map((item) => ({
          description: item.description,
          title: item.title,
          textID: item._id,
        }));

        return h.response(menuItems).code(200);
      } catch (error) {
        console.error("Error fetching items:", error);
        return h.response({ message: "Internal Server Error" }).code(500);
      }
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
    method: "GET",
    path: "/me",
    options: {
      auth: "session",
      cors: {
        origin: ["http://localhost:3000"],
        credentials: true,
      },
    },
    handler: async (request, h) => {
      const userInfo = request.auth.credentials;
      if (!userInfo) {
        return h.response({ message: "User not authenticated" }).code(401);
      }
      return h
        .response({ user: { name: userInfo.name, email: userInfo.email } })
        .code(200);
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

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
