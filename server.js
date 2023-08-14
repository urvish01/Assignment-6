/********************************************************************************* 

WEB322 – Assignment 03
I declare that this assignment is my own work in accordance with Seneca
Academic Policy.  No part of this assignment has been copied manually or 
electronically from any other source (including 3rd party web sites) or 
distributed to other students. I acknoledge that violation of this policy
to any degree results in a ZERO for this assignment and possible failure of
the course. 

Name:   
Student ID:   
Date:  
Cyclic Web App URL:  
GitHub Repository URL:  

********************************************************************************/


const express = require("express");
const itemData = require("./store-service");
const path = require("path");
const mongoose = require("mongoose");
const authData = require("./auth-service");
const session  = require("express-session");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");

// 3 new modules, multer, cloudinary, streamifier
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// AS4, Setup handlebars
const exphbs = require("express-handlebars");
const { Console } = require("console");

// Configure Cloudinary. This API information is
// inside of the Cloudinary Dashboard - https://console.cloudinary.com/

cloudinary.config({
  cloud_name: "",
  api_key: "",
  api_secret: "",
  secure: true,
});

//  "upload" variable without any disk storage
const upload = multer(); // no { storage: storage }
 
const app = express();
const HTTP_PORT = process.env.PORT || 8080;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

//use as middleware
app.use(session({
  cookieName: 'mySession', 
  secret: 'blargadeeblargblarg', 
  duration: 24 * 60 * 60 * 1000, 
  activeDuration: 1000 *60* 60 * 5 
}));

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

//This will add the property "activeRoute" to "app.locals" whenever the route changes, i.e. if our route is "/store/5", the app.locals.activeRoute value will be "/store".  Also, if the shop is currently viewing a category, that category will be set in "app.locals".
app.use(function (req, res, next) {
  let route = req.path.substring(1);

  app.locals.activeRoute =
    "/" +
    (isNaN(route.split("/")[1])
      ? route.replace(/\/(?!.*)/, "")
      : route.replace(/\/(.*)/, ""));

  app.locals.viewingCategory = req.query.category;

  next();
});

// Handlebars Setup
app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      navLink: function (url, options) {
        return (
          '<li class="nav-item"><a ' +
          (url == app.locals.activeRoute
            ? ' class="nav-link active" '
            : ' class="nav-link" ') +
          ' href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        );
      },
      equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
          throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      }
    },
  })
);

app.set("view engine", ".hbs");

const ensureLogin = (req, res, next)=>{
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // User is authenticated, continue to the next middleware or route handler
  next();
}

app.get("/", (req, res) => {
  res.redirect("/about");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/shop", async (req, res) => {
  // Declare an object to store properties for the view
  let viewData = {};

  try {
    // declare empty array to hold "item" objects
    let items = [];

    // if there's a "category" query, filter the returned items by category
    if (req.query.category) {
      // Obtain the published "items" by category
      console.log('categories');
      items = await itemData.getPublishedItemsByCategory(req.query.category);
    } else {
      // Obtain the published "items"
      items = await itemData.getPublishedItems();
    }

    // sort the published items by postDate
    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    // get the latest item from the front of the list (element 0)
    let item = items[0];

    // store the "items" and "item" data in the viewData object (to be passed to the view)
    viewData.items = items;
    viewData.item = item;

  } 
  catch (err) {
    viewData.message = "no results";
  }

  try {
    // Obtain the full list of "categories"
    let categories = await itemData.getCategories();

    // store the "categories" data in the viewData object (to be passed to the view)
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }

  // render the "shop" view with all of the data (viewData)
  res.render("shop", { data: viewData });
});

// Accept queryStrings
app.get("/items", ensureLogin, (req, res) => {
  let queryPromise = null;

  // check if there is a query for Category
  if (req.query.category) {
    // get the data for category id only.
    queryPromise = itemData.getItemsByCategory(req.query.category);
  } else if (req.query.minDate) {
    // get the data for date only.
    queryPromise = itemData.getItemsByMinDate(req.query.minDate);
  } else {
    // otherwise just get everything.
    queryPromise = itemData.getAllItems();
  }

  queryPromise
    .then((data) => {
      res.render("items", { items: data });
    })
    .catch((err) => {
      res.render("items", { message: "no results" });
    });
});

