import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { format } from "timeago.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
const defaultTagline =
  "A collection of musings, adventures, and creative scribbles.";

app.get("/", (req, res) => {
  res.render("index.ejs", {
    auth: credentials.auth,
    url: credentials.url,
  });
});

app.get("/login", (req, res) => {
  fs.readFile("credentials.json", (err, data) => {
    console.log(data);
  });

  res.render("pages/login.ejs", {
    auth: false,
  });
});

app.get("/forgotPassword", (req, res) => {
  res.render("pages/forgotPass.ejs", {
    auth: false,
  });
});

app.get("/getStarted", (req, res) => {
  res.render("pages/createUser.ejs", {
    auth: false,
  });
});

app.get("/logout", (req, res) => {
  credentials.auth = false;
  fs.writeFileSync("credentials.json", JSON.stringify(credentials));
  res.redirect("/");
});

app.get("/demoPage", (req, res) => {
  const postsDir = __dirname + "/public/demo";
  fs.readdir(postsDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to read posts directory");
    }

    const posts = [];
    files.forEach((file) => {
      const postContent = JSON.parse(
        fs.readFileSync(`${postsDir}/${file}`, "utf8")
      );
      posts.push(postContent);
    });

    posts.sort((a, b) => {
      return (
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
      );
    });

    res.render("pages/demoPage.ejs", {
      url: credentials.url,
      auth: credentials.auth,
      posts: posts,
      format,
    });
  });
});

app.get("/settings", (req, res) => {
  res.render("pages/settings.ejs", {
    auth: credentials.auth,
    fName: credentials.fName,
    lName: credentials.lName,
    username: credentials.username,
    password: credentials.password,
    displayName: credentials.displayName,
    tagline: credentials.tagline,
    url: credentials.url,
  });
});

app.get("/createPost", (req, res) => {
  res.render("pages/createPost.ejs", {
    auth: credentials.auth,
    author: `${credentials.fName} ${credentials.lName}`,
    url: credentials.url,
  });
});

app.get("/editPost", (req, res) => {
  const postContent = JSON.parse(
    fs.readFileSync(`${__dirname}/posts/${req.query.fileName}`, "utf8")
  );
  res.render("pages/editPost.ejs", {
    auth: credentials.auth,
    postID: postContent.postID,
    title: postContent.title,
    content: postContent.content,
    author: postContent.author,
    publishStatus: postContent.publish,
    url: credentials.url,
  });
});

app.post("/updateScribble", (req, res) => {
  const postContent = JSON.parse(
    fs.readFileSync(`${__dirname}/posts/${req.query.fileName}`, "utf8")
  );
  const publishStatus = () => {
    if (req.body.publishStatus === "publish") {
      return true;
    } else {
      return false;
    }
  };
  postContent.title = req.body.title;
  postContent.content = req.body.content;
  postContent.publish = publishStatus();
  fs.writeFileSync(
    `${__dirname}/posts/${req.query.fileName}`,
    JSON.stringify(postContent)
  );
  res.redirect("/dashboard");
});

app.post("/saveAsDraft", (req, res) => {
  const postContent = JSON.parse(
    fs.readFileSync(`${__dirname}/posts/${req.query.fileName}`, "utf8")
  );
  postContent.title = req.body.title;
  postContent.content = req.body.content;
  postContent.publish = false;
  fs.writeFileSync(
    `${__dirname}/posts/${req.query.fileName}`,
    JSON.stringify(postContent)
  );
  res.redirect("/dashboard");
});

app.get("/confirmDelete", (req, res) => {
  const postContent = JSON.parse(
    fs.readFileSync(`${__dirname}/posts/${req.query.fileName}`, "utf8")
  );
  res.render("pages/confirmDelete.ejs", {
    auth: credentials.auth,
    title: postContent.title,
    content: postContent.content,
    author: postContent.author,
    date: new Date(postContent.dateCreated).toDateString(),
    fileName: req.query.fileName,
    url: credentials.url,
  });
});

app.post("/deleteScribble", (req, res) => {
  fs.unlink(`${__dirname}/posts/${req.body.fileName}`, (err) => {
    if (err) {
      return res.status(500).send("Error deleting the file");
    }

    console.log(`${__dirname}/posts/${req.body.fileName} was deleted!`);
    res.redirect("/dashboard");
  });
});

