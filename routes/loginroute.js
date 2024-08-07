const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Employee = require("../models/employeeType");
const generateToken = require("../utils/jwt");
require("dotenv").config();
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; 

  if (!token) {
    return res.status(401).send("Unauthorized request");
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; 
    next(); 
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
}

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}

router.use(
  require("express-session")({
    secret: "cats",
    resave: false,
    saveUninitialized: true,
  })
);

router.use(passport.initialize());
router.use(passport.session());

router.get("/", (req, res) => {
  res.send(
    '<center><a href="/auth/google">Authenticate with Google</a></center>'
  );
});

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google/failure",
  }),
  async (req, res) => {
    try {
      // console.log(req.user);
      let user = await User.findOne({ email: req.user.email });

      if (!user) {
        user = new User({
          name: req.user.displayName,
          email: req.user.emails[0].value,
          googleId: req.user.id,
        });
        await user.save();
      }
      res.redirect("/protected");
    } catch (error) {
      console.error("Error adding user:", error);
      res.redirect("/auth/google/failure");
    }
  }
);

router.get("/protected", isLoggedIn, async (req, res) => {
  const token = generateToken(req.user);
  const email = req.user.email;
  const employees = await Employee.find({ email: email });
  res.json({ token, employees });
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.send("Goodbye!");
});

router.get("/data", verifyToken, async (req, res) => {
  const email = req.user.email;
  const employees = await Employee.find({ email: email });
  res.json(employees);
});

router.get("/auth/google/failure", (req, res) => {
  res.send("Failed to authenticate..");
});

module.exports = router;