// A route for items/add
app.get("/items/add", ensureLogin, (req, res) => {
  res.render("addItem");
});

app.post("/items/add",ensureLogin, upload.single("featureImage"), (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      let result = await streamUpload(req);

      console.log(result);

      return result;
    }

    upload(req).then((uploaded) => {
      processItem(uploaded.url);
    });
  } else {
    processItem("");
  }

  function processItem(imageUrl) {
    req.body.featureImage = imageUrl;

    // TODO: Process the req.body and add it as a new Item before redirecting to /items
    itemData
      .addItem(req.body)
      .then((post) => {
        res.redirect("/items");
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  }
});

// Get an individual item
app.get("/item/:id",ensureLogin, (req, res) => {
  itemData
    .getItemById(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

app.get("/categories",ensureLogin, (req, res) => {
  itemData
    .getCategories()
    .then((data) => {
      res.render("categories", { categories: data });
    })
    .catch((err) => {
      res.render("categories", { message: "no results" });
    });
});


app.get('/shop/:id',ensureLogin, async (req, res) => {

  // Declare an object to store properties for the view
  let viewData = {};

  try{

      // declare empty array to hold "item" objects
      let items = [];

      // if there's a "category" query, filter the returned posts by category
      if(req.query.category){
          // Obtain the published "posts" by category
          items = await itemData.getPublishedItemsByCategory(req.query.category);
      }else{
          // Obtain the published "posts"
          items = await itemData.getPublishedItems();
      }

      // sort the published items by postDate
      items.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

      // store the "items" and "item" data in the viewData object (to be passed to the view)
      viewData.items = items;

  }catch(err){
      viewData.message = "no results";
  }

  try{
      // Obtain the item by "id"
      viewData.item = await itemData.getItemById(req.params.id);
  }catch(err){
      viewData.message = "no results"; 
  }

  try{
      // Obtain the full list of "categories"
      let categories = await itemData.getCategories();

      // store the "categories" data in the viewData object (to be passed to the view)
      viewData.categories = categories;
  }catch(err){
      viewData.categoriesMessage = "no results"
  }

  // render the "shop" view with all of the data (viewData)
  res.render("shop", {data: viewData})
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async(req, res) => {
  try {
    const { userName, email, password, confirmPassword } = req.body;
    console.log(userName);
    
    // Check if password and confirmPassword match
    if (password !== confirmPassword) {
      return res.status(400).send("Passwords do not match");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Call the addUser function to create a new user
    await authData.addUser(userName, hashedPassword, email);

    // Redirect to a protected route (e.g., user profile)
    res.render("success");
  } catch (err) {
    console.log(err)
    res.status(500).send({errorMessage: err.TypeError, userName: req.body.userName} );
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const { userName, password } = req.body;
    const userAgent = req.get("User-Agent");

    // Check if user exists in the database (you need to implement this)
    const user = await authData.findUserByUserName(userName,userAgent);

    if (!user) {
      return res.status(404).send("User not found");
    }
    // Compare the provided password with the stored password hash (you need to implement this)
    const passwordMatch = await bcrypt.compareSync(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send("Invalid credentials");
    }

    // Set the session to indicate the user is logged in
    req.session.user = {
      userName: user.userName,
      email: user.email,
    };

    res.redirect("/about");
  } catch (err) {
    console.log(err);
    res.status(500).send({ errorMessage: err, userName: req.body.userName });
  }
});

app.get("/logout",(req,res)=>{
  req.session.destroy();
  res.redirect("/about");
})

app.get("/userHistory",ensureLogin, async(req, res) => {
  try{
    const userName = req.session.user.userName;
    const data = await authData.findUser(userName);
 
    if(!data){
      res.render("userHistory", { message: "no results" });
    }
    console.log(data.loginHistory)  

    res.render("userHistory", { userHistory: data.loginHistory });
  } catch (err){
    console.error(err);
    res.render("userHistory", { message: "Error retrieving user history" });
  }
});



app.use((req, res) => {
  res.status(404).render("404");
})

itemData.initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("server listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log(err);
  });



