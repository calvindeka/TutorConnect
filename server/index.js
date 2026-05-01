require("dotenv").config();
const app = require("./app");

const PORT = parseInt(process.env.PORT || "4131", 10);
const HOST = process.env.HOST || "0.0.0.0";
const ADVERTISED = process.env.ADVERTISED_IP || "10.192.145.179";

app.listen(PORT, HOST, () => {
  console.log(`TutorConnect listening on http://${ADVERTISED}:${PORT}`);
});
