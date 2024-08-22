import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import { format } from "timeago.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const getUserURL = (callback) => {
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    callback(data.url);
  });
};

const defaultTagline =
  "A collection of musings, adventures, and creative scribbles.";

function jsonReader(filePath, cb) {
  fs.readFile(filePath, (err, fileData) => {
    if (err) {
      return cb && cb(err);
    }
    try {
      const object = JSON.parse(fileData);
      return cb && cb(null, object);
    } catch (err) {
      return cb && cb(err);
    }
  });
}

app.get("/", (req, res) => {
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    res.render("index.ejs", {
      auth: data.auth,
      url: data.url,
    });
  });
});

app.get("/login", (req, res) => {
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
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    data.auth = false;
    fs.writeFile("credentials.json", JSON.stringify(data), (err) => {
      if (err) console.log("Error writing file:", err);
    });
    res.redirect("/");
  });
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

    jsonReader("credentials.json", (err, data) => {
      if (err) {
        console.log("Error reading file:", err);
        return;
      }
      res.render("pages/demoPage.ejs", {
        url: data.url,
        auth: data.auth,
        posts: posts,
        format,
      });
    });
  });
});

app.get("/settings", (req, res) => {
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    res.render("pages/settings.ejs", {
      auth: data.auth,
      fName: data.fName,
      lName: data.lName,
      username: data.username,
      password: data.password,
      displayName: data.displayName,
      tagline: data.tagline,
      url: data.url,
    });
  });
});

app.get("/createPost", (req, res) => {
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    res.render("pages/createPost.ejs", {
      auth: data.auth,
      author: `${data.fName} ${data.lName}`,
      url: data.url,
    });
  });
});

app.get("/editPost", (req, res) => {
  const postContent = JSON.parse(
    fs.readFileSync(`${__dirname}/posts/${req.query.fileName}`, "utf8")
  );
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    res.render("pages/editPost.ejs", {
      auth: data.auth,
      postID: postContent.postID,
      title: postContent.title,
      content: postContent.content,
      author: postContent.author,
      publishStatus: postContent.publish,
      url: data.url,
    });
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
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    res.render("pages/confirmDelete.ejs", {
      auth: data.auth,
      title: postContent.title,
      content: postContent.content,
      author: postContent.author,
      date: new Date(postContent.dateCreated).toDateString(),
      fileName: req.query.fileName,
      url: data.url,
    });
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
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    if (data.username === req.body.username) {
      if (req.body.newPassword === req.body.verifyPassword) {
        data.password = req.body.newPassword;
        fs.writeFile("credentials.json", JSON.stringify(data), (err) => {
          if (err) console.log("Error writing file:", err);
        });
      } else {
        res.render("pages/forgotPass.ejs", {
          auth: false,
          error: "d-block",
          user: req.body.username === data.username,
          username: req.body.username,
          pass: req.body.newPassword === req.body.verifyPassword,
        });
      }
    } else {
      res.render("pages/forgotPass.ejs", {
        auth: false,
        error: "d-block",
        user: req.body.username === data.username,
        username: req.body.username,
        pass: req.body.newPassword === req.body.verifyPassword,
      });
    }
    res.render("pages/login.ejs", {
      auth: false,
      newPass: true,
    });
  });
});

