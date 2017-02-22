const express = require("express");
const crypto = require("crypto");
const cookieSession = require('cookie-session');
const app = express();
const PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
// let password = "PepperPotts";
// let hashed_password = bcrypt.hashSync(password, 10);

const urlDatabase = {
  "123456": {
    "b2xVn2": "http://www.lighthouselabs.ca"
  },
  "ironMan": {
    "9sm5xK": "http://www.google.com"
  },
  // "new_url": {}
};

const users = {
  "ironMan": {
    id: "ironMan",
    email: "iron_man@marvel.com",
    password: "$2a$10$mU.fPcM7LDvwU6gPVuF15ugsLOjv04ys6P0MLDjvfvgJoJnnczQia"
  }, //unHashedPassword = PepperPotts
  "123456": {
    id: "123456",
    email: "mitchy@mapleLeafs.ca",
    password: "$2a$10$cj/GPhxE6LtH8WTwfAvM7OXAG7FyY8N.x9ZfSprSkG0LtHuL1kKfa"
  } //password = "rookieOfTheYear"
}

app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieSession({
  name: "session",
  keys: ["SecretKey", "TrumpTaxReturns"]
  })
);

app.set("view engine", "ejs");

function generateRandomString(b) {
  return crypto.randomBytes(b).toString('hex');
};

function verifySUrl (sUrl) { //takes shortURL, returns longURL
  for (var user in urlDatabase) {
    if (urlDatabase[user][sUrl]) {
      let sUrlData = {};
      sUrlData.owner = user;
      sUrlData.longURL = urlDatabase[user][sUrl];
      return sUrlData;
    };
  };
};
// all app.get routes ----------------------------------------------------------
app.get("/", (req, res) => {
  if (req.session.userId) {
  return res.redirect("/urls");
  };
  res.redirect("/login");
});
// -----------------------------------------------------------------------------
app.get("/urls", (req, res) => {
  if (req.session.userId) {
    let user = req.session.userId;
    let templateVars = {
      allUrls: {},
      email: users[user].email
    };
    for (let userObj in urlDatabase) {
      if (urlDatabase[user]) {
        templateVars.allUrls = urlDatabase[userObj];
      };
    };
    return res.render("urls_index", templateVars);
  };
  res.status(401).send("Please login to create a new link &rarr; <a href='/login'>login</a>");
});
// -----------------------------------------------------------------------------
app.get("/register", (req, res) => {
  console.log("get: register");
  if (req.session.userId) {
  return res.redirect("/");
  }
  res.render("urls_register");
})
// -----------------------------------------------------------------------------
app.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  res.render("urls_login");
})
// -----------------------------------------------------------------------------
app.get("/:shortURL", (req, res) => {
  let tinyURL = req.params.shortURL;
  for (var user in urlDatabase) {
    if (urlDatabase[user][tinyURL]) {
      return res.redirect(urlDatabase[user][tinyURL]);
    };
  };
  res.status(404).send("that tiny URL does not exist");
});
// -----------------------------------------------------------------------------
app.get("/urls/new", (req, res) => {
  if (req.session.userId) {
    let user = req.session.userId;
    let templateVars = {
      urls: urlDatabase,
      userId: user,
      userData: users[user],
      email: users[user].email
    }
    return res.render("urls_new", templateVars);
  }
  res.status(401).send("Please login to create a new link &rarr; <a href='/login'>login</a>");
});
// -----------------------------------------------------------------------------
app.get("/urls/u/:id", (req, res) => {
  if (req.session.userId) {
    let user = req.session.userId;
    let shortURL = req.params.id;
    let sUrlData = verifySUrl(shortURL);
    let longURL = sUrlData.longURL;
    let owner = sUrlData.owner;
    if (!longURL) {
      return res.sendStatus(404);
    }
    if (user !== owner) {
      return res.sendStatus(403);
    }
    templateVars = {
      shortURL: shortURL,
      urls: urlDatabase,
      url: longURL,
      userId: user,
      email: users[user].email
    };
    return res.render("urls_show", templateVars);
  };
  res.status(401).send("Please login to create a new link &rarr; <a href='/login'>login</a>");
}); //ERROR: templateVars is not defined
// -----------------------------------------------------------------------------
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});
// all app.post routes ---------------------------------------------------------
// loginAuthentication
app.post("/login", (req, res) => {
  for (user in users) {
    let email = req.body.email.toLowerCase();
    let savedEmail = users[user].email;
    let passString = req.body.password;
    let savedPass = users[user].password;
    if (email === savedEmail) {
      if (bcrypt.compareSync(passString, savedPass)) {
        let userId = users[user].id;
        req.session.userId = userId;
        return res.redirect("/");
      }
    }
  }
  res.status(401).send("password and email do not match, please try again");
});
// -----------------------------------------------------------------------------
app.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.clearCookie("session.sig");
  res.redirect('/login');
});
// -----------------------------------------------------------------------------
app.post("/register", (req, res) => {
  console.log("in post: register");
  let email = req.body.email;
  let password = req.body.password;
  let hashed_password = bcrypt.hashSync(password, 10);
  if (!email || !password) {
    res.status(400).send("Oops! Check your email and password");
  };
  for (let user in users) {
    let savedEmail = users[user].email;
    if (savedEmail === email) {
      res.status(400).send("Oops! That email is taken already!");
    }
  };
  let userId = generateRandomString(3);
  users[userId] = {
    id: userId,
    email: email.toLowerCase(),
    password: hashed_password
  };
  urlDatabase[userId] = {};
  req.session.userId = userId;
  console.log("leaving post: register");
  res.redirect("/");
});
// -----------------------------------------------------------------------------
app.post("/new-url", (req, res) => {
  if (req.session.userId) {
    let user = req.session.userId;
    let urlId = generateRandomString(4);
    let longURL = req.body.longURL;
    let re = /^www/i;
    let goodURL = longURL.replace(re, "http://www");
    urlDatabase[user][urlId] = goodURL;
    return res.redirect(`/urls/u/${urlId}`);
  }
  res.status(401).send("Please login to create a new link &rarr; <a href='/login'>login</a>");
});
// -----------------------------------------------------------------------------
app.post("/urls/:id/delete", (req, res) => {
  if (req.session.userId) {
    let user = req.session.userId;
    let shortURL = req.params.id;
    let sUrlData = verifySUrl(shortURL);
    let longURL = sUrlData.longURL;
    let owner = sUrlData.owner;
    if (!longURL) {
      return res.status(404).send("Oops that tiny URL does not exist");
    }
    if (user !== owner) {
      return res.status(403).send("Opps, that doesn't belong to you");
    }
    delete urlDatabase[req.session.userId][req.params.id];
    return res.redirect("/urls");
  }
  res.status(401).send("Please login to create a new link &rarr; <a href='/login'>login</a>");
});
// -----------------------------------------------------------------------------
app.post("/urls/:shortURL/update", (req, res) => {
  if (req.session.userId) {
    let user = req.session.userId;
    let shortURL = req.params.shortURL;
    let sUrlData = verifySUrl(shortURL);
    let longURL = sUrlData.longURL;
    let owner = sUrlData.owner;
    if (!longURL) {
      return res.sendStatus(404);
    }
    if (user !== owner) {
      return res.sendStatus(403);
    }
    urlDatabase[user][shortURL] = req.body.longURL;
    return res.redirect("/urls");
    // return res.sendStatus(200);
  };
  res.status(401).send("Please login to create a new link &rarr; <a href='/login'>login</a>");
});
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
