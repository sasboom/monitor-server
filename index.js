var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var userController = require('./controllers/users');

const app = express();
const port = process.env.PORT || 3000;

app.get("/", function(req, res) {
    res.send("Welcome to my Platform API: Version 1.0.0");
});

app.use(bodyParser.json());
app.use(cors());

app.post("/register", userController.registerUser);
app.post("/login", userController.loginUser);

app.listen(port, () => {
    console.log(`LISTENING ON ${port}`);
});