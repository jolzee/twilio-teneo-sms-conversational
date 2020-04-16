require("dotenv").config();
import "core-js/stable";
import "regenerator-runtime/runtime";
import { handleInboundSms } from "../routes/routes";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const router = express.Router();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/", router);

const PORT = process.env.PORT || 5000;

router.post("/", handleInboundSms);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