app.post("/newPassword", (req, res) => {
  if (credentials.username === req.body.username) {
    if (req.body.newPassword === req.body.verifyPassword) {
      credentials.password = req.body.newPassword;
      fs.writeFileSync("credentials.json", JSON.stringify(credentials));
    } else {
      res.render("pages/forgotPass.ejs", {
        auth: false,
        error: "d-block",
        user: req.body.username === credentials.username,
        username: req.body.username,
        pass: req.body.newPassword === req.body.verifyPassword,
      });
    }
  } else {
    res.render("pages/forgotPass.ejs", {
      auth: false,
      error: "d-block",
      user: req.body.username === credentials.username,
      username: req.body.username,
      pass: req.body.newPassword === req.body.verifyPassword,
    });
  }

  res.render("pages/login.ejs", {
    auth: false,
    newPass: true,
  });
});

app.post("/userUpdate", (req, res) => {
  const updateFName = req.body.fName != credentials.fName;
  const updateLName = req.body.lName != credentials.lName;
  const updateUsername = req.body.username != credentials.username;
  const updatePassword = req.body.password != credentials.password;
  const updateDisplayName = req.body.displayName != credentials.displayName;
  const updateTagline = req.body.tagline != credentials.tagline;
  const updateURL = req.body.url != credentials.url;
  const oldFName = credentials.fName;
  const oldLName = credentials.lName;
  const oldUsername = credentials.username;
  const oldPassword = credentials.password;
  const oldDisplayName = credentials.displayName;
  const oldTagline = credentials.tagline;
  const oldURL = credentials.url;
  const postsDir = __dirname + "/posts";
  const pageDir = __dirname + "/views/pages";
  credentials.fName = req.body.fName;
  credentials.lName = req.body.lName;
  credentials.username = req.body.username;
  credentials.password = req.body.password;
  if (req.body.displayName.length === 0) {
    credentials.displayName = `${req.body.fName} ${req.body.lName}`;
  } else {
    credentials.displayName = req.body.displayName;
  }
  if (req.body.tagline.length === 0) {
    credentials.tagline = defaultTagline;
  } else {
    credentials.tagline = req.body.tagline;
  }
  credentials.url = req.body.url;
  fs.writeFileSync("credentials.json", JSON.stringify(credentials));
  fs.readdir(postsDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to read posts directory");
    }
    files.forEach((file) => {
      const postContent = JSON.parse(
        fs.readFileSync(`${postsDir}/${file}`, "utf8")
      );
      postContent.author = `${req.body.fName} ${req.body.lName}`;
      fs.writeFileSync(`${postsDir}/${file}`, JSON.stringify(postContent));
    });
  });
  if (updateURL)
    fs.rename(
      `${pageDir}/${oldURL}.ejs`,
      `${pageDir}/${req.body.url}.ejs`,
      (err) => {
        if (err) {
          console.log(err, "ERROR");
        }
      }
    );
  res.render("pages/settings.ejs", {
    auth: credentials.auth,
    fName:
      credentials.fName.trim().charAt(0).toUpperCase() +
      credentials.fName.trim().slice(1),
    oldFName: oldFName,
    updateFName: updateFName,
    lName:
      credentials.lName.trim().charAt(0).toUpperCase() +
      credentials.lName.trim().slice(1),
    oldLName: oldLName,
    newLName: req.body.lName,
    updateLName: updateLName,
    username: credentials.username,
    oldUsername: oldUsername,
    updateUsername: updateUsername,
    password: credentials.password,
    oldPassword: oldPassword,
    newPassword: req.body.password,
    updatePassword: updatePassword,
    displayName: credentials.displayName,
    oldDisplayName: oldDisplayName,
    newDisplayName: req.body.displayName,
    updateDisplayName: updateDisplayName,
    tagline: credentials.tagline,
    oldTagline: oldTagline,
    newTagline: req.body.tagline,
    updateTagline: updateTagline,
    url: credentials.url,
    oldURL: oldURL,
    newURL: req.body.url,
    updateURL: updateURL,
  });
});

app.get("/dashboard", (req, res) => {
  const postsDir = __dirname + "/posts";
  fs.readdir(postsDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to read posts directory");
    }

    const posts = [];

    files.forEach((file) => {
      if (file.includes(".json")) {
        const postContent = JSON.parse(
          fs.readFileSync(`${postsDir}/${file}`, "utf8")
        );
        posts.push(postContent);
      }
    });

    res.render("dashboard.ejs", {
      fName: credentials.fName,
      lName: credentials.lName,
      url: credentials.url,
      auth: true,
      posts: posts.reverse(),
      format,
    });
  });
});

app.get("/publishPost", (req, res) => {
  const postContent = JSON.parse(
    fs.readFileSync(`${__dirname}/posts/${req.query.fileName}`, "utf8")
  );

  if (postContent.publish) {
    postContent.publish = false;
  } else {
    postContent.publish = true;
  }

  fs.writeFileSync(
    `${__dirname}/posts/${req.query.fileName}`,
    JSON.stringify(postContent)
  );

  res.redirect("/dashboard");
});

