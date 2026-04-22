const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const app = require("./src/services/App");


app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});