app.post("/userUpdate", (req, res) => {
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    const updateFName = req.body.fName != data.fName;
    const updateLName = req.body.lName != data.lName;
    const updateUsername = req.body.username != data.username;
    const updatePassword = req.body.password != data.password;
    const updateDisplayName = req.body.displayName != data.displayName;
    const updateTagline = req.body.tagline != data.tagline;
    const updateURL = req.body.url != data.url;
    const oldFName = data.fName;
    const oldLName = data.lName;
    const oldUsername = data.username;
    const oldPassword = data.password;
    const oldDisplayName = data.displayName;
    const oldTagline = data.tagline;
    const oldURL = data.url;
    const postsDir = __dirname + "/posts";
    const pageDir = __dirname + "/views/pages";
    data.fName = req.body.fName;
    data.lName = req.body.lName;
    data.username = req.body.username;
    data.password = req.body.password;
    if (req.body.displayName.length === 0) {
      data.displayName = `${req.body.fName} ${req.body.lName}`;
    } else {
      data.displayName = req.body.displayName;
    }
    if (req.body.tagline.length === 0) {
      data.tagline = defaultTagline;
    } else {
      data.tagline = req.body.tagline;
    }
    data.url = req.body.url;
    fs.writeFile("credentials.json", JSON.stringify(data), (err) => {
      if (err) console.log("Error writing file:", err);
    });
    fs.readdir(postsDir, (err, files) => {
      if (err) {
        return res.status(500).send("Unable to read posts directory");
      }
      files.forEach((file) => {
        if (file.includes(".json")) {
          const postContent = JSON.parse(
            fs.readFileSync(`${postsDir}/${file}`, "utf8")
          );
          postContent.author = `${req.body.fName} ${req.body.lName}`;
          fs.writeFileSync(`${postsDir}/${file}`, JSON.stringify(postContent));
        }
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
      auth: data.auth,
      fName:
        data.fName.trim().charAt(0).toUpperCase() + data.fName.trim().slice(1),
      oldFName: oldFName,
      updateFName: updateFName,
      lName:
        data.lName.trim().charAt(0).toUpperCase() + data.lName.trim().slice(1),
      oldLName: oldLName,
      newLName: req.body.lName,
      updateLName: updateLName,
      username: data.username,
      oldUsername: oldUsername,
      updateUsername: updateUsername,
      password: data.password,
      oldPassword: oldPassword,
      newPassword: req.body.password,
      updatePassword: updatePassword,
      displayName: data.displayName,
      oldDisplayName: oldDisplayName,
      newDisplayName: req.body.displayName,
      updateDisplayName: updateDisplayName,
      tagline: data.tagline,
      oldTagline: oldTagline,
      newTagline: req.body.tagline,
      updateTagline: updateTagline,
      url: data.url,
      oldURL: oldURL,
      newURL: req.body.url,
      updateURL: updateURL,
    });
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
    jsonReader("credentials.json", (err, data) => {
      if (err) {
        console.log("Error reading file:", err);
        return;
      }
      res.render("dashboard.ejs", {
        fName: data.fName,
        lName: data.lName,
        url: data.url,
        auth: true,
        posts: posts.reverse(),
        format,
      });
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
    if (err) console.log("Error writing file:", err);
  });
  res.redirect("/login");
});

app.post("/check", (req, res) => {
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    if (
      req.body.username === data.username &&
      req.body.password === data.password
    ) {
      data.auth = true;
      fs.writeFile("credentials.json", JSON.stringify(data), (err) => {
        if (err) console.log("Error writing file:", err);
      });
      res.redirect("/dashboard");
    } else {
      data.auth = false;
      fs.writeFile("credentials.json", JSON.stringify(data), (err) => {
        if (err) console.log("Error writing file:", err);
      });
      res.render("pages/login.ejs", {
        error: "d-block",
        user: req.body.username === data.username,
        pass: req.body.password === data.password,
        auth: false,
      });
    }
  });
});

app.post("/newScribble", (req, res) => {
  jsonReader("credentials.json", (err, data) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }
    const date = new Date();
    const postName = data.username + date.getTime() + ".json";
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
      author: `${data.fName} ${data.lName}`,
      dateCreated: date,
      publish: publishStatus(),
    };
    fs.writeFile(`posts/${postName}`, JSON.stringify(post), (err) => {
      if (err) console.log("Error writing file:", err);
    });
    res.redirect("/dashboard");
  });
});

getUserURL((url) => {
  app.get(`/${url}`, (req, res) => {
    const postsDir = __dirname + "/posts";
    fs.readdir(postsDir, (err, files) => {
      if (err) {
        return res.status(500).send("Unable to read posts directory");
      }

      const posts = [];
      const publishedPosts = [];

      files.forEach((file) => {
        if (file.includes(".json")) {
          const postContent = JSON.parse(
            fs.readFileSync(`${postsDir}/${file}`, "utf8")
          );
          posts.push(postContent);
        }
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

      jsonReader("credentials.json", (err, data) => {
        if (err) {
          console.log("Error reading file:", err);
          return;
        }
        fs.writeFile(
          `${__dirname}/views/pages/${data.url}.ejs`,
          scribblePage,
          (err) => {
            if (err) throw err;

            res.render(`pages/${data.url}.ejs`, {
              name: `${data.fName} ${data.lName}`,
              url: data.url,
              auth: data.auth,
              displayName: data.displayName,
              tagline: data.tagline,
              posts: posts,
              publishedPosts: publishedPosts,
              format,
              headTitle: `${data.fName} ${data.lName}`,
            });
          }
        );
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