// Create User
app.post("/createUser", (req, res) => {
  const credentials = {
    username: req.body.username,
    password: req.body.password,
    fName: req.body.fName,
    lName: req.body.lName,
    url: req.body.fName + req.body.lName,
    displayName: `${req.body.fName} ${req.body.lName}`,
    tagline: defaultTagline,
    auth: false,
  };

  fs.writeFile("credentials.json", JSON.stringify(credentials), (err) => {
    if (err) throw err;
  });
  console.log("User was created: ", credentials);
  res.redirect("/login");
});

app.post("/check", (req, res) => {
  fs.readFile("credentials.json", (err, data) => {
    if (err) throw err;
    if (
      req.body.username === JSON.parse(data).username &&
      req.body.password === JSON.parse(data).password
    ) {
      credentials.auth = true;
      fs.writeFileSync("credentials.json", JSON.stringify(credentials));
      res.redirect("/dashboard");
    } else {
      credentials.auth = false;
      fs.writeFileSync("credentials.json", JSON.stringify(credentials));
      res.render("pages/login.ejs", {
        error: "d-block",
        user: req.body.username === JSON.parse(data).username,
        pass: req.body.password === JSON.parse(data).password,
        auth: false,
      });
    }
  });
});

app.post("/newScribble", (req, res) => {
  const date = new Date();
  const postName = credentials.username + date.getTime() + ".json";
  const publishStatus = () => {
    if (req.body.publishStatus === "publish") {
      return true;
    } else {
      return false;
    }
  };
  const post = {
    postID: postName,
    title: req.body.title,
    content: req.body.content,
    author: `${credentials.fName} ${credentials.lName}`,
    dateCreated: date,
    publish: publishStatus(),
  };
  fs.writeFile(`posts/${postName}`, JSON.stringify(post), (err) => {
    if (err) throw err;
  });
  res.redirect("/dashboard");
});

app.get(`/${credentials.url}`, (req, res) => {
  const postsDir = __dirname + "/posts";
  fs.readdir(postsDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to read posts directory");
    }

    const posts = [];
    const publishedPosts = [];

    files.forEach((file) => {
      const postContent = JSON.parse(
        fs.readFileSync(`${__dirname}/posts/${file}`, "utf8")
      );
      posts.push(postContent);
    });

    posts.sort((a, b) => {
      return (
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
      );
    });

    posts.forEach((post) => {
      if (post.publish) {
        publishedPosts.push(post.postID);
      }
    });

    const scribblePage = `<!DOCTYPE html>
<html lang="en">
<%- include('../partials/head.ejs', {page: headTitle }) %>

  <body data-bs-theme="custom">
    <%- include('../partials/nav.ejs', {auth: auth}) %>
      <main class="container d-flex flex-column m-header">
        <div class="py-5">
          <h1 class="lh-1">Welcome to <%= displayName %>'s Scribble Spot!
          </h1>
          <span class="ms-1 fs-5"><i><%= tagline %></i></span>
        </div>
        <% if (publishedPosts.length === 0) { %>
        <p class="fs-4">No scribbles just yet!</p>
        <p class="fs-4">Check back soon for <%= displayName %>'s first creation!</p>
        <% } else { %>
        <section class="d-flex flex-column gap-6 mt-5">
                    <% if (locals.posts) { %>
                        <% posts.forEach(post=> { %>
                            <% if (post.publish) { %>
                                <article class="card-body d-flex flex-column gap-2">
                                    <div class="border-bottom pb-2">
                                        <h2 class="card-title mb-2">
                                            <%= post.title %>
                                        </h2>
                                        <span class="card-subtitle text-secondary ms-1">by <%= post.author %> on <%= new
                                                    Date(post.dateCreated).toLocaleString('en-us',{month:'long',
                                                    day:'numeric', year:'numeric'}) %></span>
                                    </div>
                                    <p class="card-text lh-lg ws-preLine">
                                        <%= post.content %>
                                    </p>
                                </article>
                                </div>
                                <% } %>
                                    <% }) %>
                                        <% } %>
                </section>
                    <% } %>
        
      </main>
  </body>

</html>`;

    fs.writeFile(
      `${__dirname}/views/pages/${credentials.url}.ejs`,
      scribblePage,
      (err) => {
        if (err) throw err;

        res.render(`pages/${credentials.url}.ejs`, {
          name: `${credentials.fName} ${credentials.lName}`,
          url: credentials.url,
          auth: credentials.auth,
          displayName: credentials.displayName,
          tagline: credentials.tagline,
          posts: posts,
          publishedPosts: publishedPosts,
          format,
          headTitle: `${credentials.fName} ${credentials.lName}`,
        });
      }
    );
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
